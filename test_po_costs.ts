import { getSapSessionCookie } from './src/lib/sapServiceLayer';

async function main() {
  const cookie = await getSapSessionCookie();
  const url = `https://200.7.96.194:50000/b1s/v1/ProductionOrders?$filter=DocumentNumber eq 2258324`;
  const res = await fetch(url, { headers: { 'Cookie': cookie } });
  
  if (res.ok) {
    const data = await res.json();
    const po = data.value[0];
    console.log("Found PO 2258324");
    // Look for cost-related properties
    const keys = Object.keys(po);
    const costKeys = keys.filter(k => k.toLowerCase().includes('cost') || k.toLowerCase().includes('price') || k.toLowerCase().includes('total') || k.toLowerCase().includes('variance'));
    console.log("Cost related keys:", costKeys);
    costKeys.forEach(k => console.log(`${k}: ${po[k]}`));
    
    // Sometimes costs are in UDFs
    const udfKeys = keys.filter(k => k.startsWith('U_'));
    // console.log("UDFs:", udfKeys);
    
    console.log("Full PO object snippet:");
    console.log(JSON.stringify(po, null, 2).substring(0, 500));
  } else {
    console.log("Failed:", await res.text());
  }
}

main().catch(console.error);
