const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lnphhmowklqiomownurw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxucGhobW93a2xxaW9tb3dudXJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTIwMzQwMjUsImV4cCI6MjAwNzYxMDAyNX0.FHCOWrVp-K-7qrM3CtYmYaqiOqwzsX_Au7pLm-MN3eQ';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    // Check recent comments
    const { data: comments, error } = await supabase
        .from('Comentarios')
        .select('*')
        .order('id', { ascending: false })
        .limit(10);
        
    console.log("Recent Comentarios:", JSON.stringify(comments, null, 2));

    // Check service details for 11403 and 11404
    const { data: s1 } = await supabase.from('Servicios').select('*, Ubicaciones(*)').eq('id', 11403);
    const { data: s2 } = await supabase.from('Servicios').select('*, Ubicaciones(*)').eq('id', 11404);
    console.log("S1 (11403):", JSON.stringify(s1, null, 2));
    console.log("S2 (11404):", JSON.stringify(s2, null, 2));
}

run();
