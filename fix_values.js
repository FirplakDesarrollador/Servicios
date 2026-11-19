const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Simple env parser since we just need 2 vars
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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log('Fetching records with value = 1...');
    let totalUpdated = 0;
    
    // valor_servicio
    const { data: svcData, error: svcErr } = await supabase.from('registro_solicitudes').select('id, valor_servicio').eq('valor_servicio', 1);
    if (svcErr) { console.error("Error fetching valor_servicio:", svcErr); }
    else if (svcData && svcData.length > 0) {
        console.log(`Found ${svcData.length} records with valor_servicio = 1`);
        const { error } = await supabase.from('registro_solicitudes').update({ valor_servicio: 0 }).in('id', svcData.map(r => r.id));
        if (error) console.error("Update error:", error);
        else totalUpdated += svcData.length;
    }

    // valor_flete
    const { data: fleteData, error: fleteErr } = await supabase.from('registro_solicitudes').select('id, valor_flete').eq('valor_flete', 1);
    if (fleteErr) { console.error("Error fetching valor_flete:", fleteErr); }
    else if (fleteData && fleteData.length > 0) {
        console.log(`Found ${fleteData.length} records with valor_flete = 1`);
        const { error } = await supabase.from('registro_solicitudes').update({ valor_flete: 0 }).in('id', fleteData.map(r => r.id));
        if (error) console.error("Update error:", error);
        else totalUpdated += fleteData.length;
    }

    // valor_producto
    const { data: prodData, error: prodErr } = await supabase.from('registro_solicitudes').select('id, valor_producto').eq('valor_producto', 1);
    if (prodErr) { console.error("Error fetching valor_producto:", prodErr); }
    else if (prodData && prodData.length > 0) {
        console.log(`Found ${prodData.length} records with valor_producto = 1`);
        const { error } = await supabase.from('registro_solicitudes').update({ valor_producto: 0 }).in('id', prodData.map(r => r.id));
        if (error) console.error("Update error:", error);
        else totalUpdated += prodData.length;
    }

    console.log(`Done. Updated ${totalUpdated} fields to 0.`);
}
main();
