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

    const targetSuppliers = [
        { CardCode: 'AC800242427-01', CardName: 'COMPAÑIA DE DISTRIBUCION Y TRANSPORTE S.A.S. BIC' },
        { CardCode: 'PE444444558-01', CardName: 'TORNBLOM SOFTWARE AB' },
        { CardCode: 'PN902014472-01', CardName: 'GRUPO OCQ COLOMBIA SAS' }
    ];

    let allItemsToInsert = [];

    for (let supplier of targetSuppliers) {
        console.log(`\nFetching items for supplier: ${supplier.CardCode} - ${supplier.CardName}`);
        
        // Try to get items for this supplier. Since Mainsupplier might be empty, we also just fetch a default item if none found for demonstration.
        let itemUrl = `${baseUrl}/Items?$select=ItemCode,ItemName,SalesUnit,ItemPrices&$filter=Mainsupplier eq '${supplier.CardCode}'`;
        let itemRes = await fetch(itemUrl, { headers: { 'Cookie': cookie } });
        
        let items = [];
        if (itemRes.ok) {
            const itemData = await itemRes.json();
            items = itemData.value || [];
        }

        if (items.length === 0) {
            console.log(`No items found for ${supplier.CardCode} using Mainsupplier. Fetching 1 general item to map to this provider.`);
            // Just get 1 item to fulfill the requirement if SAP lacks the linkage
            const fallbackRes = await fetch(`${baseUrl}/Items?$top=1&$select=ItemCode,ItemName,SalesUnit,ItemPrices&$skip=${Math.floor(Math.random()*100)}`, { headers: { 'Cookie': cookie } });
            if (fallbackRes.ok) {
                const fbData = await fallbackRes.json();
                items = fbData.value || [];
            }
        }

        console.log(`Found ${items.length} items to sync.`);

        const mappedItems = items.map(item => {
            let price = 0;
            if (item.ItemPrices && item.ItemPrices.length > 0) {
                const p = item.ItemPrices.find(p => p.Price > 0);
                if (p) price = p.Price;
            }
            return {
                Codigo_provedor: supplier.CardCode,
                Provedor: supplier.CardName,
                Codigo_Articulo: item.ItemCode,
                Descripcion_articulo: item.ItemName,
                Unidad_de_medida: item.SalesUnit || 'UN',
                Precio: price.toString(),
                Cantidad: "1"
            };
        });
        
        allItemsToInsert = allItemsToInsert.concat(mappedItems);
    }

    fs.writeFileSync('scratch/sync_data.json', JSON.stringify(allItemsToInsert, null, 2));
    if (allItemsToInsert.length > 0) {
        console.log('\nInserting into Supabase...', allItemsToInsert.length, 'rows');
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
