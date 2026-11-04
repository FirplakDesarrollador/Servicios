const fs = require('fs');
const envFile = fs.readFileSync('.env', 'utf8');
const env = {};
envFile.split(/\r?\n/).forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) env[match[1].trim()] = match[2].trim().replace(/^\"|\"$/g, '');
});
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function run() {
    const loginRes = await fetch(env.SAP_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ CompanyDB: env.SAP_COMPANY_DB, Password: env.SAP_PASSWORD, UserName: env.SAP_USERNAME })
    });
    const loginData = await loginRes.json();
    let cookie = 'B1SESSION=' + loginData.SessionId;
    const baseUrl = env.SAP_API_URL.replace('/Login', '');

    const bpQueries = [
        "substringof('DITRANSA',CardName) or substringof('800242427',CardCode)",
        "substringof('Tornblom',CardName)",
        "substringof('OCQ',CardName)"
    ];

    const targetBPs = [];

    for (const q of bpQueries) {
        const bpRes = await fetch(`${baseUrl}/BusinessPartners?$select=CardCode,CardName&$filter=${q}`, { headers: { 'Cookie': cookie } });
        if (bpRes.ok) {
            const bps = await bpRes.json();
            for (const bp of bps.value) {
                targetBPs.push(bp.CardCode);
                console.log(`Provider: ${bp.CardCode} - ${bp.CardName}`);
            }
        }
    }

    console.log("Fetching all items to filter in memory...");
    let nextUrl = `${baseUrl}/Items?$select=ItemCode,ItemName,ItemPreferredVendors`;
    let count = 0;
    
    while(nextUrl) {
        const itemsRes = await fetch(nextUrl, { headers: { 'Cookie': cookie } });
        if (!itemsRes.ok) break;
        const itemsData = await itemsRes.json();
        
        for (const item of itemsData.value) {
            count++;
            if (item.ItemPreferredVendors && item.ItemPreferredVendors.length > 0) {
                for (const v of item.ItemPreferredVendors) {
                    if (targetBPs.includes(v.BPCode)) {
                        console.log(`MATCH! BP: ${v.BPCode} | Item: ${item.ItemCode} - ${item.ItemName}`);
                    }
                }
            }
        }
        
        if (itemsData['odata.nextLink']) {
            nextUrl = `${baseUrl}/${itemsData['odata.nextLink']}`;
        } else {
            nextUrl = null;
        }
        if (count % 1000 === 0) console.log(`Processed ${count} items...`);
    }
    console.log(`Total items processed: ${count}`);
}
run();
