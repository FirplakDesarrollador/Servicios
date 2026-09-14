const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://lnphhmowklqiomownurw.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxucGhobW93a2xxaW9tb3dudXJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTIwMzQwMjUsImV4cCI6MjAwNzYxMDAyNX0.FHCOWrVp-K-7qrM3CtYmYaqiOqwzsX_Au7pLm-MN3eQ'
);

async function test() {
    const { count: countAbiertos } = await supabase
        .from('query_servicios')
        .select('*', { count: 'exact', head: true })
        .eq('estado', true);
        
    const { count: countTodos } = await supabase
        .from('query_servicios')
        .select('*', { count: 'exact', head: true });

    console.log('Total abiertos:', countAbiertos);
    console.log('Total general:', countTodos);
}

test();
