const url = "https://8c18912a4169ec67aa9b39bdfb7cc3.10.environment.api.powerplatform.com:443/powerautomate/automations/direct/cu/00/workflows/47af19aceed340ea83bf16511d2b02f4/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=Yb_ejgxxEIlSiAvjMr2tLHGuBxnxd06W1zgWiR3GwrM";

const data = {
    type: "INSERT",
    record: {
        id: 11280,
        consecutivo: "FEDiPorInst84152",
        estado: "SIN AGENDAR",
        creado: "14 de ago de 2026",
        tipo_servicio: "instalacion",
        numero_de_pedido: "159371 - 159692",
        canal_distribuidor: "LLANO AZUL ETAPA 4",
        contacto_canal: "Juliet Andrea Vásquez Mesa",
        ciudad: "Girardota (Antioquia)",
        asesor_comercial: "Edison Porras",
        estado_cita: "PENDIENTE POR AGENDAR",
        creado_desde: "supabase"
    }
};

fetch(url, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
})
.then(response => {
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    console.log(`Status: ${response.status} ${response.statusText}`);
    return response.text();
})
.then(text => {
    if (text) {
        try {
            console.log('Success:', JSON.parse(text));
        } catch (e) {
            console.log('Success:', text);
        }
    } else {
        console.log('Success: Empty response');
    }
})
.catch(error => console.error('Error:', error));
