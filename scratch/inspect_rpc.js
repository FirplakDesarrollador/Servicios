const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lnphhmowklqiomownurw.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxucGhobW93a2xxaW9tb3dudXJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTY5MjAzNDAyNSwiZXhwIjoyMDA3NjEwMDI1fQ.J-2EWGSL4Gro06MYBFVLQNnjbeDGYqjeLy1x8SdR2ms';
const supabase = createClient(supabaseUrl, serviceKey);

async function inspectRpc() {
    const { data, error } = await supabase.rpc('get_function_def', { func_name: 'create_service_with_details' });
    if (error) {
        // query pg_proc directly via postgres or check other rpcs
        console.log("Could not get via get_function_def, checking views/definitions...");
    } else {
        console.log("RPC definition:", data);
    }
}

inspectRpc();
