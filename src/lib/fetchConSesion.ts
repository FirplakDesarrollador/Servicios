import { supabase } from '@/lib/supabase';

/** `fetch` del navegador que envía la sesión actual a las rutas protegidas con `exigirSesion`. */
export async function fetchConSesion(url: string, init: RequestInit = {}): Promise<Response> {
  const { data: { session } } = await supabase.auth.getSession();
  const headers = new Headers(init.headers);
  if (session) headers.set('Authorization', `Bearer ${session.access_token}`);
  return fetch(url, { ...init, headers });
}
