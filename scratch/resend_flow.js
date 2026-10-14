const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lnphhmowklqiomownurw.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxucGhobW93a2xxaW9tb3dudXJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTY5MjAzNDAyNSwiZXhwIjoyMDA3NjEwMDI1fQ.J-2EWGSL4Gro06MYBFVLQNnjbeDGYqjeLy1x8SdR2ms';
const supabase = createClient(supabaseUrl, serviceKey);

const FLOW_URL = "https://8c18912a4169ec67aa9b39bdfb7cc3.10.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/47af19aceed340ea83bf16511d2b02f4/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=Yb_ejgxxEIlSiAvjMr2tLHGuBxnxd06W1zgWiR3GwrM";

async function resendFlow(consecutivo) {
    console.log(`\n>>> Resending flow for ${consecutivo}...`);
    
    // 1. Fetch record from Servicios
    const { data: records, error } = await supabase
        .from('Servicios')
        .select('*')
        .eq('consecutivo', consecutivo);

    if (error || !records || records.length === 0) {
        console.error(`Error fetching service ${consecutivo}:`, error);
        return;
    }

    const record = records[0];
    console.log("Service found:", { id: record.id, consecutivo: record.consecutivo, creado: record.created_at });

    // Also verify Comentarios
    const { data: comments } = await supabase
        .from('Comentarios')
        .select('id, contenido, documentos')
        .eq('servicio_id', record.id);
    console.log("Comentarios:", JSON.stringify(comments, null, 2));

    // 2. Build Supabase Database Webhook payload format
    const payload = {
        type: "INSERT",
        table: "Servicios",
        schema: "public",
        record: record,
        old_record: null
    };

    console.log("Sending payload to Power Automate...");
    const res = await fetch(FLOW_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    const status = res.status;
    const text = await res.text();
    console.log(`Power Automate Response Status: ${status}`);
    console.log(`Power Automate Response Body: ${text || '(empty)'}`);
}

async function run() {
    await resendFlow('FEdiPorInst29374');
    await resendFlow('FEdiPorInst28263');
}

run();
