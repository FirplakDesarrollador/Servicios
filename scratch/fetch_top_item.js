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

    const itemsRes = await fetch(`${baseUrl}/Items?$top=1`, { headers: { 'Cookie': cookie } });
    if (itemsRes.ok) {
        const item = await itemsRes.json();
        console.log(JSON.stringify(item, null, 2));
    } else {
        console.log("Error:", await itemsRes.text());
    }
}
run();
