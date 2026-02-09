const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const envContent = fs.readFileSync('.env.local', 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
        envVars[key.trim()] = value.trim();
    }
});

const supabase = createClient(
    envVars['NEXT_PUBLIC_SUPABASE_URL'],
    envVars['NEXT_PUBLIC_SUPABASE_ANON_KEY']
);

async function check() {
    try {
        const { data, error } = await supabase.from('precioszonas').select('count', { count: 'exact', head: true });

        const content = `
Error: ${JSON.stringify(error)}
Count: ${data ? data.length : 'null'} (Head only)
        `;

        fs.writeFileSync('precios_debug.txt', content);

        const { data: rows, error: rowsError } = await supabase.from('precioszonas').select('*').limit(5);

        fs.appendFileSync('precios_debug.txt', `
Rows Error: ${JSON.stringify(rowsError)}
Rows Length: ${rows ? rows.length : 'null'}
First Row: ${rows && rows.length > 0 ? JSON.stringify(rows[0]) : 'None'}
        `);

    } catch (e) {
        fs.writeFileSync('precios_debug.txt', `EXCEPTION: ${e.message}`);
    }
}

check();
