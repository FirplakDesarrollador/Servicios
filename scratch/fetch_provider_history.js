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

    const bps = [
        { code: 'AC800242427-01', name: 'COMPAÑIA DE DISTRIBUCION Y TRANSPORTE S.A.S. BIC' },
        { code: 'PE444444558-01', name: 'TORNBLOM SOFTWARE AB' },
        { code: 'PN902014472-01', name: 'GRUPO OCQ COLOMBIA SAS' }
    ];

    console.log("Checking BusinessPartnerCatalogs (OSCN) endpoint if it exists...");
    
    // We will check BusinessPartnerCatalogs
    for (const bp of bps) {
        console.log(`\n--- Provider: ${bp.code} - ${bp.name} ---`);
        
        // 1. Check if there are BusinessPartnerCatalogs for this BP
        // Wait, endpoint is ItemCrossReference or something? Let's check BusinessPartnerCatalogs
        let oscnRes = await fetch(`${baseUrl}/BusinessPartnerCatalogs?$filter=BPCode eq '${bp.code}'`, { headers: { 'Cookie': cookie } });
        if (oscnRes.ok) {
            let data = await oscnRes.json();
            console.log("Found BusinessPartnerCatalogs:", data.value.map(v => `${v.ItemCode} - ${v.ItemName || ''}`).join(', '));
        }

        // 2. Check Purchase Orders (OPOR) to see what we bought from them
        let porRes = await fetch(`${baseUrl}/PurchaseOrders?$filter=CardCode eq '${bp.code}'&$select=DocNum,DocumentLines`, { headers: { 'Cookie': cookie } });
        if (porRes.ok) {
            let data = await porRes.json();
            let items = new Set();
            data.value.forEach(order => {
                order.DocumentLines.forEach(line => {
                    if (line.ItemCode) items.add(`${line.ItemCode} - ${line.ItemDescription}`);
                });
            });
            console.log(`Purchase Orders items bought:`);
            items.forEach(i => console.log(`  - ${i}`));
        } else {
             console.log(`PO Error: ${await porRes.text()}`);
        }

        // 3. Check AP Invoices (OPCH)
        let pchRes = await fetch(`${baseUrl}/PurchaseInvoices?$filter=CardCode eq '${bp.code}'&$select=DocNum,DocumentLines&$top=50`, { headers: { 'Cookie': cookie } });
        if (pchRes.ok) {
            let data = await pchRes.json();
            let items = new Set();
            data.value.forEach(inv => {
                inv.DocumentLines.forEach(line => {
                    if (line.ItemCode || line.ItemDescription) items.add(`${line.ItemCode || 'NO_CODE'} - ${line.ItemDescription}`);
                });
            });
            console.log(`AP Invoices items/services bought:`);
            items.forEach(i => console.log(`  - ${i}`));
        }
    }
}
run();
