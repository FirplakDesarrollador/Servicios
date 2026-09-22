import { getSapSessionCookie } from './src/lib/sapServiceLayer';

async function main() {
  const cookie = await getSapSessionCookie();
  const url = `https://200.7.96.194:50000/b1s/v1/ProductionOrders?$filter=DocumentNumber eq 2258315`;
  const res = await fetch(url, { headers: { 'Cookie': cookie } });
  
  if (res.ok) {
    const data = await res.json();
    const po = data.value[0];
    console.log("Lines length:", po.ProductionOrderLines?.length);
    if (po.ProductionOrderLines?.length > 0) {
      console.log("First line:", po.ProductionOrderLines[0]);
    }
  } else {
    console.log("Failed:", await res.text());
  }
}

main().catch(console.error);
