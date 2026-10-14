import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envConfig = fs.readFileSync('.env', 'utf-8')
    .split('\n')
    .filter(line => line.trim() && !line.startsWith('#'))
    .reduce((acc, line) => {
        const [key, ...val] = line.split('=');
        acc[key.trim()] = val.join('=').trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '');
        return acc;
    }, {});

// Initialize Supabase client with the Service Role Key for admin tasks
const supabase = createClient(
  envConfig.NEXT_PUBLIC_SUPABASE_URL,
  envConfig.SUPABASE_SERVICE_ROLE_KEY || envConfig.NEXT_PUBLIC_SUPABASE_ANON_KEY // fallback just in case, though auth admin requires service_role
);

async function main() {
    // 1. Get the user from public.Usuarios to find the Auth user_id
    const { data: userData, error: userError } = await supabase
        .from('Usuarios')
        .select('user_id')
        .eq('correo', 'blanca.ordonez@firplak.com')
        .single();
        
    if (userError || !userData) {
        console.log("Error finding user:", userError);
        return;
    }
    
    console.log("Found user ID:", userData.user_id);
    
    // 2. Change password using Auth Admin API
    const { data, error } = await supabase.auth.admin.updateUserById(
      userData.user_id,
      { password: 'Neggan123' }
    );
    
    if (error) {
        console.log("Error updating password:", error);
    } else {
        console.log("Password updated successfully:", data.user.id);
    }
}

main();
