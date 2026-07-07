export interface RegistroMAC {
    id: number;
    created_at: string;
    consecutivo: string;
    tipo_solicitud: string;
    canal_venta: string;
    estado: string; // 'Abierto', 'Cerrado'
    cerrada: boolean;
    prioridad: string;
    valor_total?: number;
    cliente_id: number | null;
    cliente_nombre: string | null;
    cliente_final_id: number | null;
    cliente_final_nombre: string | null;
    productos_compra: any[];
    productos_novedad: any[];
    comentarios: string;
    tratado_por_id: number | null;
    asesor_mac_id: number | null;
    Usuarios?: {
        nombres: string;
        apellidos: string;
    } | null;
    AsesorMAC?: {
        nombres: string;
        apellidos: string;
    } | null;
    Ubicaciones?: {
        ciudad_id: number | null;
        ciudades?: { ciudad: string; zona_id: number } | null;
    } | null;
    Consumidores?: {
        ciudad_id: number | null;
        ciudades?: { ciudad: string; zona_id: number } | null;
    } | null;
    // Calculated frontend fields
    _fechaCierre?: Date | null;
    _diasHabilesAbierta?: number;
    _tiempoCierre?: number;
    _estadoRiesgo?: 'Excelente' | 'Regular' | 'Riesgo de demanda' | 'Demandante';
    _valorInvertido?: number; // Calculado o mock si no existe costo
    _ciudad?: string;
    _zona?: string;
    _agenteNombre?: string;
}

export interface FilterState {
    fechaInicial: string;
    fechaFinal: string;
    estado: string[]; // 'Abierto', 'Cerrado'
    canalVenta: string[];
    tipoSolicitud: string[];
    agenteMac: string[]; // IDs o nombres
}
