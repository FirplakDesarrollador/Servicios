
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lnphhmowklqiomownurw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxucGhobW93a2xxaW9tb3dudXJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTIwMzQwMjUsImV4cCI6MjAwNzYxMDAyNX0.FHCOWrVp-K-7qrM3CtYmYaqiOqwzsX_Au7pLm-MN3eQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function listAll() {
    console.log('Attempting to list tables/views via clever queries...');

    // We can't use information_schema directly via PostgREST easily.
    // However, some Supabase setups have specific RPCs.

    // Let's try to query some standard views that PostgREST might expose
    const possibleNames = [
        'vista_servicios',
        'query_servicios_abiertos',
        'query_servicios_dashboard',
        'query_servicios_v2',
        'estados_servicios',
        'subestados_servicios'
    ];

    for (const name of possibleNames) {
        try {
            const { data, error } = await supabase.from(name).select('*').limit(1);
            if (!error) {
                console.log(`Found accessible source: ${name}`);
                if (data && data.length > 0) {
                    console.log(`Columns in ${name}:`, Object.keys(data[0]));
                }
            } else {
                // console.log(`Not found or error in ${name}: ${error.message}`);
            }
        } catch (e) { }
    }

    // Try to get column names of Servicios again, but with a trick
    // Maybe selecting a non-existent column will show valid ones in error?
    const { error: colError } = await supabase.from('Servicios').select('id, non_existent_column_123').limit(1);
    if (colError) {
        console.log('\nColumn Error Hint:');
        console.log(colError.message);
    }
}

listAll();
