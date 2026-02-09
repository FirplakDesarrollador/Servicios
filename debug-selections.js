const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

function log(msg) {
    console.log(msg);
    fs.appendFileSync('results.txt', msg + '\n');
}

// Clear previous results
fs.writeFileSync('results.txt', '');

// 1. Load env vars
const envContent = fs.readFileSync('.env.local', 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
        envVars[key.trim()] = value.trim();
    }
});

const supabaseUrl = envVars['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = envVars['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
    log('Checking Supabase data...');

    // Check Precios Zonas
    const { data: precios, error: preciosError } = await supabase
        .from('precioszonas')
        .select('*');

    if (preciosError) {
        log('Error fetching precioszonas: ' + JSON.stringify(preciosError));
    } else {
        log(`precioszonas count: ${precios.length}`);
        if (precios.length === 0) log('WARNING: precioszonas is EMPTY!');
        else log('Sample precios: ' + JSON.stringify(precios.slice(0, 3)));
    }

    // Check Zonas Medidas
    const { data: medidas, error: medidasError } = await supabase
        .from('zonas_medidas')
        .select('*');

    if (medidasError) {
        log('Error fetching zonas_medidas: ' + JSON.stringify(medidasError));
    } else {
        log(`zonas_medidas count: ${medidas.length}`);
        if (medidas.length === 0) log('WARNING: zonas_medidas is EMPTY!');
        else log('Sample medidas: ' + JSON.stringify(medidas.slice(0, 3)));
    }

    // Check vw_zonas_medidas_descripciones
    const { data: grupos, error: gruposError } = await supabase
        .from('vw_zonas_medidas_descripciones')
        .select('*');

    if (gruposError) {
        log('Error fetching vw_zonas_medidas_descripciones: ' + JSON.stringify(gruposError));
    } else {
        log(`vw_zonas_medidas_descripciones count: ${grupos.length}`);
        if (grupos.length === 0) log('WARNING: vw_zonas_medidas_descripciones is EMPTY!');
        else log('Sample grupos: ' + JSON.stringify(grupos.slice(0, 3)));
    }
}

checkData();
