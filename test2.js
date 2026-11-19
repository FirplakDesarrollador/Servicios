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
    const { data } = await supabase.from('registro_solicitudes').select('id, valor_servicio, valor_flete, valor_producto').limit(500);
    let count1 = 0;
    data.forEach(r => {
        if (r.valor_servicio === 1 || r.valor_flete === 1 || r.valor_producto === 1) count1++;
        if (r.valor_servicio === '1' || r.valor_flete === '1' || r.valor_producto === '1') count1++;
    });
    console.log(`Found ${count1} records with 1 directly.`);

    // check inside productos_novedad JSON?
    const { data: data2 } = await supabase.from('registro_solicitudes').select('id, productos_novedad').not('productos_novedad', 'is', null);
    let count2 = 0;
    data2.forEach(r => {
        let hasOne = false;
        if (Array.isArray(r.productos_novedad)) {
            r.productos_novedad.forEach(p => {
                if (p.valor === 1 || p.valor === '1') hasOne = true;
                if (p.valor_unitario === 1 || p.valor_unitario === '1') hasOne = true;
            });
        }
        if (hasOne) count2++;
    });
    console.log(`Found ${count2} records with 1 inside productos_novedad.`);
}
test();
