const fs = require('fs');

const envFile = fs.readFileSync('.env', 'utf8');
const env = {};
envFile.split(/\r?\n/).forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) env[match[1].trim()] = match[2].trim().replace(/^\"|\"$/g, '');
});

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const supaUrl = env.NEXT_PUBLIC_SUPABASE_URL.trim().replace(/^"|"$/g, '');
const supaKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY.trim().replace(/^"|"$/g, '');

const itemsToAdd = [
    { providerCode: 'AC800242427-01', providerName: 'COMPAÑIA DE DISTRIBUCION Y TRANSPORTE S.A.S. BIC', itemCode: 'ZZCC01-0105-000-0000', itemDesc: 'TRANSPORTE' },
    { providerCode: 'PE444444558-01', providerName: 'TORNBLOM SOFTWARE AB', itemCode: 'ZZCC01-0073-000-0000', itemDesc: 'OTROS SERVICIOS' },
    { providerCode: 'PN902014472-01', providerName: 'GRUPO OCQ COLOMBIA SAS', itemCode: 'CMPD01-0019-000-0000', itemDesc: 'RESINA FV 4891' },
    { providerCode: 'PN902014472-01', providerName: 'GRUPO OCQ COLOMBIA SAS', itemCode: 'CMPD01-0020-000-0000', itemDesc: 'CRISTALAN M202 (ANTES 13 3750)' },
    { providerCode: 'PN902014472-01', providerName: 'GRUPO OCQ COLOMBIA SAS', itemCode: 'ZZCC01-0166-000-0000', itemDesc: 'CUENTA PUENTE PROVEEDORES NACIONAL' }
];

async function run() {
  try {
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
    
    if (!loginRes.ok) throw new Error('SAP Login failed: ' + await loginRes.text());
    const loginData = await loginRes.json();
    let cookie = 'B1SESSION=' + loginData.SessionId;
    const cookies = loginRes.headers.get('set-cookie') || '';
    if (cookies.includes('ROUTEID')) {
        const routeId = cookies.split(',').find(c => c.includes('ROUTEID'));
        if (routeId) cookie += '; ' + routeId.split(';')[0];
    }
    const baseUrl = env.SAP_API_URL.replace('/Login', '');

    let allItemsToInsert = [];

    for (const data of itemsToAdd) {
        let price = 0;
        let unit = 'UN';

        // Fetch item details
        let itemRes = await fetch(`${baseUrl}/Items('${data.itemCode}')?$select=SalesUnit,ItemPrices`, { headers: { 'Cookie': cookie } });
        if (itemRes.ok) {
            let sapItem = await itemRes.json();
            if (sapItem.SalesUnit) unit = sapItem.SalesUnit;
            if (sapItem.ItemPrices && sapItem.ItemPrices.length > 0) {
                const p = sapItem.ItemPrices.find(p => p.Price > 0);
                if (p) price = p.Price;
            }
        } else {
            console.log(`Warning: Failed to fetch details for ${data.itemCode} from SAP`);
        }

        allItemsToInsert.push({
            Codigo_provedor: data.providerCode,
            Provedor: data.providerName,
            Codigo_Articulo: data.itemCode,
            Descripcion_articulo: data.itemDesc,
            Unidad_de_medida: unit,
            Precio: price.toString(),
            Cantidad: "1"
        });
    }

    if (allItemsToInsert.length > 0) {
        console.log('\nInserting into Supabase Neg_base...', allItemsToInsert.length, 'rows');
        const insertRes = await fetch(`${supaUrl}/rest/v1/Neg_base`, {
            method: 'POST',
            headers: {
                'apikey': supaKey,
                'Authorization': `Bearer ${supaKey}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify(allItemsToInsert)
        });

        if (!insertRes.ok) {
            console.error('Supabase Insert failed:', await insertRes.text());
        } else {
            const resData = await insertRes.json();
            console.log('Successfully inserted into Neg_base:', resData.length, 'records');
        }
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

run();
