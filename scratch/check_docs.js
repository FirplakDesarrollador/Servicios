const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lnphhmowklqiomownurw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxucGhobW93a2xxaW9tb3dudXJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTIwMzQwMjUsImV4cCI6MjAwNzYxMDAyNX0.FHCOWrVp-K-7qrM3CtYmYaqiOqwzsX_Au7pLm-MN3eQ';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data: servicios, error: errServicios } = await supabase
        .from('Servicios')
        .select('id')
        .eq('consecutivo', 'FEdiPorInst54568');
        
    if (errServicios) {
        console.error('Error fetching servicio:', errServicios);
        return;
    }
    
    if (servicios.length > 0) {
        const id = servicios[0].id;
        console.log("Servicio ID:", id);
        
        const { data: comentarios, error: errComentarios } = await supabase
            .from('Comentarios')
            .select('*')
            .eq('servicio_id', id);
            
        console.log("Comentarios para este servicio:", JSON.stringify(comentarios, null, 2));
    }
}

run();
