const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
const SUPABASE_URL = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1];
const SUPABASE_KEY = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1];

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
    const { data: d1, error: e1 } = await supabase.from('registro_solicitudes').select(`
        *,
        cliente:cliente_id(direccion, telefono1, telefono, ciudad:ciudades(ciudad)),
        cliente_final:cliente_final_id(direccion, telefono1, telefono, celular, ciudad)
    `).limit(1);
    console.log("Error:", e1 ? e1.message : null);
    console.log("Hint:", e1 ? e1.hint : null);
    
    if (d1) console.log(d1);
}
main();
