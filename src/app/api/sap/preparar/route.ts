import { NextResponse } from 'next/server';
import { exigirSesion } from '@/lib/sesionApi';
import { getSapSessionCookie } from '@/lib/sapServiceLayer';

// Deja lista la sesión de SAP (el Login tarda de 2 a 10 s) mientras el usuario escribe su búsqueda.
// Si la instancia ya tiene sesión vigente, responde al instante sin ir a SAP.
export async function GET(request: Request) {
  const rechazo = await exigirSesion(request);
  if (rechazo) return rechazo;

  try {
    await getSapSessionCookie();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
