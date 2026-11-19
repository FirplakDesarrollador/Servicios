import { NextResponse } from 'next/server';
import { exigirSesion } from '@/lib/sesionApi';
import { sapGet } from '@/lib/sapServiceLayer';

export async function GET(request: Request) {
  const rechazo = await exigirSesion(request);
  if (rechazo) return rechazo;

  try {
    const data = await sapGet<{ value: any[] }>('DistributionRules?$select=FactorCode,FactorDescription,InWhichDimension', { maxPageSize: 5000 });
    const costCenters = (data.value || []).map((d: any) => ({
      code: d.FactorCode,
      name: d.FactorDescription || d.FactorCode,
      dimension: d.InWhichDimension
    }));

    return NextResponse.json({ success: true, costCenters });
  } catch (err: any) {
    console.error('Error in /api/sap/cost-centers:', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
