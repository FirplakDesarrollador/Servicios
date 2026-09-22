const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);
const supabase = createClient(urlMatch[1], keyMatch[1]);

async function main() {
    const { data: c } = await supabase.from('Clientes').select('*').limit(1);
    console.log("Clientes cols:", c && c[0] ? Object.keys(c[0]) : c);
    
    const { data: s } = await supabase.from('query_servicios').select('*').limit(1);
    console.log("query_servicios cols:", s && s[0] ? Object.keys(s[0]) : s);
}
main();
