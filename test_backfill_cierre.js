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

async function check() {
    const { data, error } = await supabase
        .from('registro_solicitudes')
        .select('*')
        .limit(1);
    
    console.log('Error:', error);
    if (data && data.length > 0) {
        console.log('Columns:', Object.keys(data[0]));
    }
}

check();
