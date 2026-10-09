const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lnphhmowklqiomownurw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxucGhobW93a2xxaW9tb3dudXJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTIwMzQwMjUsImV4cCI6MjAwNzYxMDAyNX0.FHCOWrVp-K-7qrM3CtYmYaqiOqwzsX_Au7pLm-MN3eQ';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    // Get last 5 services created by Edison
    const { data: servicios, error } = await supabase
        .from('Servicios')
        .select('id, consecutivo')
        .eq('comercial_id', 59)
        .order('id', { ascending: false })
        .limit(5);
        
    console.log("Servicios de Edison:", servicios);
    
    for (const s of servicios) {
        const { data: comments } = await supabase
            .from('Comentarios')
            .select('id, contenido, documentos')
            .eq('servicio_id', s.id);
            
        console.log(`Comentarios para ${s.consecutivo}:`, comments.length);
    }
}

run();
