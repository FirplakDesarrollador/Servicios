const fs = require('fs');

const envFile = fs.readFileSync('.env', 'utf8');
const env = {};
envFile.split(/\r?\n/).forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) env[match[1].trim()] = match[2].trim().replace(/^"|"$/g, '');
});

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function queryProducts() {
    try {
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
        const items = ['VBAN05-0140-MRH-0406', 'VBAN03-2553-000-0100'];

        for (const itemCode of items) {
            console.log('\n=== ' + itemCode + ' ===');
            const itemRes = await fetch(baseUrl + `/Items('${itemCode}')`, {
                headers: { 'Cookie': cookie }
            });

            if (!itemRes.ok) {
                console.log('Error:', itemRes.status);
                continue;
            }

            const d = await itemRes.json();
            // Print all U_ (user-defined) fields
            const uFields = {};
            for (const key of Object.keys(d)) {
                if (key.startsWith('U_')) {
                    uFields[key] = d[key];
                }
            }
            console.log('User fields:', JSON.stringify(uFields, null, 2));
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
}

queryProducts();
