const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const envContent = fs.readFileSync('.env.local', 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
        envVars[key.trim()] = value.trim();
    }
});

const supabase = createClient(
    envVars['NEXT_PUBLIC_SUPABASE_URL'],
    envVars['NEXT_PUBLIC_SUPABASE_ANON_KEY']
);

async function checkKeys() {
    try {
        const { data: precios, error: pError } = await supabase.from('precioszonas').select('*').limit(1);
        const { data: medidas, error: mError } = await supabase.from('zonas_medidas').select('*').limit(1);
        const { data: desc, error: dError } = await supabase.from('vw_zonas_medidas_descripciones').select('*').limit(1);

        const result = {
            preciosError: pError,
            preciosKeys: precios && precios.length ? Object.keys(precios[0]) : 'No data',
            medidasError: mError,
            medidasKeys: medidas && medidas.length ? Object.keys(medidas[0]) : 'No data',
            descKeys: desc && desc.length ? Object.keys(desc[0]) : 'No data'
        };

        fs.writeFileSync('keys_debug.txt', JSON.stringify(result, null, 2));
    } catch (e) {
        fs.writeFileSync('keys_debug.txt', `EXCEPTION: ${e.message}`);
    }
}

checkKeys();
