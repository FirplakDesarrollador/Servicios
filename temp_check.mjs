import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envConfig = fs.readFileSync('.env', 'utf-8')
    .split('\n')
    .filter(line => line.trim() && !line.startsWith('#'))
    .reduce((acc, line) => {
        const [key, ...val] = line.split('=');
        acc[key.trim()] = val.join('=').trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '');
        return acc;
    }, {});

const supabase = createClient(
  envConfig.NEXT_PUBLIC_SUPABASE_URL,
  envConfig.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function main() {
    const { data: solAll, error: e3 } = await supabase.from('solicitudes_clientes')
        .select('*')
        .ilike('consecutivo', '%KelDuqRepa70164%');
    
    if (e3) {
       console.log("sol err:", e3);
    } else {
       console.log("sol match:", solAll);
    }
}
main();
