require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
async function run() {
    const { data, error } = await supabase.from('registro_solicitudes').select('*').limit(1);
    if(error) console.error(error);
    else console.log(Object.keys(data[0] || {}));
}
run();
