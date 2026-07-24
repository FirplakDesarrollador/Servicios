const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
const SUPABASE_URL = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1];
const SUPABASE_KEY = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1];

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
    // We can execute SQL query via rpc if exists, but we can't.
    // Let's just query Ubicaciones_1 and Consumidores directly.
    const { data: d1, error: e1 } = await supabase.from('Ubicaciones_1').select('*').limit(1);
    console.log("Ubicaciones_1 error:", e1);
    const { data: d2, error: e2 } = await supabase.from('Consumidores').select('*').limit(1);
    console.log("Consumidores error:", e2);
}
main();
