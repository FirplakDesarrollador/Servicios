const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lnphhmowklqiomownurw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxucGhobW93a2xxaW9tb3dudXJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTIwMzQwMjUsImV4cCI6MjAwNzYxMDAyNX0.FHCOWrVp-K-7qrM3CtYmYaqiOqwzsX_Au7pLm-MN3eQ';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    // Buscar en formulario_cliente con el consecutivo
    const { data: formCliente, error: errForm } = await supabase
        .from('formulario_cliente')
        .select('*')
        .eq('consecutivo', 'FEdiPorInst54568');
        
    console.log("formulario_cliente para FEdiPorInst54568:", JSON.stringify(formCliente, null, 2));
    
    // Buscar otro servicio que SI haya funcionado para comparar
    const { data: formOtro, error: errOtro } = await supabase
        .from('formulario_cliente')
        .select('consecutivo, documentos')
        .neq('consecutivo', 'FEdiPorInst54568')
        .not('documentos', 'is', null)
        .limit(1);
        
    console.log("Otro formulario_cliente (referencia):", JSON.stringify(formOtro, null, 2));
}

run();
