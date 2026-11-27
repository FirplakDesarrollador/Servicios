import { getSapSessionCookie } from './src/lib/sapServiceLayer';

async function main() {
  const cookie = await getSapSessionCookie();
  console.log("Searching for 2258315...");
  // Let's filter by substring or something, or try AbsoluteEntry directly without filter
  const poUrl = `https://200.7.96.194:50000/b1s/v1/ProductionOrders(2258315)`;
  const res = await fetch(poUrl, { headers: { 'Cookie': cookie } });
  
  if (res.ok) {
    const data = await res.json();
    console.log("Found by AbsoluteEntry:", data.DocumentNumber, data.AbsoluteEntry);
  } else {
    console.log("Failed by AbsoluteEntry:", await res.text());
  }

  // What about DocumentNumber?
  const poUrl2 = `https://200.7.96.194:50000/b1s/v1/ProductionOrders?$filter=DocumentNumber eq 2258315`;
  const res2 = await fetch(poUrl2, { headers: { 'Cookie': cookie } });
  
  if (res2.ok) {
    const data = await res2.json();
    console.log("Found by DocumentNumber:", data.value?.length);
  } else {
    console.log("Failed by DocumentNumber:", await res2.text());
  }
}

main().catch(console.error);
