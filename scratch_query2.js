const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
const SUPABASE_URL = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1];
const SUPABASE_KEY = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1];

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
    const { data: d2, error: e2 } = await supabase.from('registro_solicitudes').select(`
        *,
        Clientes:cliente_id(*),
        Consumidores:cliente_final_id(*)
    `).limit(5);
    console.log("Error 2:", e2 ? e2.message : null);
    if (d2 && d2.length > 0) {
        console.log("Data 2 Client:", d2[0].Clientes);
        console.log("Data 2 Consumer:", d2[0].Consumidores);
    } else {
        console.log("No data");
    }
}
main();
