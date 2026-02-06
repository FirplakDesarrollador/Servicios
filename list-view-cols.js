
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://lnphhmowklqiomownurw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxucGhobW93a2xxaW9tb3dudXJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTIwMzQwMjUsImV4cCI6MjAwNzYxMDAyNX0.FHCOWrVp-K-7qrM3CtYmYaqiOqwzsX_Au7pLm-MN3eQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function listColumns() {
    const { data, error } = await supabase.from('query_servicios').select('*').limit(1);
    if (error) {
        fs.writeFileSync('columns.txt', 'Error: ' + error.message);
        return;
    }
    if (data && data.length > 0) {
        const cols = Object.keys(data[0]);
        fs.writeFileSync('columns.txt', 'Columns in query_servicios:\n' + cols.join('\n'));
        console.log('Columns written to columns.txt');
    } else {
        fs.writeFileSync('columns.txt', 'No data found in query_servicios');
    }
}

listColumns();
