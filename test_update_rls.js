const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const content = fs.readFileSync('.env', 'utf8');
content.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
        let val = match[2] || '';
        val = val.replace(/^['"]|['"]$/g, '').trim();
        process.env[match[1]] = val;
    }
});

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
    const { data, error } = await supabase.from('registro_solicitudes').update({ fecha_cierre: null }).eq('id', 54).select();
    console.log({data, error});
}
run();
