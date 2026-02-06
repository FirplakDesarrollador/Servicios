
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lnphhmowklqiomownurw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxucGhobW93a2xxaW9tb3dudXJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTIwMzQwMjUsImV4cCI6MjAwNzYxMDAyNX0.FHCOWrVp-K-7qrM3CtYmYaqiOqwzsX_Au7pLm-MN3eQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testViews() {
    const viewsToTest = ['query_servicios', 'query_servicios_csv', 'vista_servicios'];

    for (const view of viewsToTest) {
        console.log(`\n--- Testing ${view} ---`);
        const { data, error } = await supabase
            .from(view)
            .select('*')
            .limit(1);

        if (error) {
            console.error(`Error ${view}:`, error.message);
        } else if (data && data.length > 0) {
            console.log(`Success ${view}. Columns:`, Object.keys(data[0]));
            console.log('Sample record:', JSON.stringify(data[0], null, 2));
        } else {
            console.log(`Success ${view}, but no data found.`);
        }
    }

    console.log('\n--- Testing raw Servicios table ---');
    const { data: raw, error: rError } = await supabase
        .from('Servicios')
        .select('*')
        .limit(1);
    if (rError) console.error('Error raw Servicios:', rError.message);
    else if (raw && raw.length > 0) {
        console.log('Success raw Servicios. Columns:', Object.keys(raw[0]));
        console.log('Sample record:', JSON.stringify(raw[0], null, 2));
    }
}

testViews();
