import { NextResponse } from 'next/server';
import { getSapSessionCookie } from '@/lib/sapServiceLayer';

const SAP_BASE_URL = process.env.SAP_BASE_URL || 'https://200.7.96.194:50000/b1s/v1';

export async function GET() {
  try {
    const cookie = await getSapSessionCookie();
    const res = await fetch(`${SAP_BASE_URL}/DistributionRules`, {
      headers: { 'Cookie': cookie }
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ success: false, message: err }, { status: res.status });
    }

    const data = await res.json();
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
