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
    _defectosNombres?: string[];
    _responsablesNombres?: string[];
    _productosNombres?: string[];
    _clientePrincipalFinal?: string;
    _mesPresupuestoKey?: string;
    _mesCreacionKey?: string;
}

export interface FilterState {
    fechaInicial: string;
    fechaFinal: string;
    estado: string[]; // 'Abierto', 'Cerrado'
    canalVenta: string[];
    tipoSolicitud: string[];
    agenteMac: string[]; // IDs o nombres
    // Filtros interactivos dinámicos
    defectos: string[];
    productos: string[];
    ciudades: string[];
    responsables: string[];
    zonas: string[];
    clientes: string[];
    mesPresupuesto: string[];
    mesCreacion: string[];
    estadoRiesgo: string[];
}

// ── Tipos para ANÁLISIS y QRR ──────────────────────────────────────────────

export interface DateRange {
    start: string; // YYYY-MM-DD
    end: string;   // YYYY-MM-DD
    label: string; // "Agosto 2026"
    key: string;   // "2026-08"
}

export type PriorityLevel = 'inmediato' | 'seguimiento' | 'vigilar' | 'estable';

export interface AnalysisItem {
    name: string;
    recordsPrev: number;
    recordsCurr: number;
    variationRecords: number | null; // null = "Nuevo"
    unitsPrev: number;
    unitsCurr: number;
    variationUnits: number | null;
    valuePrev: number;
    valueCurr: number;
    variationValue: number | null;
    priority: PriorityLevel;
    priorityScore: number;
    // Campos auxiliares para cruce
    topCliente?: string;
    topReferencia?: string;
    topZona?: string;
    topCiudad?: string;
    topResponsable?: string;
}

export interface DefectAnalysis extends AnalysisItem {
    recurrence: number; // Meses consecutivos presentes
    concentration: string; // Dónde se concentra
}

export interface ResponsableAnalysis extends AnalysisItem {
    principalProblema: string;
    principalReferencia: string;
}

export interface ReferenceAnalysis extends AnalysisItem {
    refCompra: string;
    refNovedad: string;
    principalNovedad: string;
    responsable: string;
    multipleDefects: boolean;
}

export interface GeoAnalysis extends AnalysisItem {
    zona: string;
    ciudad: string;
    principalNovedad: string;
    clientePrincipal: string;
}

export interface ClientAnalysis extends AnalysisItem {
    principalNovedad: string;
    principalReferencia: string;
    zona: string;
}

export interface EconomicAnalysis extends AnalysisItem {
    percentOfTotal: number;
    responsable: string;
    principalReferencia: string;
    clientePrincipal: string;
}

export interface Recommendation {
    priority: PriorityLevel;
    problema: string;
    evidencia: string;
    impacto: 'Alto' | 'Medio' | 'Bajo';
    responsable: string;
    accionRecomendada: string;
    // Datos para pre-llenar QRR
    referencias: string;
    clientes: string;
    zonaCiudad: string;
    numCasos: number;
    numUnidades: number;
    impactoDinero: number;
    motivo: string;
    registrosIds: number[];
}

export interface AllAnalyses {
    defects: DefectAnalysis[];
    responsables: ResponsableAnalysis[];
    references: ReferenceAnalysis[];
    geographic: GeoAnalysis[];
    clients: ClientAnalysis[];
    economic: EconomicAnalysis[];
    recommendations: Recommendation[];
    currentPeriod: DateRange;
    previousPeriod: DateRange;
    totalRecordsCurr: number;
    totalRecordsPrev: number;
    totalValueCurr: number;
    totalValuePrev: number;
    totalUnitsCurr: number;
    totalUnitsPrev: number;
}

// ── QRR Types ──────────────────────────────────────────────────────────────

export type QRREstado = 'pendiente' | 'en_analisis' | 'en_ejecucion' | 'en_validacion' | 'cerrado' | 'vencido';

export const QRR_ESTADO_CONFIG: Record<QRREstado, { label: string; emoji: string; color: string; bgColor: string }> = {
    pendiente: { label: 'Pendiente', emoji: '🔴', color: '#ef4444', bgColor: '#fef2f2' },
    en_analisis: { label: 'En análisis', emoji: '🟠', color: '#f97316', bgColor: '#fff7ed' },
    en_ejecucion: { label: 'En ejecución', emoji: '🟡', color: '#eab308', bgColor: '#fefce8' },
    en_validacion: { label: 'En validación', emoji: '🔵', color: '#3b82f6', bgColor: '#eff6ff' },
    cerrado: { label: 'Cerrado', emoji: '🟢', color: '#10b981', bgColor: '#ecfdf5' },
    vencido: { label: 'Vencido', emoji: '⚫', color: '#374151', bgColor: '#f3f4f6' },
};

export const QRR_ORIGEN_OPTIONS = [
    'Análisis de indicadores',
    'Queja recurrente',
    'Novedad de calidad',
    'Reclamo cliente',
    'Auditoría',
    'Producción',
    'Servicio',
    'Otro',
];

export interface QRRRecord {
    id: string;
    fechaInicio: string;
    origen: string;
    referencia: string;
    responsable: string;
    problema: string;
    numCasos: number;
    numUnidades: number;
    impactoDinero: number;
    accion: string;
    plazo: string;
    estado: QRREstado;
    fechaCompromiso: string;
    avancePorcentaje: number;
    ultimaActualizacion: string;
    observaciones: string;
    evidencia: string;
    registrosAsociados: number[];
    prioridad: PriorityLevel;
    // Cierre formal
    accionEjecutada?: string;
    fechaEjecucion?: string;
    responsableEjecucion?: string;
    evidenciaCierre?: string;
    validacion?: string;
    resultado?: string;
}
