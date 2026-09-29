import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Cliente admin para uso exclusivo en el servidor (rutas API, cron jobs).
// Nunca importar esto desde código de cliente: la service_role key evade RLS.
export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
