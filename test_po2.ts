import { getSapSessionCookie } from './src/lib/sapServiceLayer';

async function main() {
  const cookie = await getSapSessionCookie();
  console.log("Fetching first 2 ProductionOrders...");
  const poUrl = `https://200.7.96.194:50000/b1s/v1/ProductionOrders?$top=2`;
  const res = await fetch(poUrl, { headers: { 'Cookie': cookie } });
  
  if (res.ok) {
    const data = await res.json();
    console.log("Found:", data.value?.length);
    if (data.value && data.value.length > 0) {
      const po = data.value[0];
      console.log("PO DocumentNumber:", po.DocumentNumber);
      console.log("PO AbsoluteEntry:", po.AbsoluteEntry);
      console.log("Keys:", Object.keys(po));
    }
  } else {
    console.log("Failed:", await res.text());
  }
}

main().catch(console.error);
