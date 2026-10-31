$url = "https://8c18912a4169ec67aa9b39bdfb7cc3.10.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/47af19aceed340ea83bf16511d2b02f4/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=Yb_ejgxxEIlSiAvjMr2tLHGuBxnxd06W1zgWiR3GwrM"

$body = @{
    type = "INSERT"
    table = "Servicios"
    schema = "public"
    record = @{
        id = 11343
        created_at = "2026-08-21 12:55:30.663233+00"
        consecutivo = "KelDuqGara93243"
        numero_de_pedido = "158877"
        comercial_id = 92
        consumidor_id = $null
        estado = $true
        ubicacion_id = 129
        consecutivo_sap = $null
        fecha_cierre = $null
        coordinador_id = 40
        pedido_digitado = $null
        orden_de_venta = $null
        actividad_mac = $null
        decision_cliente = "No aplica"
        sharepoint_uid = "41f918cd-a3c1-486a-8320-fd5d185fcae1"
        tipo_de_servicio = "garantia_sin_pedido"
        canal_de_venta = "canal_ditribuidor"
        cerrado_por = $null
        facturado = $false
        creado_desde = "supabase"
        aprobacion_director = @{estado = "No_aplica"}
        aprobacion_logistica = @{estado = "No_aplica"}
        aprobacion_mac = @{estado = "No_aplica"}
        aplica_tecnico = $true
        asesor_mac_id = 92
        service_parent_id = $null
        soportes_pago = $null
        grupo_producto = $null
        medidas = $null
        productos = $null
        razon_cierre = $null
    }
    old_record = $null
}

$jsonBody = $body | ConvertTo-Json -Depth 10

try {
    $response = Invoke-RestMethod -Uri $url -Method Post -Body $jsonBody -ContentType "application/json"
    Write-Output "Success: "
    $response | ConvertTo-Json
} catch {
    Write-Error "Error: $_"
}
