import { NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const respuesta = (mensaje: string, status: number) =>
  NextResponse.json({ success: false, error: mensaje, message: mensaje }, { status });

let cliente: SupabaseClient | null = null;

// Verificar un token no requiere privilegios: basta la clave anónima, sin guardar sesión en el servidor.
// Se crea al primer uso y no al importar, para que el build no dependa de las variables.
function getClienteAuth(): SupabaseClient {
  if (!cliente) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY');
    }
    cliente = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  }
  return cliente;
}

/**
 * Exige una sesión válida de Supabase en una ruta API. Solo para código de servidor.
 * La sesión del navegador vive en localStorage (no en cookies), así que llega en el encabezado
 * `Authorization: Bearer <token>`: desde el navegador se llama con `fetchConSesion`.
 *
 * Devuelve la respuesta de rechazo, o `null` si la sesión es válida.
 */
export async function exigirSesion(request: Request): Promise<NextResponse | null> {
  const token = request.headers.get('authorization')?.match(/^Bearer\s+(\S+)$/i)?.[1];
  if (!token) return respuesta('Debes iniciar sesión para consultar esta información', 401);

  try {
    const { data, error } = await getClienteAuth().auth.getUser(token);
    if (error || !data.user) return respuesta('La sesión no es válida o ya venció. Vuelve a iniciar sesión', 401);
    return null;
  } catch (error) {
    console.error('[Sesión API] No se pudo verificar la sesión:', error);
    return respuesta('No se pudo verificar la sesión. Intenta de nuevo', 503);
  }
}
