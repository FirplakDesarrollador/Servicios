const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lnphhmowklqiomownurw.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxucGhobW93a2xxaW9tb3dudXJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTY5MjAzNDAyNSwiZXhwIjoyMDA3NjEwMDI1fQ.J-2EWGSL4Gro06MYBFVLQNnjbeDGYqjeLy1x8SdR2ms';
const supabase = createClient(supabaseUrl, serviceKey);

async function check() {
    const { data: s } = await supabase
        .from('Servicios')
        .select('id, consecutivo, sharepoint_uid, created_at')
        .in('consecutivo', ['FEdiPorInst29374', 'FEdiPorInst28263']);
        
    console.log("Services status:", s);

    const { data: c } = await supabase
        .from('Comentarios')
        .select('id, servicio_id, documentos')
        .in('servicio_id', [11403, 11404]);
    console.log("Comments status:", c);
}

check();
