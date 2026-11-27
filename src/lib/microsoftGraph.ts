// Acceso de solo lectura al correo con Microsoft Graph, desde el navegador.
// Inicio de sesión OAuth 2.0 con PKCE en ventana emergente (app registrada en Azure como
// "Aplicación de página única" con redirección <origen>/auth/microsoft). No usa secretos:
// el token vive solo en la sesión del navegador y lo usa quien inició sesión.

const CLIENT_ID = process.env.NEXT_PUBLIC_MS_CLIENT_ID || '';
const TENANT = process.env.NEXT_PUBLIC_MS_TENANT_ID || 'organizations';
const AUTORIDAD = `https://login.microsoftonline.com/${TENANT}/oauth2/v2.0`;
const SCOPES = 'openid profile offline_access User.Read Mail.Read';
const CLAVE_TOKEN = 'ms_graph_token';

export const microsoftConfigurado = () => CLIENT_ID !== '';

interface TokenGuardado {
    accessToken: string;
    expira: number;
    cuenta: string;
}

const base64url = (bytes: ArrayBuffer | Uint8Array) =>
    btoa(String.fromCharCode(...new Uint8Array(bytes as ArrayBuffer))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

function aleatorio(n = 32) {
    const b = new Uint8Array(n);
    crypto.getRandomValues(b);
    return base64url(b);
}

const redireccion = () => `${window.location.origin}/auth/microsoft`;

export function tokenVigente(): TokenGuardado | null {
    try {
        const t = JSON.parse(sessionStorage.getItem(CLAVE_TOKEN) || 'null') as TokenGuardado | null;
        return t && t.expira > Date.now() + 60000 ? t : null;
    } catch {
        return null;
    }
}

export function cerrarSesionMicrosoft() {
    sessionStorage.removeItem(CLAVE_TOKEN);
}

/** Abre la ventana de Microsoft y devuelve el token. `cuentaSugerida` llena el correo en la pantalla de inicio. */
export async function iniciarSesionMicrosoft(cuentaSugerida?: string): Promise<TokenGuardado> {
    if (!CLIENT_ID) throw new Error('Falta configurar NEXT_PUBLIC_MS_CLIENT_ID (registro de la app en Azure).');

    const verificador = aleatorio(48);
    const reto = base64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verificador)));
    const estado = aleatorio(16);
    const params = new URLSearchParams({
        client_id: CLIENT_ID,
        response_type: 'code',
        redirect_uri: redireccion(),
        response_mode: 'query',
        scope: SCOPES,
        state: estado,
        code_challenge: reto,
        code_challenge_method: 'S256',
        prompt: 'select_account',
    });
    if (cuentaSugerida) params.set('login_hint', cuentaSugerida);

    const ventana = window.open(`${AUTORIDAD}/authorize?${params}`, 'login_microsoft', 'width=520,height=680');
    if (!ventana) throw new Error('El navegador bloqueó la ventana emergente. Permite ventanas emergentes para este sitio.');

    // Mientras la ventana está en Microsoft no se puede leer su URL; al volver a /auth/microsoft sí.
    const codigo = await new Promise<string>((resolve, reject) => {
        const limite = Date.now() + 5 * 60000;
        const intervalo = window.setInterval(() => {
            if (ventana.closed) {
                window.clearInterval(intervalo);
                reject(new Error('Se cerró la ventana de inicio de sesión.'));
                return;
            }
            if (Date.now() > limite) {
                window.clearInterval(intervalo);
                ventana.close();
                reject(new Error('El inicio de sesión tardó demasiado.'));
                return;
            }
            let url: URL;
            try {
                url = new URL(ventana.location.href);
            } catch {
                return; // aún en el dominio de Microsoft
            }
            if (url.origin !== window.location.origin || url.pathname !== '/auth/microsoft') return;
            window.clearInterval(intervalo);
            ventana.close();
            const error = url.searchParams.get('error_description') || url.searchParams.get('error');
            if (error) return reject(new Error(error));
            if (url.searchParams.get('state') !== estado) return reject(new Error('Respuesta de inicio de sesión no válida.'));
            const code = url.searchParams.get('code');
            if (!code) return reject(new Error('Microsoft no devolvió el código de acceso.'));
            resolve(code);
        }, 400);
    });

    const res = await fetch(`${AUTORIDAD}/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: CLIENT_ID,
            grant_type: 'authorization_code',
            code: codigo,
            redirect_uri: redireccion(),
            code_verifier: verificador,
            scope: SCOPES,
        }),
    });
    const j = await res.json();
    if (!res.ok) throw new Error(j.error_description || j.error || 'No se pudo obtener el token de Microsoft.');

    const yo = await fetch('https://graph.microsoft.com/v1.0/me?$select=mail,userPrincipalName', {
        headers: { Authorization: `Bearer ${j.access_token}` },
    }).then((r) => r.json());

    const token: TokenGuardado = {
        accessToken: j.access_token,
        expira: Date.now() + Number(j.expires_in || 3600) * 1000,
        cuenta: String(yo.mail || yo.userPrincipalName || '').toLowerCase(),
    };
    sessionStorage.setItem(CLAVE_TOKEN, JSON.stringify(token));
    return token;
}

export interface CorreoEnviado {
    id: string;
    asunto: string;
    enviado: string;
    cuerpo: string;
}

/** Correos de la carpeta Enviados desde `desde` (ISO), con el cuerpo en texto plano. */
export async function leerEnviados(token: string, desde: string, alAvanzar?: (n: number) => void): Promise<CorreoEnviado[]> {
    const filtro = encodeURIComponent(`sentDateTime ge ${desde}`);
    let url: string | null =
        `https://graph.microsoft.com/v1.0/me/mailFolders/sentitems/messages?$filter=${filtro}&$select=id,subject,sentDateTime,body&$orderby=sentDateTime desc&$top=50`;
    const correos: CorreoEnviado[] = [];
    while (url) {
        const res: Response = await fetch(url, {
            headers: { Authorization: `Bearer ${token}`, Prefer: 'outlook.body-content-type="text"' },
        });
        const j = await res.json();
        if (!res.ok) throw new Error(j?.error?.message || `Microsoft Graph respondió ${res.status}`);
        for (const m of j.value || []) {
            correos.push({ id: m.id, asunto: m.subject || '', enviado: m.sentDateTime, cuerpo: m.body?.content || '' });
        }
        alAvanzar?.(correos.length);
        url = j['@odata.nextLink'] || null;
    }
    return correos;
}
