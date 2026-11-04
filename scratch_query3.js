const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
const SUPABASE_URL = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1];
const SUPABASE_KEY = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1];

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
    const { data: d1, error: e1 } = await supabase.from('Ubicaciones_1').select('*').limit(1);
    console.log("Ubicaciones_1 Error:", e1 ? e1.message : null);
    if (d1 && d1.length > 0) console.log("Ubicaciones_1 Keys:", Object.keys(d1[0]));

    const { data: d2, error: e2 } = await supabase.from('Consumidores').select('*').limit(1);
    console.log("Consumidores Error:", e2 ? e2.message : null);
    if (d2 && d2.length > 0) console.log("Consumidores Keys:", Object.keys(d2[0]));
}
main();
