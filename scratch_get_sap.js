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
    const itemCode = 'VBAN05-0125-000-1304';
    
    const itemRes = await fetch(baseUrl + `/Items('${itemCode}')`, {
      headers: { 'Cookie': cookie }
    });
    
    if (!itemRes.ok) throw new Error('Item fetch failed');
    const itemData = await itemRes.json();
    
    // Extrayendo información clave
    console.log(JSON.stringify({
       ItemCode: itemData.ItemCode,
       ItemName: itemData.ItemName,
       BarCode: itemData.BarCode,
       ItemsGroupCode: itemData.ItemsGroupCode,
       Prices: itemData.ItemPrices ? itemData.ItemPrices.map(p => ({ PriceList: p.PriceList, Price: p.Price })) : [],
       U_color_base: itemData.U_color_base,
       U_color_mueble: itemData.U_color_mueble
    }, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }
}
checkItem();
