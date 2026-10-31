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
    const cookies = loginRes.headers.get('set-cookie') || '';
    if (cookies.includes('ROUTEID')) cookie += '; ' + cookies.split(',').find(c => c.includes('ROUTEID')).split(';')[0];
    const baseUrl = env.SAP_API_URL.replace('/Login', '');

    const bpQueries = [
        "substringof('DITRANSA',CardName) or substringof('800242427',CardCode)",
        "substringof('Tornblom',CardName)",
        "substringof('OCQ',CardName)"
    ];

    for (const q of bpQueries) {
        const bpRes = await fetch(`${baseUrl}/BusinessPartners?$select=CardCode,CardName&$filter=${q}`, { headers: { 'Cookie': cookie } });
        if (bpRes.ok) {
            const bps = await bpRes.json();
            console.log(`\n--- Providers for query [${q}] ---`);
            for (const bp of bps.value) {
                console.log(`${bp.CardCode} - ${bp.CardName}`);
                
                // Try Mainsupplier
                const itemsRes = await fetch(`${baseUrl}/Items?$select=ItemCode,ItemName,Mainsupplier&$filter=Mainsupplier eq '${bp.CardCode}'`, { headers: { 'Cookie': cookie } });
                if (itemsRes.ok) {
                    const items = await itemsRes.json();
                    console.log(`  Items (Mainsupplier): ${items.value.length}`);
                    for (const item of items.value) {
                        console.log(`    - ${item.ItemCode}: ${item.ItemName}`);
                    }
                } else {
                    console.log(`  Error fetching items with Mainsupplier:`, await itemsRes.text());
                }
            }
        }
    }
}
run();
