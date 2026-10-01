const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lnphhmowklqiomownurw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxucGhobW93a2xxaW9tb3dudXJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTIwMzQwMjUsImV4cCI6MjAwNzYxMDAyNX0.FHCOWrVp-K-7qrM3CtYmYaqiOqwzsX_Au7pLm-MN3eQ';
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectServices() {
    const consecutivos = ['FEdiPorInst29374', 'FEdiPorInst28263'];
    
    for (const c of consecutivos) {
        console.log(`\n=================== ${c} ===================`);
        
        // 1. Servicios table
        const { data: serv, error: errServ } = await supabase
            .from('Servicios')
            .select('*')
            .eq('consecutivo', c);
        console.log("Servicios:", JSON.stringify(serv, null, 2));
        if (errServ) console.error("Error Serv:", errServ);

        // 2. Formulario_Cliente table
        const { data: formCli, error: errFormCli } = await supabase
            .from('Formulario_Cliente')
            .select('*')
            .eq('consecutivo', c);
        console.log("Formulario_Cliente:", JSON.stringify(formCli, null, 2));
        if (errFormCli) console.error("Error FormCli:", errFormCli);

        // 3. formulario_cliente (lowercase check)
        const { data: formCliLower, error: errFormCliLower } = await supabase
            .from('formulario_cliente')
            .select('*')
            .eq('consecutivo', c);
        console.log("formulario_cliente:", JSON.stringify(formCliLower, null, 2));
        if (errFormCliLower) console.error("Error FormCliLower:", errFormCliLower);

        // 4. Comentarios
        if (serv && serv.length > 0) {
            const { data: comments, error: errComm } = await supabase
                .from('Comentarios')
                .select('*')
                .eq('servicio_id', serv[0].id);
            console.log("Comentarios:", JSON.stringify(comments, null, 2));
            if (errComm) console.error("Error Comentarios:", errComm);
        }
    }
}

inspectServices();
