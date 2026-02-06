
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lnphhmowklqiomownurw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxucGhobW93a2xxaW9tb3dudXJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTIwMzQwMjUsImV4cCI6MjAwNzYxMDAyNX0.FHCOWrVp-K-7qrM3CtYmYaqiOqwzsX_Au7pLm-MN3eQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function getColumns() {
    console.log('Querying information_schema for Servicios columns...');

    // Supabase REST doesn't directly support information_schema easily unless a RPC is defined.
    // But we can try to guess or use a clever query if possible.
    // Actually, let's just try to fetch 1 record from Servicios and query_servicios and use a different approach.

    // If I can't query information_schema, I'll try to find a record by consecutivo from the screenshot.
    const consecutivo = 'LuzMarGara15868';
    console.log(`Searching for service with consecutivo: ${consecutivo}`);

    const { data, error } = await supabase
        .from('Servicios')
        .select('*')
        .eq('consecutivo', consecutivo);

    if (error) {
        console.error('Error:', error.message);
    } else if (data && data.length > 0) {
        console.log('Found record in Servicios:');
        console.log(JSON.stringify(data[0], null, 2));
    } else {
        console.log('Record not found in Servicios table using anon key.');
    }

    // Try view
    const { data: vData, error: vError } = await supabase
        .from('query_servicios')
        .select('*')
        .eq('consecutivo', consecutivo);

    if (vError) {
        console.error('View Error:', vError.message);
    } else if (vData && vData.length > 0) {
        console.log('\nFound record in query_servicios view:');
        console.log(JSON.stringify(vData[0], null, 2));
    } else {
        console.log('Record not found in query_servicios view using anon key.');
    }
}

getColumns();
