const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const envFile = fs.readFileSync('.env', 'utf8');
const env = {};
envFile.split(/\r?\n/).forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) env[match[1].trim()] = match[2].trim().replace(/^"|"$/g, '');
});

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

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
  return "BANO";
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
    const itemCode = 'VBAN05-0019-000-0323';
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
    
    if (!loginRes.ok) {
        throw new Error('SAP Login failed');
    }
    const loginData = await loginRes.json();
    const sessionId = loginData.SessionId;
    const cookies = loginRes.headers.get('set-cookie') || '';
    let cookie = 'B1SESSION=' + sessionId;
    if (cookies.includes('ROUTEID')) {
        const routeId = cookies.split(',').find(c => c.includes('ROUTEID'));
        if (routeId) cookie += '; ' + routeId.split(';')[0];
    }
    
    const baseUrl = env.SAP_API_URL.replace('/Login', '');
    console.log('Fetching item from SAP:', itemCode);
    const itemRes = await fetch(`${baseUrl}/Items('${itemCode}')`, {
      headers: { 'Cookie': cookie }
    });
    
    if (!itemRes.ok) {
      throw new Error(`Item fetch failed: ${itemRes.status} - ${await itemRes.text()}`);
    }
    
    const sapItem = await itemRes.json();
    console.log('--- SAP Item found ---');
    
    const mapped = mapItem(sapItem);
    console.log('Mapped payload:', JSON.stringify(mapped, null, 2));
    
    console.log('Logging into Supabase as user...');
    const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: 'blanca.ordonez@firplak.com',
        password: 'Neggan123'
    });
    
    if (authError) {
        throw new Error('Supabase Auth failed: ' + authError.message);
    }
    console.log('Logged into Supabase successfully!');
    
    console.log('Inserting/upserting to Supabase...');
    const { data, error } = await supabase
      .from('Productos')
      .upsert(mapped, { onConflict: 'sku' })
      .select();
      
    if (error) {
      console.error('Supabase error:', error.message);
    } else {
      console.log('Success! Result:', data);
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

run();
