const fs = require('fs');

const envFile = fs.readFileSync('.env', 'utf8');
const env = {};
envFile.split(/\r?\n/).forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) env[match[1].trim()] = match[2].trim().replace(/^\"|\"$/g, '');
});

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function checkItem() {
  try {
    console.log('Logging in to:', env.SAP_API_URL);
    const loginRes = await fetch(env.SAP_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        CompanyDB: env.SAP_COMPANY_DB,
        Password: env.SAP_PASSWORD,
        UserName: env.SAP_USERNAME
      })
    });
    
    if (!loginRes.ok) {
        throw new Error('Login failed: ' + loginRes.status + ' ' + await loginRes.text());
    }
    
    const loginData = await loginRes.json();
    const sessionId = loginData.SessionId;
    const cookies = loginRes.headers.get('set-cookie') || '';
    let cookie = 'B1SESSION=' + sessionId;
    if (cookies.includes('ROUTEID')) {
        const routeId = cookies.split(',').find(c => c.includes('ROUTEID'));
        if (routeId) {
            cookie += '; ' + routeId.split(';')[0];
        }
    }
    
    const baseUrl = env.SAP_API_URL.replace('/Login', '');
    const itemCode = 'VBAN05-0140-000-0494';
    
    console.log('Fetching item:', itemCode);
    const itemRes = await fetch(baseUrl + '/Items(\'' + itemCode + '\')', {
      headers: { 'Cookie': cookie }
    });
    
    if (!itemRes.ok) {
        throw new Error('Item fetch failed: ' + itemRes.status + ' ' + await itemRes.text());
    }
    const itemData = await itemRes.json();
    
    console.log('--- ITEM DETAILS ---');
    console.log('ItemCode:', itemData.ItemCode);
    console.log('ItemName:', itemData.ItemName);
    console.log('Valid:', itemData.Valid);
    console.log('Frozen:', itemData.Frozen);
    console.log('SalesItem:', itemData.SalesItem);
    console.log('InventoryItem:', itemData.InventoryItem);
  } catch (error) {
    console.log('Error:', error.message);
  }
}
checkItem();
