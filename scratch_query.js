const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function main() {
    const { data, error } = await supabase.from('registro_solicitudes').select('*, c:cliente_id(*), cf:cliente_final_id(*)').limit(1);
    console.log("Error:", error);
    console.log("Data:", data);
}
main();
