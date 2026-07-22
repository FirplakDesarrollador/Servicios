$url = "https://8c18912a4169ec67aa9b39bdfb7cc3.10.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/47af19aceed340ea83bf16511d2b02f4/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=Yb_ejgxxEIlSiAvjMr2tLHGuBxnxd06W1zgWiR3GwrM"

$body = '{
  "record": {
    "id": 10905,
    "created_at": "2026-07-09 17:43:56.785099+00",
    "consecutivo": "FpaginaInst77475",
    "numero_de_pedido": "",
    "comercial_id": 30,
    "consumidor_id": 5034,
    "estado": true,
    "ubicacion_id": 2126,
    "consecutivo_sap": null,
    "fecha_cierre": null,
    "coordinador_id": 31,
    "pedido_digitado": null,
    "orden_de_venta": null,
    "actividad_mac": null,
    "decision_cliente": "No aplica",
    "sharepoint_uid": "b61be1d7-33c7-4ed2-8dcd-d0b360e7ced1",
    "tipo_de_servicio": "instalacion",
    "canal_de_venta": "canal_propio_ecommerce",
    "cerrado_por": null,
    "facturado": false,
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
    "soportes_pago": [
      "https://lnphhmowklqiomownurw.supabase.co/storage/v1/object/public/solicitudesclientes/FpaginaInst77475/FpaginaInst77475_soporte_pago.jpeg"
    ],
    "grupo_producto": null,
    "medidas": null,
    "productos": null,
    "razon_cierre": null
  }
}'

$response = Invoke-RestMethod -Uri $url -Method Post -Body $body -ContentType "application/json" -ErrorAction Stop

Write-Output "Webhook triggered successfully with correct wrapper."
