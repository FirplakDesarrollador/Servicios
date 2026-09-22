const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
const envFile = fs.readFileSync(envPath, 'utf-8');
const env = envFile.split('\n').reduce((acc, line) => {
    const parts = line.split('=');
    const key = parts[0];
    const value = parts.slice(1).join('=');
    if (key && value) acc[key.trim()] = value.trim();
    return acc;
}, {});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data, error } = await supabase
        .from('registro_solicitudes')
        .select('consecutivo, productos_compra, productos_novedad')
        .eq('consecutivo', 'RAD-826515');

    if (error) {
        console.error('Supabase Error:', error);
        return;
    }

    console.log('--- RAD-826515 ---');
    console.log(JSON.stringify(data, null, 2));

    const { data: data2 } = await supabase
        .from('registro_solicitudes')
        .select('consecutivo, productos_compra, productos_novedad')
        .limit(5);

    console.log('--- OTHER RECORDS ---');
    console.log(JSON.stringify(data2, null, 2));
}

check();
