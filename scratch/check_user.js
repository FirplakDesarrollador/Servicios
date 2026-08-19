const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const envFile = fs.readFileSync('.env', 'utf8');
const env = {};
envFile.split(/\r?\n/).forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) env[match[1].trim()] = match[2].trim().replace(/^"|"$/g, '');
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function main() {
    const { data: usuario, error } = await supabase.from('Usuarios').select('*').eq('correo', 'blanca.ordonez@firplak.com').single();
    if (error) {
        console.error("Error:", error);
    } else {
        console.log("Usuario encontrado:", usuario);
    }
}

main();
