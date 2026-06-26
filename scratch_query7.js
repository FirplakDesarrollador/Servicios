const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
const SUPABASE_URL = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1];
const SUPABASE_KEY = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1];

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
    const { data: d1 } = await supabase.from('registro_solicitudes').select('*').limit(1);
    if (d1 && d1.length) console.log("registro_solicitudes keys:", Object.keys(d1[0]));
}
main();
