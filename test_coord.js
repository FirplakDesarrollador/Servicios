const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const envConfig = fs.readFileSync('.env', 'utf-8').split('\n').filter(line => line.trim() && !line.startsWith('#')).reduce((acc, line) => { const [key, ...val] = line.split('='); acc[key.trim()] = val.join('=').trim().replace(/^"|"$/g, '').replace(/^'|'$/g, ''); return acc; }, {});
const supabase = createClient(envConfig.NEXT_PUBLIC_SUPABASE_URL, envConfig.NEXT_PUBLIC_SUPABASE_ANON_KEY);
(async () => {
    const { data, error } = await supabase.from('Servicios').select('coordinador_id').not('coordinador_id', 'is', null).limit(10);
    console.log('Servicios:', data, error);
})();
