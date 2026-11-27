// Lectura de las respuestas de cotizaciones@ ("Ok recibido, Oferta de venta n° 7788").
// Funciones puras: reciben el texto del correo y devuelven qué ofertas confirma y cuándo escribió el asesor.

export interface RespuestaOferta {
    numeros: number[];
    fechaCorreoAsesor: string | null; // ISO
    asesor: string | null;
}

export interface FilaOfertaCorreo {
    message_id: string;
    numero_oferta: number;
    fecha_respuesta: string;
    fecha_correo_asesor: string | null;
    asesor: string | null;
    asunto: string | null;
}

const MESES: Record<string, number> = {
    enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7, agosto: 8,
    septiembre: 9, setiembre: 9, octubre: 10, noviembre: 11, diciembre: 12,
    january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7, august: 8,
    september: 9, october: 10, november: 11, december: 12,
};

// Encabezado del correo citado (Outlook en español o inglés)
const ENCABEZADO_DE = /^\s*\*?(?:De|From)\s*:\s*\*?\s*(.+)$/im;
const ENCABEZADO_FECHA = /^\s*\*?(?:Enviado(?:\s+el)?|Sent|Fecha|Date)\s*:\s*\*?\s*(.+)$/im;

// "Oferta de venta n° 7788", "oferta de venta No. 7788 - 7789", "OF 7788", "OF. N° 7788 y 7790"
const LISTA = String.raw`(\d{3,7}(?:\s*(?:[-,/&]|\by\b)\s*\d{3,7})*)`;
const PREFIJO_NUM = String.raw`\.?\s*(?:n(?:[°ºo]|ro|[uú]m(?:ero)?)?\.?\s*)?[:#]?\s*`;
const PATRONES = [
    new RegExp(String.raw`oferta\s+de\s+venta${PREFIJO_NUM}${LISTA}`, 'gi'),
    new RegExp(String.raw`\bOF\b${PREFIJO_NUM}${LISTA}`, 'g'), // "OF" en mayúscula para no confundir con texto en inglés
];

/** Texto propio de la respuesta: lo que está antes del primer correo citado. */
export function textoPropio(cuerpo: string): string {
    const m = ENCABEZADO_DE.exec(cuerpo);
    const corte = cuerpo.search(/^\s*-{3,}\s*(?:Original Message|Mensaje original)/im);
    const fin = Math.min(m ? m.index : cuerpo.length, corte >= 0 ? corte : cuerpo.length);
    return cuerpo.slice(0, fin);
}

export function numerosDeOferta(texto: string): number[] {
    const nums = new Set<number>();
    for (const re of PATRONES) {
        re.lastIndex = 0;
        for (let m = re.exec(texto); m; m = re.exec(texto)) {
            for (const n of m[1].match(/\d{3,7}/g) || []) nums.add(Number(n));
        }
    }
    return [...nums];
}

/** Fecha de un encabezado de Outlook, interpretada en hora de Colombia (UTC-5). */
export function fechaDeEncabezado(texto: string): string | null {
    const t = texto.toLowerCase().replace(/\s+/g, ' ').trim();
    let y: number, mes: number, d: number;
    let resto: string;

    let m = /(\d{1,2}) de ([a-zñ]+) de (\d{4})(.*)/.exec(t); // jueves, 26 de noviembre de 2026 2:23 p. m.
    if (m && MESES[m[2]]) {
        d = +m[1]; mes = MESES[m[2]]; y = +m[3]; resto = m[4];
    } else if ((m = /([a-z]+) (\d{1,2}),? (\d{4})(.*)/.exec(t)) && MESES[m[1]]) { // Thursday, November 26, 2026 2:23 PM
        mes = MESES[m[1]]; d = +m[2]; y = +m[3]; resto = m[4];
    } else if ((m = /(\d{1,2})\/(\d{1,2})\/(\d{4})(.*)/.exec(t))) { // 26/11/2026 14:23
        d = +m[1]; mes = +m[2]; y = +m[3]; resto = m[4];
    } else {
        return null;
    }

    const hm = /(\d{1,2}):(\d{2})/.exec(resto);
    let h = hm ? +hm[1] : 0;
    const min = hm ? +hm[2] : 0;
    const pm = /p\.?\s*m\.?/.test(resto);
    const am = /a\.?\s*m\.?/.test(resto);
    if (pm && h < 12) h += 12;
    if (am && h === 12) h = 0;
    const fecha = new Date(Date.UTC(y, mes - 1, d, h + 5, min));
    return Number.isNaN(fecha.getTime()) ? null : fecha.toISOString();
}

export function leerRespuesta(cuerpo: string): RespuestaOferta {
    const propio = textoPropio(cuerpo);
    const numeros = numerosDeOferta(propio);
    const citado = cuerpo.slice(propio.length);
    const de = ENCABEZADO_DE.exec(citado);
    const fecha = ENCABEZADO_FECHA.exec(citado);
    const asesor = de ? de[1].replace(/<[^>]*>/g, '').replace(/[*"]/g, '').trim() || null : null;
    return { numeros, fechaCorreoAsesor: fecha ? fechaDeEncabezado(fecha[1]) : null, asesor };
}

/** Convierte los correos enviados en filas para `ofertas_correos` (solo los que confirman una oferta). */
export function filasDeCorreos(correos: { id: string; asunto: string; enviado: string; cuerpo: string }[]): FilaOfertaCorreo[] {
    const filas: FilaOfertaCorreo[] = [];
    for (const c of correos) {
        const r = leerRespuesta(c.cuerpo);
        for (const n of r.numeros) {
            filas.push({
                message_id: c.id,
                numero_oferta: n,
                fecha_respuesta: c.enviado,
                fecha_correo_asesor: r.fechaCorreoAsesor,
                asesor: r.asesor,
                asunto: c.asunto || null,
            });
        }
    }
    return filas;
}
