const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/);

async function main() {
    const res = await fetch(`${urlMatch[1]}/rest/v1/?apikey=${keyMatch[1]}`);
    const json = await res.json();
    console.log("Clientes:", Object.keys(json.definitions.Clientes.properties));
    console.log("query_servicios:", Object.keys(json.definitions.query_servicios.properties));
}
main();
