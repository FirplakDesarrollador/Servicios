import { NextResponse } from 'next/server';
import { fetchSapBusinessPartners } from '@/lib/sapServiceLayer';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';
    const customers = await fetchSapBusinessPartners(q);
    return NextResponse.json({ success: true, customers });
  } catch (error: any) {
    console.error('Error fetching SAP customers:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
