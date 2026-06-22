const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
const SUPABASE_URL = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1];
const SUPABASE_KEY = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1];

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
    const { data: d1 } = await supabase.from('Ubicaciones').select('*').limit(1);
    if (d1 && d1.length) console.log("Ubicaciones keys:", Object.keys(d1[0]));
    
    const { data: d2 } = await supabase.from('Consumidores').select('*').limit(1);
    if (d2 && d2.length) console.log("Consumidores keys:", Object.keys(d2[0]));
}
main();
