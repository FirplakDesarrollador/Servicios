const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lnphhmowklqiomownurw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxucGhobW93a2xxaW9tb3dudXJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTIwMzQwMjUsImV4cCI6MjAwNzYxMDAyNX0.FHCOWrVp-K-7qrM3CtYmYaqiOqwzsX_Au7pLm-MN3eQ';
const supabase = createClient(supabaseUrl, supabaseKey);

async function findComments() {
    // Check various services
    const testIds = [11402, 11401, 11400, 11399, 11343, 11335];
    for (const id of testIds) {
        const { data: c } = await supabase.from('Comentarios').select('*').eq('servicio_id', id);
        console.log(`Comentarios for servicio_id ${id}:`, c);
    }
}

findComments();
