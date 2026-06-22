const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
const SUPABASE_URL = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1];
const SUPABASE_KEY = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1];

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
    const { data: d2 } = await supabase.from('registro_solicitudes').select(`*, cliente:cliente_id(*)`).not('cliente_id', 'is', null).limit(1);
    if(d2 && d2.length) {
        console.log("Cliente fields:", Object.keys(d2[0].cliente));
        console.log("Cliente data:", d2[0].cliente);
    } else {
        console.log("No data");
    }
}
main();
