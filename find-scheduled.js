
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lnphhmowklqiomownurw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxucGhobW93a2xxaW9tb3dudXJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTIwMzQwMjUsImV4cCI6MjAwNzYxMDAyNX0.FHCOWrVp-K-7qrM3CtYmYaqiOqwzsX_Au7pLm-MN3eQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function findScheduledService() {
    console.log('Searching for a service that looks scheduled...');

    // We try to find one that has a technician assigned in the raw table first
    const { data: rawData, error: rawError } = await supabase
        .from('Servicios')
        .select('*')
        .not('tecnico_id', 'is', null)
        .limit(1);

    if (rawError) {
        console.error('Error fetching raw data:', rawError.message);
    } else if (rawData && rawData.length > 0) {
        console.log('Found record in Servicios table:');
        console.log(JSON.stringify(rawData[0], null, 2));
    } else {
        console.log('No services with tecnico_id found in Servicios table.');
    }

    // Try in query_servicios
    const { data: viewData, error: viewError } = await supabase
        .from('query_servicios')
        .select('*')
        .not('tecnico_nombre', 'is', null)
        .limit(1);

    if (viewError) {
        console.error('Error fetching view data:', viewError.message);
    } else if (viewData && viewData.length > 0) {
        console.log('\nFound record in query_servicios view:');
        console.log(JSON.stringify(viewData[0], null, 2));
    } else {
        console.log('No services with tecnico_nombre found in query_servicios.');
    }
}

findScheduledService();
