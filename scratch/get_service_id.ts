
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

async function getServiceWithDefects() {
    const { data, error } = await supabase
        .from('Servicios_Defectos')
        .select('servicio_id')
        .limit(1);
    
    if (error) {
        console.error(error);
        return;
    }
    console.log('Service ID with defects:', data[0]?.servicio_id);
}

getServiceWithDefects();
