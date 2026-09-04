const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const envFile = fs.readFileSync('.env', 'utf8');
const env = {};
envFile.split(/\r?\n/).forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) env[match[1].trim()] = match[2].trim().replace(/^"|"$/g, '');
});

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Mapeos
const SKU_PREFIX_TO_GROUP = {
  "VBAN": "BANO",
  "VBNA": "BANO",
  "VEXH": "BANO",
  "VPAP": "BANO",
  "VCOC": "COCINAS",
  "VCLO": "COCINAS",
  "VOCO": "COCINAS",
  "VPYM": "COCINAS",
  "VHEM": "HIDROEMP",
  "VHPT": "HIDROPOR",
  "VGRI": "GRIFERIA",
  "VROP": "ROPAS",
  "VMPD": "ROPAS",
  "VTIN": "BANERA",
  "VQUA": "QUARTZSTONE",
  "VCIV": "ZOCALOS",
};

const SAP_GRUPO_TO_SUPABASE = {
  "BANO":         "BANO",
  "COCINA":       "COCINAS",
  "COCINAS":      "COCINAS",
  "HIDROEMP":     "HIDROEMP",
  "HIDROPOR":     "HIDROPOR",
  "GRIFERIA":     "GRIFERIA",
  "ROPAS":        "ROPAS",
  "BANERA":       "BANERA",
  "QUARTZSTONE":  "QUARTZSTONE",
  "ZOCALOS":      "ZOCALOS",
  "PLOMERIA":     "PLOMERIA",
  "REPUESTO":     "REPUESTO",
  "MPDIRECT":     "MPDIRECT",
  "EXHIBIDOR":    "EXHIBIDOR",
  "SERVICIOS":    "SERVICIOS",
};

function resolveGroup(itemCode, uGrupo) {
  const prefix = itemCode.substring(0, 4).toUpperCase();
  if (SKU_PREFIX_TO_GROUP[prefix]) return SKU_PREFIX_TO_GROUP[prefix];
  if (uGrupo && SAP_GRUPO_TO_SUPABASE[uGrupo.toUpperCase()]) return SAP_GRUPO_TO_SUPABASE[uGrupo.toUpperCase()];
  return "BANO"; // Default as user mentioned "baños"
}

function mapItem(item) {
  let precio = null;
  if (item.ItemPrices && Array.isArray(item.ItemPrices)) {
    const lista7 = item.ItemPrices.find(p => p.PriceList === 7 && p.Price > 0);
    if (lista7) {
      precio = Math.round(lista7.Price);
    } else {
      const anyPrice = item.ItemPrices.find(p => p.Price > 0);
      if (anyPrice) precio = Math.round(anyPrice.Price);
    }
  }

  return {
    sku:           item.ItemCode,
    nombre:        item.ItemName,
    codigo_barras: item.BarCode || null,
    grupo:         resolveGroup(item.ItemCode, item.U_Grupo),
    precio:        precio,
    color_base:    "OTRO",
  };
}

async function run() {
    try {
        console.log("Logging into SAP...");
        const loginRes = await fetch(env.SAP_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                CompanyDB: env.SAP_COMPANY_DB,
                Password: env.SAP_PASSWORD,
                UserName: env.SAP_USERNAME
            })
        });
        
        if (!loginRes.ok) throw new Error('SAP Login failed');
        const loginData = await loginRes.json();
        const sessionId = loginData.SessionId;
        const cookies = loginRes.headers.get('set-cookie') || '';
        let cookie = 'B1SESSION=' + sessionId;
        if (cookies.includes('ROUTEID')) {
            const routeId = cookies.split(',').find(c => c.includes('ROUTEID'));
            if (routeId) cookie += '; ' + routeId.split(';')[0];
        }
        
        const baseUrl = env.SAP_API_URL.replace('/Login', '');
        const skus = ['VBAN03-2548-000-0100', 'VBAN05-0094-000-1304'];
        
        console.log("Fetching SKUs from SAP...");
        const sapItems = [];
        for (const sku of skus) {
            const url = `${baseUrl}/Items('${sku}')`;
            const res = await fetch(url, { headers: { 'Cookie': cookie } });
            if (res.ok) {
                const data = await res.json();
                sapItems.push(data);
                console.log(`- Found ${sku} in SAP`);
            } else {
                console.log(`- Not found or error for ${sku}: ${res.status}`);
            }
        }
        
        if (sapItems.length > 0) {
            const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
            // I actually don't have SUPABASE_SERVICE_ROLE_KEY in .env, wait. Let's just use what's available.
            // Oh, I need the service key. Let me check if NEXT_PUBLIC_SUPABASE_ANON_KEY works for insertions (if RLS allows it).
            // The table is "Productos". If RLS prevents it, I will write directly via HTTP API with service key.
        }
        
        fs.writeFileSync('scratch/sap_items.json', JSON.stringify(sapItems.map(mapItem), null, 2));
        console.log("Data saved to scratch/sap_items.json");
    } catch (e) {
        console.error(e.message);
    }
}

run();
