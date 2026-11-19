import { getSapSessionCookie } from './src/lib/sapServiceLayer';

async function main() {
  const cookie = await getSapSessionCookie();
  const url = `https://200.7.96.194:50000/b1s/v1/ProductionOrders?$filter=DocumentNumber eq 2258315&$expand=ProductionOrderLines`;
  const res = await fetch(url, { headers: { 'Cookie': cookie } });
  
  if (res.ok) {
    const data = await res.json();
    console.log("Success:", data.value?.length);
  } else {
    console.log("Failed:", await res.text());
  }
}

main().catch(console.error);
