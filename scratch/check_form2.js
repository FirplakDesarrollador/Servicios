const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lnphhmowklqiomownurw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxucGhobW93a2xxaW9tb3dudXJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTIwMzQwMjUsImV4cCI6MjAwNzYxMDAyNX0.FHCOWrVp-K-7qrM3CtYmYaqiOqwzsX_Au7pLm-MN3eQ';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data: tables, error: errTables } = await supabase
        .from('Formulario_Cliente')
        .select('*')
        .eq('consecutivo', 'FEdiPorInst54568');
        
    console.log("Formulario_Cliente FEdiPorInst54568:", JSON.stringify(tables, null, 2));

    const { data: other, error: errOther } = await supabase
        .from('Formulario_Cliente')
        .select('consecutivo, documentos')
        .neq('consecutivo', 'FEdiPorInst54568')
        .limit(2);
        
    console.log("Other:", JSON.stringify(other, null, 2));
}

run();
