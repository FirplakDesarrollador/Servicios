$url = "https://8c18912a4169ec67aa9b39bdfb7cc3.10.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/47af19aceed340ea83bf16511d2b02f4/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=Yb_ejgxxEIlSiAvjMr2tLHGuBxnxd06W1zgWiR3GwrM"

$body = '{
  "record": {
    "id": 11335,
    "created_at": "2026-08-20T20:52:38.590987+00:00",
    "consecutivo": "FEdiPorMant93643",
    "numero_de_pedido": "0000",
    "comercial_id": 59,
    "consumidor_id": 5189,
    "estado": true,
    "ubicacion_id": 3045,
    "consecutivo_sap": null,
    "fecha_cierre": null,
    "coordinador_id": 31,
    "pedido_digitado": null,
    "orden_de_venta": null,
    "actividad_mac": null,
    "decision_cliente": "No aplica",
    "sharepoint_uid": "d5164f58-3f6a-4f02-ac9d-8464b95dcd78",
    "tipo_de_servicio": "mantenimiento",
    "canal_de_venta": "canal_constructor",
    "cerrado_por": null,
    "facturado": true,
    "creado_desde": "supabase",
    "aprobacion_director": {
      "estado": "No_aplica"
    },
    "aprobacion_logistica": {
      "estado": "No_aplica"
    },
    "aprobacion_mac": {
      "estado": "No_aplica"
    },
    "aplica_tecnico": true,
    "asesor_mac_id": null,
    "service_parent_id": null,
    "soportes_pago": null,
    "grupo_producto": null,
    "medidas": null,
    "productos": null,
    "razon_cierre": null
  }
}'

$response = Invoke-RestMethod -Uri $url -Method Post -Body $body -ContentType "application/json" -ErrorAction Stop

Write-Output "Webhook triggered successfully with correct wrapper."
