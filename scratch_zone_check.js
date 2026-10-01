const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env', 'utf8');
const SUPABASE_URL = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const SUPABASE_KEY = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1].trim();

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
    // 1. Fetch the service from the screenshot: SER-17121 or something similar.
    // The image shows: EstMuñGara38594 as the consecutivo
    const { data: registro } = await supabase.from('registro_solicitudes').select('*, Ubicaciones:cliente_id(*), Consumidores:cliente_final_id(*)').order('id', { ascending: false }).limit(1).single();
    
    if (!registro) {
        console.log("No registro found!");
        return;
    }
    
    console.log("Registro Ubicaciones zona:", registro.Ubicaciones?.zona_id);
    console.log("Registro Consumidores zona:", registro.Consumidores?.zona_id);
    
    let finalCoordinadorId = null;
    const ubi = registro.Ubicaciones || {};
    const cons = registro.Consumidores || {};
    let zoneId = cons?.zona_id || ubi?.zona_id;
    console.log("Resolved zoneId:", zoneId);
    
    if (zoneId) {
        const { data: zonaData } = await supabase.from('Zonas').select('coordinador_id').eq('id', zoneId).single();
        console.log("zonaData:", zonaData);
        if (zonaData) {
            finalCoordinadorId = zonaData.coordinador_id;
        }
    }
    console.log("Final Coordinador:", finalCoordinadorId);
}
main();
