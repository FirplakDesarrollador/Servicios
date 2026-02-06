
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lnphhmowklqiomownurw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxucGhobW93a2xxaW9tb3dudXJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTIwMzQwMjUsImV4cCI6MjAwNzYxMDAyNX0.FHCOWrVp-K-7qrM3CtYmYaqiOqwzsX_Au7pLm-MN3eQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCsvView() {
    console.log('Inspecting query_servicios_csv...');
    const { data, error } = await supabase
        .from('query_servicios_csv')
        .select('*')
        .limit(5);

    if (error) {
        console.error('Error:', error.message);
        return;
    }

    console.log('Total records (limited):', data.length);
    if (data.length > 0) {
        console.log('Columns found:', Object.keys(data[0]));
        console.log('First record sample:', JSON.stringify(data[0], null, 2));
    } else {
        console.log('No data found in query_servicios_csv');
    }
}

checkCsvView();
