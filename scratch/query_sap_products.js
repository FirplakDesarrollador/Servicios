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
        // Login to SAP
        console.log('Logging in to SAP...');
        const loginRes = await fetch(env.SAP_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                CompanyDB: env.SAP_COMPANY_DB,
                Password: env.SAP_PASSWORD,
                UserName: env.SAP_USERNAME
            })
        });

        if (!loginRes.ok) throw new Error('Login failed: ' + loginRes.status);

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
            console.log('\n=== Querying:', itemCode, '===');
            try {
                const itemRes = await fetch(baseUrl + `/Items('${itemCode}')`, {
                    headers: { 'Cookie': cookie }
                });

                if (!itemRes.ok) {
                    const errorText = await itemRes.text();
                    console.log('Status:', itemRes.status);
                    console.log('Error:', errorText);
                    continue;
                }

                const itemData = await itemRes.json();
                console.log(JSON.stringify({
                    ItemCode: itemData.ItemCode,
                    ItemName: itemData.ItemName,
                    BarCode: itemData.BarCode,
                    ItemsGroupCode: itemData.ItemsGroupCode,
                    Valid: itemData.Valid,
                    Frozen: itemData.Frozen,
                    SalesItem: itemData.SalesItem,
                    U_color_base: itemData.U_color_base,
                    U_color_mueble: itemData.U_color_mueble,
                    U_diseno_base: itemData.U_diseno_base,
                    U_diseno_mueble: itemData.U_diseno_mueble,
                    U_medida_altura: itemData.U_medida_altura,
                    U_medida_anchura: itemData.U_medida_anchura,
                    Prices: itemData.ItemPrices ? itemData.ItemPrices.filter(p => p.Price > 0).map(p => ({ PriceList: p.PriceList, Price: p.Price })) : []
                }, null, 2));
            } catch (err) {
                console.log('Error fetching', itemCode, ':', err.message);
            }
        }

        // Also get the group names for the group codes
        console.log('\n=== Item Groups ===');
        const groupsRes = await fetch(baseUrl + '/ItemGroups?$select=Number,GroupName', {
            headers: { 'Cookie': cookie }
        });
        if (groupsRes.ok) {
            const groupsData = await groupsRes.json();
            console.log(JSON.stringify(groupsData.value, null, 2));
        }

    } catch (error) {
        console.error('Error:', error.message);
    }
}

queryProducts();
