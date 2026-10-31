import { NextResponse } from 'next/server';
import { sapGet } from '@/lib/sapServiceLayer';

export async function GET() {
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
