
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testViews() {
    console.log('Testing query_ubicaciones...');
    const { data: ubicaciones, error: uError } = await supabase
        .from('query_ubicaciones')
        .select('*')
        .limit(1);

    if (uError) {
        console.error('Error query_ubicaciones:', uError);
    } else {
        console.log('Success query_ubicaciones. Columns:', ubicaciones.length > 0 ? Object.keys(ubicaciones[0]) : 'No data');
    }

    console.log('\nTesting query_consumidores...');
    const { data: consumidores, error: cError } = await supabase
        .from('query_consumidores')
        .select('*')
        .limit(1);

    if (cError) {
        console.error('Error query_consumidores:', cError);
    } else {
        console.log('Success query_consumidores. Columns:', consumidores.length > 0 ? Object.keys(consumidores[0]) : 'No data');
    }
}

testViews();
