const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
const supabase = createClient(env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1], env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1]);

async function main() {
    const { data: d2 } = await supabase.from('registro_solicitudes').select(`*, Ubicaciones:cliente_id(*), Consumidores:cliente_final_id(*)`).limit(5);
    console.log("Data keys for Ubicaciones:", d2 && d2[0] && d2[0].Ubicaciones ? Object.keys(d2[0].Ubicaciones) : 'None');
    if (d2 && d2[0] && d2[0].Ubicaciones) console.log(d2[0].Ubicaciones);
    if (d2 && d2[0] && d2[0].Consumidores) console.log(d2[0].Consumidores);
}
main();
