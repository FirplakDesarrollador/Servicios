const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lnphhmowklqiomownurw.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxucGhobW93a2xxaW9tb3dudXJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTY5MjAzNDAyNSwiZXhwIjoyMDA3NjEwMDI1fQ.J-2EWGSL4Gro06MYBFVLQNnjbeDGYqjeLy1x8SdR2ms';
const supabase = createClient(supabaseUrl, serviceKey);

async function checkEdison() {
    // Check Edison user info
    const { data: user } = await supabase.from('Usuarios').select('*').eq('id', 59).single();
    console.log("Edison user info:", user);

    // Check Edison's services
    const { data: edisonServices } = await supabase
        .from('Servicios')
        .select('id, consecutivo, tipo_de_servicio, canal_de_venta, creado_desde, created_at')
        .eq('comercial_id', 59)
        .order('id', { ascending: false })
        .limit(10);
    console.log("Edison's last 10 services:", edisonServices);

    // Check how many services from Edison had comments with attachments vs without attachments
    for (const s of edisonServices) {
        const { data: c } = await supabase.from('Comentarios').select('id, contenido, documentos').eq('servicio_id', s.id);
        console.log(`Service ${s.consecutivo} (${s.tipo_de_servicio}):`, c);
    }
}

checkEdison();
