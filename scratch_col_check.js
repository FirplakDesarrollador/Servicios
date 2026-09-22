const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env', 'utf8');
const SUPABASE_URL = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const SUPABASE_KEY = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1].trim();

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
    const res = await supabase.from('registro_solicitudes').select('*').limit(1);
    
    // Instead of selecting rows, use a simple RPC or just use an invalid insert to get the error if we want?
    // Wait, let's just make a REST call to Supabase to fetch OpenAPI schema which contains all columns!
    const response = await fetch(`${SUPABASE_URL}/rest/v1/?apikey=${SUPABASE_KEY}`);
    const json = await response.json();
    const columns = json.definitions.registro_solicitudes.properties;
    console.log("Columns:", Object.keys(columns));
}
main();
