const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

function loadEnv() {
  const envFiles = ['.env.local', '.env'];
  for (const file of envFiles) {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf8');
      content.split('\n').forEach(line => {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
          let val = match[2] || '';
          val = val.replace(/^['"]|['"]$/g, '').trim();
          process.env[match[1]] = val;
        }
      });
    }
  }
}

loadEnv();
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function test() {
    const { data, error } = await supabase.rpc('get_tables');
    console.log("RPC tables:", data || error);
    
    // Alternative: Try to query one row from all known tables
    const tables = [
        'defectos', 'razones_queja', 'Tipo_Problema', 'tipo_problemas', 
        'Defectos', 'Problemas', 'problemas', 'Tipo_problema'
    ];
    
    for (const t of tables) {
        const res = await supabase.from(t).select('*').limit(1);
        if (!res.error) {
            console.log(`Table ${t} exists and has ${res.data.length} records.`);
            console.log(res.data);
        } else {
            console.log(`Table ${t} error:`, res.error.message);
        }
    }
}
test();
