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
    console.log("Checking valor_servicio...");
    const svc1 = await supabase.from('registro_solicitudes').select('id, valor_servicio').eq('valor_servicio', 1);
    console.log("SVC 1:", svc1.data?.length);
    
    const svcStr1 = await supabase.from('registro_solicitudes').select('id, valor_servicio').eq('valor_servicio', '1');
    console.log("SVC '1':", svcStr1.data?.length);

    // Let's get any record with valor_servicio <= 1
    const svcLow = await supabase.from('registro_solicitudes').select('id, valor_servicio').lte('valor_servicio', 1).gt('valor_servicio', 0).limit(5);
    console.log("SVC low:", svcLow.data);
}
test();
