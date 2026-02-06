
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lnphhmowklqiomownurw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxucGhobW93a2xxaW9tb3dudXJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTIwMzQwMjUsImV4cCI6MjAwNzYxMDAyNX0.FHCOWrVp-K-7qrM3CtYmYaqiOqwzsX_Au7pLm-MN3eQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStatusValues() {
    console.log('Checking unique values for estado_agendamiento in query_servicios...');
    const { data, error } = await supabase
        .from('query_servicios')
        .select('estado_agendamiento');

    if (error) {
        console.error('Error fetching data:', error.message);
        return;
    }

    const uniqueStatuses = [...new Set(data.map(item => item.estado_agendamiento))];
    console.log('Unique statuses found:', uniqueStatuses);

    // Also check raw Servicios table just in case
    const { data: rawData, error: rawError } = await supabase
        .from('Servicios')
        .select('estado_agendamiento');

    if (!rawError) {
        const uniqueRawStatuses = [...new Set(rawData.map(item => item.estado_agendamiento))];
        console.log('Unique statuses in raw Servicios table:', uniqueRawStatuses);
    }
}

checkStatusValues();
