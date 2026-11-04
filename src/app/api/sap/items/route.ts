import { NextResponse } from 'next/server';
import { exigirSesion } from '@/lib/sesionApi';
import { fetchSapItems } from '@/lib/sapServiceLayer';

export async function GET(request: Request) {
  const rechazo = await exigirSesion(request);
  if (rechazo) return rechazo;

  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';
    const items = await fetchSapItems(q);
    return NextResponse.json({
      success: true,
      items: items.map((i: any) => ({ ItemCode: i.ItemCode, ItemName: i.ItemName, ItemPrices: (i.ItemPrices || []).slice(0, 1) })),
    });
  } catch (error: any) {
    console.error('Error fetching SAP items:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
