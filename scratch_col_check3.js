import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const envConfig = fs.readFileSync('.env', 'utf-8').split('\n').filter(line => line.trim() && !line.startsWith('#')).reduce((acc, line) => { const [key, ...val] = line.split('='); acc[key.trim()] = val.join('=').trim().replace(/^"|"$/g, '').replace(/^'|'$/g, ''); return acc; }, {});
const supabase = createClient(envConfig.NEXT_PUBLIC_SUPABASE_URL, envConfig.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function main() {
    const { data } = await supabase.from('query_servicios').select('*').limit(1);
    console.log(Object.keys(data[0] || {}));
}
main();
