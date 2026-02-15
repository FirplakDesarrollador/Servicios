-- Vista SQL para consulta pública de estados de servicios
-- Esta vista expone solo la información necesaria para que los clientes
-- consulten el estado de sus servicios sin autenticación

CREATE OR REPLACE VIEW query_servicios_info_cliente AS
SELECT 
    s.consecutivo,
    s.tipo_de_servicio,
    v.nombre AS estado,
    v.fecha_hora_inicio,
    v.fecha_hora_fin,
    u.display_name AS tecnico_nombre,
    v.reagendado,
    v.id AS visita_id,
    s.created_at AS fecha_solicitud
FROM 
    "Servicios" s
LEFT JOIN 
    "Visitas" v ON s.id = v.servicio_id
LEFT JOIN 
    "Usuarios" u ON v.tecnico_id = u.id
WHERE 
    s.estado = true  -- Solo servicios activos
ORDER BY 
    s.consecutivo, v.fecha_hora_inicio;

-- Comentarios para documentación
COMMENT ON VIEW query_servicios_info_cliente IS 'Vista pública que permite a los clientes consultar el estado de sus servicios usando solo el consecutivo. No requiere autenticación. Muestra información básica de visitas y técnicos asignados.';
