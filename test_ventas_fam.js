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

supabase.from('Ventas').select('familia').limit(50000).then(({ data, error }) => {
    if (error) {
        console.error(error);
        return;
    }
    const fams = new Set(data.map(d => d.familia));
    console.log([...fams]);
});
