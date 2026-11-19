const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lnphhmowklqiomownurw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxucGhobW93a2xxaW9tb3dudXJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTIwMzQwMjUsImV4cCI6MjAwNzYxMDAyNX0.FHCOWrVp-K-7qrM3CtYmYaqiOqwzsX_Au7pLm-MN3eQ';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRadicados() {
    const c1 = 'FEdiPorInst29374';
    const c2 = 'FEdiPorInst28263';

    for (const c of [c1, c2]) {
        console.log(`\n=== checking registro_solicitudes for ${c} ===`);
        const { data: rads, error: errRad } = await supabase
            .from('registro_solicitudes')
            .select('*')
            .ilike('servicio_creado_consecutivo', `%${c}%`);
        console.log("registro_solicitudes:", JSON.stringify(rads, null, 2));

        // also check if there is a radicado where consecutivo matches
        const { data: rads2 } = await supabase
            .from('registro_solicitudes')
            .select('*')
            .eq('consecutivo', c);
        console.log("by consecutivo:", JSON.stringify(rads2, null, 2));
    }
}

checkRadicados();
