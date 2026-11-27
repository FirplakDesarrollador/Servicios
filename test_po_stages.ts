import { getSapSessionCookie } from './src/lib/sapServiceLayer';

async function main() {
  const cookie = await getSapSessionCookie();
  const url = `https://200.7.96.194:50000/b1s/v1/ProductionOrders?$filter=DocumentNumber eq 2258324`;
  const res = await fetch(url, { headers: { 'Cookie': cookie } });
  
  if (res.ok) {
    const data = await res.json();
    const po = data.value[0];
    console.log("Stages:", po.ProductionOrdersStages?.length);
    if (po.ProductionOrdersStages?.length > 0) {
      console.log("Stage 0:", po.ProductionOrdersStages[0]);
    }
  }
}

main().catch(console.error);
