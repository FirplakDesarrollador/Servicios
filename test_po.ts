import { fetchSapQuotationByDocNum } from './src/lib/sapServiceLayer';

async function main() {
  console.log("Fetching ProductionOrder 2258315...");
  const res = await fetchSapQuotationByDocNum('2258315', 'ProductionOrder');
  if (res) {
    console.log("Found:", res.documentType);
    console.log(Object.keys(res.data));
  } else {
    console.log("Not found or null");
  }
}

main().catch(console.error);
