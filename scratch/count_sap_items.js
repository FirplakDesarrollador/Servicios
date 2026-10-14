// Script rápido para verificar cuántos items devuelve el endpoint filtrado
const fs = require('fs');

const envFile = fs.readFileSync('.env', 'utf8');
const env = {};
envFile.split(/\r?\n/).forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) env[match[1].trim()] = match[2].trim().replace(/^"|"$/g, '');
});

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function countItems() {
    try {
        // Login
        const loginRes = await fetch(env.SAP_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                CompanyDB: env.SAP_COMPANY_DB,
                Password: env.SAP_PASSWORD,
                UserName: env.SAP_USERNAME
            })
        });
        if (!loginRes.ok) throw new Error('Login failed');
        const loginData = await loginRes.json();
        const sessionId = loginData.SessionId;
        const cookies = loginRes.headers.get('set-cookie') || '';
        let cookie = 'B1SESSION=' + sessionId;
        if (cookies.includes('ROUTEID')) {
            const routeId = cookies.split(',').find(c => c.includes('ROUTEID'));
            if (routeId) cookie += '; ' + routeId.split(';')[0];
        }
        
        const baseUrl = env.SAP_API_URL.replace('/Login', '');
        
        // Count items with V prefix
        const filter = encodeURIComponent("startswith(ItemCode,'V') and Valid eq 'tYES' and Frozen eq 'tNO'");
        const countUrl = `${baseUrl}/Items/$count?$filter=${filter}`;
        console.log('Fetching count from:', countUrl);
        
        const countRes = await fetch(countUrl, {
            headers: { 'Cookie': cookie }
        });
        
        if (countRes.ok) {
            const count = await countRes.text();
            console.log('Total V-items (valid, not frozen):', count);
        } else {
            console.log('Count failed:', countRes.status);
            // Try alternate: just fetch first page to see total
            const url = `${baseUrl}/Items?$filter=${filter}&$select=ItemCode&$top=1&$inlinecount=allpages`;
            const res = await fetch(url, {
                headers: { 'Cookie': cookie, 'Prefer': 'odata.maxpagesize=1' }
            });
            if (res.ok) {
                const data = await res.json();
                console.log('odata.count:', data['odata.count']);
                console.log('First item:', data.value?.[0]?.ItemCode);
            }
        }
        
        // Test how fast a single page is
        console.log('\nTiming a 500-item fetch...');
        const start = Date.now();
        const pageUrl = `${baseUrl}/Items?$filter=${filter}&$select=ItemCode,ItemName&$top=500&$skip=0`;
        const pageRes = await fetch(pageUrl, {
            headers: { 'Cookie': cookie, 'Prefer': 'odata.maxpagesize=500' }
        });
        if (pageRes.ok) {
            const data = await pageRes.json();
            console.log(`Got ${data.value?.length} items in ${Date.now() - start}ms`);
        }
        
    } catch (error) {
        console.error('Error:', error.message);
    }
}

countItems();
