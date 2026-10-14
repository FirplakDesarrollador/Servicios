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
    const { data: usuarios, error } = await supabase.from('Usuarios').select('id, nombres, apellidos, correo, rol');
    if (error) {
        console.error("Error:", error);
    } else {
        const favio = usuarios.filter(u => u.nombres?.toLowerCase().includes('favio') || u.nombres?.toLowerCase().includes('fabio') || u.apellidos?.toLowerCase().includes('favio') || u.apellidos?.toLowerCase().includes('fabio'));
        const servicio = usuarios.filter(u => u.nombres?.toLowerCase().includes('servicio') || u.apellidos?.toLowerCase().includes('servicio') || u.nombres?.toLowerCase().includes('cliente'));
        console.log("Favio:", favio);
        console.log("Servicio:", servicio);
    }
}

main();
