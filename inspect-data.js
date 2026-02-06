
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lnphhmowklqiomownurw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxucGhobW93a2xxaW9tb3dudXJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTIwMzQwMjUsImV4cCI6MjAwNzYxMDAyNX0.FHCOWrVp-K-7qrM3CtYmYaqiOqwzsX_Au7pLm-MN3eQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectData() {
    console.log('Inspecting query_servicios...');
    const { data, error } = await supabase
        .from('query_servicios')
        .select('*');

    if (error) {
        console.error('Error:', error.message);
        return;
    }

    console.log('Total records:', data.length);
    if (data.length > 0) {
        console.log('Columns found:', Object.keys(data[0]));
        console.log('First 3 records sample:');
        console.log(JSON.stringify(data.slice(0, 3), null, 2));

        const statuses = [...new Set(data.map(i => i.estado_agendamiento))];
        console.log('Unique estado_agendamiento values:', statuses);
    } else {
        console.log('No data found in query_servicios');
    }
}

inspectData();
