import { NextResponse } from 'next/server';
import { exigirSesion } from '@/lib/sesionApi';
import { buscarSocios, obtenerSocio } from '@/lib/sapSocioNegocios';

// Datos maestros socio de negocios (solo lectura): ?q= busca por código, nombre o NIT; ?codigo=CardCode trae la ficha.
export async function GET(request: Request) {
  const rechazo = await exigirSesion(request);
  if (rechazo) return rechazo;

  try {
    const { searchParams } = new URL(request.url);
    const codigo = searchParams.get('codigo');
    if (codigo) {
      const socio = await obtenerSocio(codigo);
      if (!socio) return NextResponse.json({ success: false, error: `El socio ${codigo} no existe en SAP.` }, { status: 404 });
      return NextResponse.json({ success: true, socio });
    }
    const socios = await buscarSocios(searchParams.get('q') || '');
    return NextResponse.json({ success: true, socios });
  } catch (error: any) {
    console.error('Error consultando socio de negocios en SAP:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
