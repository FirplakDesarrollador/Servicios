const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lnphhmowklqiomownurw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxucGhobW93a2xxaW9tb3dudXJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTIwMzQwMjUsImV4cCI6MjAwNzYxMDAyNX0.FHCOWrVp-K-7qrM3CtYmYaqiOqwzsX_Au7pLm-MN3eQ';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    // let's try to query without single to avoid 406 or similar errors causing null
    const { data: ubi, error } = await supabase
        .from('Ubicaciones')
        .select('*')
        .eq('id', 3119);
        
    console.log('Ubicacion array:', ubi);
    
    // Also, query what emails are on this service. Maybe Power Automate looks at a different view, like 'vista_power_automate'?
    const { data: vw } = await supabase.from('vista_servicios_detallados').select('*').limit(1).catch(()=>({data:null}));
    console.log('View existence check:', vw ? 'exists' : 'no');
}

run();
