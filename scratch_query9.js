const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
const supabase = createClient(env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1], env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1]);

async function main() {
    const { data: d2, error: e2 } = await supabase.from('registro_solicitudes').select(`
        *,
        Ubicaciones_1!registro_solicitudes_cliente_id_fkey(*),
        Consumidores!registro_solicitudes_cliente_final_id_fkey(*)
    `).limit(5);
    console.log("Error:", e2);
    if(d2 && d2.length) console.log("Ubicaciones keys:", d2[0].Ubicaciones_1 ? Object.keys(d2[0].Ubicaciones_1) : 'None');
    if(d2 && d2.length) console.log("Consumidores keys:", d2[0].Consumidores ? Object.keys(d2[0].Consumidores) : 'None');
}
main();
