const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/);
const url = urlMatch[1].trim().replace(/^"|"$/g, '');
const key = keyMatch[1].trim().replace(/^"|"$/g, '');

fetch(`${url}/rest/v1/Neg_base?select=*&limit=1`, {
  headers: {
    'apikey': key,
    'Authorization': `Bearer ${key}`
  }
})
  .then(r => r.json())
  .then(j => console.log('Neg_base row:', j))
  .catch(console.error);
