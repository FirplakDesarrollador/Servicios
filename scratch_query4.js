const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
const SUPABASE_URL = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1];
const SUPABASE_KEY = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1];

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
    const { data: d2, error } = await supabase.from('registro_solicitudes').select('*, Ubicaciones:cliente_id(*), Consumidores:cliente_final_id(*)').not('cliente_id', 'is', null).limit(1);
    if (error) console.log(error);
    if(d2 && d2.length) {
        console.log("Ubi:", d2[0].Ubicaciones);
        console.log("Cons:", d2[0].Consumidores);
    } else {
        console.log("No data");
    }
}
main();
