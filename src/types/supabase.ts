export interface QueryUbicacionesRow {
    id: number
    created_at: string
    cliente_id: number
    nombre_contacto: string | null
    telefono: string | null
    nombre: string | null
    direccion: string | null
    nit: string | null
    ciudad_id: number | null
    asesor_id: number | null
    activo: boolean | null
    pop_banos: boolean | null
    pop_cocinas: boolean | null
    pop_labores: boolean | null
    pop_hidros: boolean | null
    pop_no_aplica: boolean | null
    permite_exhibir: boolean | null
    modified_at: string | null
    modified_by: string | null
    fotos: string[] | null
    sharepoint_id: string | null
    cliente_nit: string | null
    cliente_nombre: string | null
    cliente_tipo: string | null
    pais: string | null
    ciudad: string | null
    departamento: string | null
    zona: string | null
    zona_id: number | null
    coordinador_nombre: string | null
    coordinador_correo: string | null
    administrador_nombre: string | null
    coordinador_id: number | null
    administrador_id: number | null
    asesor_comercial_nombre: string | null
    asesor_comercial_correo: string | null
    ultimo_mantenimiento_consecutivo: string | null
    ultimo_mantenimiento_fecha_cierre: string | null
    ultimo_mantenimiento_id: number | null
}
