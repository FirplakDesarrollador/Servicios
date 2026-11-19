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
    // 1. Login
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: 'blanca.ordonez@firplak.com',
        password: 'Neggan123'
    });

    if (authError) {
        console.error("Auth error:", authError);
        return;
    }
    console.log("Logged in!");

    // 2. Fetch Zonas to find Centro
    const { data: zonas, error: zonasError } = await supabase.from('Zonas').select('*');
    if (zonasError) {
        console.error("Zonas error:", zonasError);
        return;
    }
    
    console.log("Zonas found:", zonas);

    const centro = zonas.find(z => z.zona && z.zona.toLowerCase().includes('centro'));
    console.log("Zona Centro:", centro);

    if (centro) {
        // 3. Update coordinador_id to 40 (Fabio)
        const { data: updateData, error: updateError } = await supabase.from('Zonas')
            .update({ coordinador_id: 40 })
            .eq('id', centro.id)
            .select();
            
        if (updateError) {
            console.error("Update error:", updateError);
        } else {
            console.log("Update success:", updateData);
        }
    } else {
        console.log("No zona centro found!");
    }
}

main();
