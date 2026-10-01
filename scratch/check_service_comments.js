const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lnphhmowklqiomownurw.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxucGhobW93a2xxaW9tb3dudXJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTY5MjAzNDAyNSwiZXhwIjoyMDA3NjEwMDI1fQ.J-2EWGSL4Gro06MYBFVLQNnjbeDGYqjeLy1x8SdR2ms';
const supabase = createClient(supabaseUrl, serviceKey);

async function run() {
    const s1 = 11403; // FEdiPorInst29374
    const s2 = 11404; // FEdiPorInst28263
    
    console.log("Checking comments with service role key:");
    const { data: c1 } = await supabase.from('Comentarios').select('*').eq('servicio_id', s1);
    console.log(`Comentarios for ${s1}:`, c1);

    const { data: c2 } = await supabase.from('Comentarios').select('*').eq('servicio_id', s2);
    console.log(`Comentarios for ${s2}:`, c2);

    // Let's also check other recent comments to see structure
    const { data: recentC } = await supabase.from('Comentarios').select('*').order('id', { ascending: false }).limit(5);
    console.log("Recent 5 comentarios in DB:", JSON.stringify(recentC, null, 2));
}

run();
