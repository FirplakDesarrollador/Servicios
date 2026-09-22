import { NextResponse } from 'next/server';
import { fetchSapItems } from '@/lib/sapServiceLayer';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';
    const items = await fetchSapItems(q);
    return NextResponse.json({ success: true, items });
  } catch (error: any) {
    console.error('Error fetching SAP items:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
