import fs from 'fs';
const env = fs.readFileSync('.env', 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1].trim();
fetch(`${url}/rest/v1/?apikey=${key}`).then(r => r.json()).then(d => {
    const table = d.definitions.Servicios;
    console.log(Object.keys(table.properties).filter(k => k.includes('mac')));
}).catch(console.error);
