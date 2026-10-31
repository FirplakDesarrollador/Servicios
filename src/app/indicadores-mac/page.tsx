'use client';

import React, { useEffect, useState, useMemo, useCallback, Suspense, lazy, useTransition, useDeferredValue } from 'react';

import { supabase } from '@/lib/supabase';
import { RegistroMAC, FilterState, QRRRecord } from './types';
import Filters, { LiveFilters, LiveFiltersContext } from './components/Filters';
import { DownloadIcon, XIcon, ListFilterIcon, ArrowLeftIcon, LayoutDashboardIcon, ListChecksIcon, UsersIcon, FileTextIcon, SparklesIcon, ShieldCheckIcon } from 'lucide-react';
import DetalleRadicadosModal from './components/DetalleRadicadosModal';
import * as XLSX from 'xlsx';
import { getBusinessDaysDifference, addBusinessDays } from './utils/businessDays';
import { computeFilterViews, normalizeGrupo, normalizePlantaName } from './utils/filterEngine';

// ── Lazy loading de tabs → no bloquea el render inicial ──────────────────────
const GeneralMac = lazy(() => import('./tabs/GeneralMac').then(m => ({ default: React.memo(m.default) })));
const CanalesVentaCard = lazy(() => import('./tabs/GeneralMac').then(m => ({ default: m.CanalesVentaCard })));
const DetalleMac = lazy(() => import('./tabs/DetalleMac').then(m => ({ default: React.memo(m.default) })));
const AgentesMac = lazy(() => import('./tabs/AgentesMac').then(m => ({ default: React.memo(m.default) })));
const InformeMac = lazy(() => import('./tabs/InformeMac').then(m => ({ default: React.memo(m.default) })));
const AnalisisMac = lazy(() => import('./tabs/AnalisisMac').then(m => ({ default: React.memo(m.default) })));
const QrrMac = lazy(() => import('./tabs/QrrMac').then(m => ({ default: React.memo(m.default) })));

// ── Helpers para normalización de grupo / familia (normalizeGrupo / normalizePlantaName en utils/filterEngine) ──
const getGrupoForProduct = (p: any): string => {
    const rawGrupo = p?.familia;
    if (!rawGrupo || typeof rawGrupo !== 'string' || !String(rawGrupo).trim() || String(rawGrupo).toLowerCase().includes('seleccione')) {
        return 'En Blanco';
    }
    return normalizeGrupo(rawGrupo);
};

const getPlantaForProduct = (p: any): string => {
    const rawPlanta = p?.planta;
    if (!rawPlanta || typeof rawPlanta !== 'string' || !String(rawPlanta).trim() || String(rawPlanta).toLowerCase().includes('seleccione')) {
        return 'En Blanco';
    }
    return normalizePlantaName(rawPlanta);
};

const CANAL_VENTA_MAP: Record<string, string> = {
    'canal_ditribuidor': 'Canal Distribuidor',
    'canal_distribuidor': 'Canal Distribuidor',
    'canal_exportador': 'Canal Distribuidor',
    'Canal Exportador': 'Canal Distribuidor',
    'Exportador': 'Canal Distribuidor',
    'Exportaciones': 'Canal Distribuidor',
    'canal_constructor': 'Canal Constructor',
    'canal_propio_firplakhome': 'Canal Propio Firplakhome',
    'canal_propio_ecommerce': 'Canal Propio eCommerce',
};

// ── Densidad de la vista: escala toda la página por igual (mismo orden y estética) ──
type Densidad = 'compacta' | 'normal' | 'agrandada';
const DENSIDADES: Array<{ id: Densidad; label: string; zoom: number; size: string }> = [
    { id: 'compacta', label: 'Compacta', zoom: 0.7, size: 'text-[10px]' },
    { id: 'normal', label: 'Normal', zoom: 0.8, size: 'text-[12px]' },
    { id: 'agrandada', label: 'Agrandada', zoom: 1, size: 'text-[14px]' },
];

// ── TabSuspense wrapper ──────────────────────────────────────────────────────
function TabFallback() {
    return (
        <div className="flex items-center justify-center py-24">
            <div className="w-7 h-7 rounded-full border-[3px] border-border border-t-brand animate-spin" />
        </div>
    );
}

export default function IndicadoresMacPage() {
    const [data, setData] = useState<RegistroMAC[]>([]);
    const [razones, setRazones] = useState<any[]>([]);
    const [defectosRef, setDefectosRef] = useState<any[]>([]);
    const [showExportModal, setShowExportModal] = useState(false);
    const [exportStartDate, setExportStartDate] = useState('');
    const [exportEndDate, setExportEndDate] = useState('');
    const [responsablesRef, setResponsablesRef] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState(0);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isPending, startTransition] = useTransition();

    const [densidad, setDensidad] = useState<Densidad>('normal');
    useEffect(() => {
        try {
            const stored = localStorage.getItem('mac_densidad') as Densidad | null;
            if (stored && DENSIDADES.some(d => d.id === stored)) setDensidad(stored);
        } catch { /* sin almacenamiento local */ }
    }, []);
    const cambiarDensidad = (d: Densidad) => {
        setDensidad(d);
        try { localStorage.setItem('mac_densidad', d); } catch { /* sin almacenamiento local */ }
    };
    const zoom = DENSIDADES.find(d => d.id === densidad)?.zoom ?? 0.8;

    // ── QRR State (localStorage persistence) ────────────────────────────────
    const [qrrRecords, setQrrRecords] = useState<QRRRecord[]>([]);
    useEffect(() => {
        try {
            const stored = localStorage.getItem('mac_qrr_records');
            if (stored) setQrrRecords(JSON.parse(stored));
        } catch (e) { /* ignore */ }
    }, []);

    const handleAddQRR = useCallback((partial: Partial<QRRRecord>) => {
        const newRec: QRRRecord = {
            id: crypto.randomUUID ? crypto.randomUUID() : `qrr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            fechaInicio: new Date().toISOString().split('T')[0],
            origen: 'Análisis de indicadores',
            referencia: '',
            responsable: '',
            problema: '',
            numCasos: 0,
            numUnidades: 0,
            impactoDinero: 0,
            accion: '',
            plazo: '',
            estado: 'pendiente',
            fechaCompromiso: '',
            avancePorcentaje: 0,
            ultimaActualizacion: new Date().toISOString().split('T')[0],
            observaciones: '',
            evidencia: '',
            registrosAsociados: [],
            prioridad: 'seguimiento',
            ...partial,
        };
        setQrrRecords(prev => {
            const next = [...prev, newRec];
            localStorage.setItem('mac_qrr_records', JSON.stringify(next));
            return next;
        });
        // Switch to QRR tab
        startTransition(() => {
            setActiveTab(5);
        });
    }, []);

    const [filters, setFilters] = useState<FilterState>({
        fechaInicial: '2026-07-03',
        fechaFinal: new Date().toISOString().split('T')[0],
        estado: [],
        canalVenta: [],
        tipoSolicitud: [],
        agenteMac: [],
        defectos: [],
        productos: [],
        ciudades: [],
        responsables: [],
        zonas: [],
        plantas: [],
        clientes: [],
        mesPresupuesto: [],
        mesCreacion: [],
        estadoRiesgo: [],
        mercado: [],
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            // ── Ejecutar todas las queries en paralelo ────────────────────────
            const [
                registrosResult,
                razonesResult,
                defectosResult,
                responsablesResult,
                zonasResult,
                clientesResult,
            ] = await Promise.all([
                supabase
                    .from('registro_solicitudes')
                    .select(`
                        *,
                        Usuarios!registro_solicitudes_tratado_por_id_fkey(nombres, apellidos, rol),
                        AsesorMAC:Usuarios!registro_solicitudes_asesor_mac_id_fkey(nombres, apellidos),
                        Ubicaciones:cliente_id(id, cliente_id, nit, nombre, ciudad_id, ciudades:ciudad_id(ciudad, zona_id, zonas:zona_id(zona))),
                        Consumidores:cliente_final_id(ciudad_id, ciudades:ciudad_id(ciudad, zona_id, zonas:zona_id(zona)))
                    `),
                supabase.from('razones_queja').select('id, razon'),
                supabase.from('defectos').select('id, defecto'),
                supabase.from('responsable_queja').select('id, responsable'),
                supabase.from('zonas').select('id, zona'),
                supabase.from('Clientes').select('id, nombre, nit, Mercado').limit(5000),
            ]);

            if (registrosResult.error) throw registrosResult.error;

            const razonesData = razonesResult.data || [];
            const defectosData = defectosResult.data || [];
            const responsablesData = responsablesResult.data || [];
            const zonasRef = zonasResult.data || [];

            setRazones(razonesData);
            setDefectosRef(defectosData);
            setResponsablesRef(responsablesData);

            // Maps de lookup para IDs → nombres (O(1) en vez de .find())
            const defectosMap = new Map<string, string>(defectosData.map((d: any) => [String(d.id), d.defecto]));
            const razonesMap = new Map<string, string>(razonesData.map((r: any) => [String(r.id), r.razon]));
            const responsablesMap = new Map<string, string>(responsablesData.map((r: any) => [String(r.id), r.responsable]));
            const zonasMap = new Map<string, string>(zonasRef.map((z: any) => [String(z.id), z.zona]));

            // Maps de lookup para Clientes → Mercado (O(1))
            const clientesData = (clientesResult.data || []) as any[];
            const clienteByIdMap = new Map<number, string>();
            const clienteByNitMap = new Map<string, string>();
            const clienteByNameMap = new Map<string, string>();

            clientesData.forEach((c: any) => {
                const rawMercado = c.Mercado || c.mercado;
                let normMercado = 'Sin clasificar';
                if (rawMercado && String(rawMercado).trim()) {
                    const trimmed = String(rawMercado).trim();
                    const lower = trimmed.toLowerCase();
                    if (lower === 'nacional') normMercado = 'Nacional';
                    else if (lower === 'internacional') normMercado = 'Internacional';
                    else normMercado = trimmed;
                }

                if (c.id) clienteByIdMap.set(Number(c.id), normMercado);
                if (c.nit) {
                    const cleanNit = String(c.nit).trim().replace(/\s+/g, '');
                    if (cleanNit) {
                        clienteByNitMap.set(cleanNit, normMercado);
                        const digits = cleanNit.replace(/\D/g, '');
                        if (digits) clienteByNitMap.set(digits, normMercado);
                    }
                }
                if (c.nombre) {
                    const cleanName = String(c.nombre).trim().toLowerCase();
                    if (cleanName) clienteByNameMap.set(cleanName, normMercado);
                }
            });

            const getNombreProblemaDirect = (id: number | string): string => {
                const key = String(id);
                return defectosMap.get(key) || razonesMap.get(key) || `ID ${id}`;
            };


            // ── Pre-convertir `created_at` a timestamp numérico ──────────────
            const now = Date.now();
            const registrosData = registrosResult.data as any[];

            const processed = registrosData.map(r => {
                // REGLA GLOBAL: El estado se define única y exclusivamente por la existencia de la Fecha de Verificación.
                const isClosed = !!r.fecha_verificacion;
                const estado = isClosed ? 'Cerrado' : 'Abierto';

                const createdAt = new Date(r.created_at);
                // ── Timestamp numérico para comparaciones rápidas en filtros ──
                const createdAtTs = createdAt.getTime();

                const fechaCierre = isClosed ? new Date(r.fecha_verificacion) : null;
                const fechaReferencia = fechaCierre || new Date(now);

                const diasHabilesAbierta = getBusinessDaysDifference(createdAt, fechaReferencia);

                let estadoRiesgo: 'Excelente' | 'Regular' | 'Riesgo de demanda' | 'Demandante' = 'Excelente';
                if (diasHabilesAbierta > 20) estadoRiesgo = 'Demandante';
                else if (diasHabilesAbierta >= 16) estadoRiesgo = 'Riesgo de demanda';
                else if (diasHabilesAbierta >= 11) estadoRiesgo = 'Regular';

                // Lógica de ciudad y zona
                let ciudad = 'No definida';
                let zona = 'No definida';
                let zonaId = null;

                if (r.cliente_final_id && r.Consumidores?.ciudades) {
                    ciudad = r.Consumidores.ciudades.ciudad || ciudad;
                    const zonaName = r.Consumidores.ciudades.zonas?.zona;
                    const zonaIdVal = r.Consumidores.ciudades.zona_id;
                    if (zonaName) zona = zonaName;
                    else if (zonaIdVal) zonaId = zonaIdVal;
                }
                if (zona === 'No definida' && r.cliente_id && r.Ubicaciones?.ciudades) {
                    if (!r.cliente_final_id) ciudad = r.Ubicaciones.ciudades.ciudad || ciudad;
                    const zonaName = r.Ubicaciones.ciudades.zonas?.zona;
                    const zonaIdVal = r.Ubicaciones.ciudades.zona_id;
                    if (zonaName) zona = zonaName;
                    else if (zonaIdVal) zonaId = zonaIdVal;
                }

                if (zonaId && zona === 'No definida') {
                    zona = zonasMap.get(String(zonaId)) || `Zona ${zonaId}`;
                }

                const agenteNombre = r.AsesorMAC
                    ? `${r.AsesorMAC.nombres} ${r.AsesorMAC.apellidos}`.trim()
                    : (r.Usuarios?.rol?.toLowerCase() === 'mac' ? `${r.Usuarios.nombres} ${r.Usuarios.apellidos}`.trim() : 'Sin Asignar');

                const _defectosNombres = new Set<string>();
                const _responsablesNombres = new Set<string>();
                const _productosNombres = new Set<string>();
                const _plantasNombres = new Set<string>();
                const _gruposNombres = new Set<string>();

                // productos_compra SOLO aporta descripciones de producto / sku para filtros de productos (NUNCA plantas ni grupos)
                if (Array.isArray(r.productos_compra)) {
                    r.productos_compra.forEach((p: any) => {
                        _productosNombres.add(p.descripcion || p.nombre || p.sku || p.referencia || 'Desconocido');
                        const code = p.codigo || p.referencia || p.sku || p.codigo_producto || p.cod_producto || p.cod;
                        if (code && String(code).trim()) _productosNombres.add(String(code).trim());
                    });
                }

                // El UNICO origen de Plantas y Grupos/Familias es productos_novedad (JSON guardado en cada radicado)
                let hasValidPlanta = false;
                let hasValidGrupo = false;

                if (Array.isArray(r.productos_novedad) && r.productos_novedad.length > 0) {
                    r.productos_novedad.forEach((p: any) => {
                        p._grupo = getGrupoForProduct(p);
                        p._planta = getPlantaForProduct(p);

                        if (p._grupo && p._grupo !== 'En Blanco') {
                            hasValidGrupo = true;
                            _gruposNombres.add(String(p._grupo).toUpperCase().trim());
                        } else {
                            _gruposNombres.add('EN BLANCO');
                        }

                        if (p._planta && p._planta !== 'En Blanco') {
                            hasValidPlanta = true;
                            _plantasNombres.add(String(p._planta).toUpperCase().trim());
                        } else {
                            _plantasNombres.add('EN BLANCO');
                        }

                        _productosNombres.add(p.descripcion || p.nombre || p.sku || p.referencia || 'Desconocido');
                        const code = p.codigo || p.referencia || p.sku || p.codigo_producto || p.cod_producto || p.cod;
                        if (code && String(code).trim()) _productosNombres.add(String(code).trim());
                        let hasProblema = false;
                        let hasResp = false;
                        if (Array.isArray(p.problemas)) {
                            p.problemas.forEach((prob: any, idx: number) => {
                                if (prob.tipo_problema_id) {
                                    hasProblema = true;
                                    const nombreProblema = getNombreProblemaDirect(prob.tipo_problema_id);
                                    _defectosNombres.add(nombreProblema);
                                    if (idx === 0) p.defecto = nombreProblema;
                                }
                                if (prob.responsable_problema_id) {
                                    hasResp = true;
                                    const nombreResp = responsablesMap.get(String(prob.responsable_problema_id)) || `ID ${prob.responsable_problema_id}`;
                                    _responsablesNombres.add(nombreResp);
                                    if (idx === 0) p.responsable = nombreResp;
                                }
                            });
                        }
                        if (!hasProblema && p.tipo_problema_id) {
                            const nombreProblema = getNombreProblemaDirect(p.tipo_problema_id);
                            _defectosNombres.add(nombreProblema);
                            p.defecto = nombreProblema;
                        }
                        if (!hasResp && p.responsable_problema_id) {
                            const nombreResp = responsablesMap.get(String(p.responsable_problema_id)) || `ID ${p.responsable_problema_id}`;
                            _responsablesNombres.add(nombreResp);
                            p.responsable = nombreResp;
                        }
                    });
                } else {
                    _gruposNombres.add('EN BLANCO');
                    _plantasNombres.add('EN BLANCO');
                }

                if (!hasValidPlanta) _plantasNombres.add('EN BLANCO');
                if (!hasValidGrupo) _gruposNombres.add('EN BLANCO');

                const fechaObjetivo = addBusinessDays(createdAt, 15);
                const mesPresupuestoKey = `${fechaObjetivo.getFullYear()}-${String(fechaObjetivo.getMonth() + 1).padStart(2, '0')}`;
                const mesCreacionKey = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, '0')}`;
                const clienteFinalOrPrincipal = r.cliente_final_nombre || r.cliente_nombre || 'Desconocido';

                // Determinar Mercado a través de Clientes
                let mercado = 'Sin clasificar';
                const ubiClienteId = r.Ubicaciones?.cliente_id;
                if (ubiClienteId && clienteByIdMap.has(Number(ubiClienteId))) {
                    mercado = clienteByIdMap.get(Number(ubiClienteId))!;
                } else if (r.cliente_id && clienteByIdMap.has(Number(r.cliente_id))) {
                    mercado = clienteByIdMap.get(Number(r.cliente_id))!;
                }

                if (mercado === 'Sin clasificar' && r.Ubicaciones?.nit) {
                    const cleanNit = String(r.Ubicaciones.nit).trim().replace(/\s+/g, '');
                    const digits = cleanNit.replace(/\D/g, '');
                    if (clienteByNitMap.has(cleanNit)) {
                        mercado = clienteByNitMap.get(cleanNit)!;
                    } else if (digits && clienteByNitMap.has(digits)) {
                        mercado = clienteByNitMap.get(digits)!;
                    }
                }

                if (mercado === 'Sin clasificar') {
                    const candidates = [r.cliente_nombre, r.Ubicaciones?.nombre].filter(Boolean);
                    for (const cand of candidates) {
                        const cleanCand = String(cand).trim().toLowerCase();
                        if (cleanCand && clienteByNameMap.has(cleanCand)) {
                            mercado = clienteByNameMap.get(cleanCand)!;
                            break;
                        }
                    }
                }

                if (mercado === 'Sin clasificar' && r.canal_venta) {
                    const canalLower = String(r.canal_venta).toLowerCase();
                    if (canalLower.includes('ecommerce') || canalLower.includes('firplakhome') || canalLower.includes('propio')) {
                        mercado = 'Nacional';
                    } else if (canalLower.includes('exportador') || canalLower.includes('exportacion')) {
                        mercado = 'Internacional';
                    }
                }

                return {
                    ...r,
                    fecha_cierre: r.fecha_cierre || null,
                    canal_venta: CANAL_VENTA_MAP[r.canal_venta] || r.canal_venta,
                    estado,
                    mercado,
                    _mercado: mercado,
                    // ── Timestamps numéricos para filtros rápidos ──────────────
                    _createdAtTs: createdAtTs,
                    _fechaCierre: fechaCierre,
                    _diasHabilesAbierta: diasHabilesAbierta,
                    _tiempoCierre: fechaCierre ? diasHabilesAbierta : null,
                    _estadoRiesgo: estadoRiesgo,
                    _valorInvertido: r.valor_total || 0,
                    _ciudad: ciudad,
                    _zona: zona,
                    _agenteNombre: agenteNombre,
                    _defectosNombres: Array.from(_defectosNombres),
                    _responsablesNombres: Array.from(_responsablesNombres),
                    _productosNombres: Array.from(_productosNombres),
                    _plantasNombres: Array.from(_plantasNombres),
                    _gruposNombres: Array.from(_gruposNombres),
                    _clientePrincipalFinal: clienteFinalOrPrincipal,
                    _mesPresupuestoKey: mesPresupuestoKey,
                    _mesCreacionKey: mesCreacionKey,
                } as RegistroMAC;
            });

            setData(processed);
        } catch (error) {
            console.error('Error fetching MAC indicators data:', error);
        } finally {
            setLoading(false);
        }
    };

    // ── Filtros ──────────────────────────────────────────────────────────────
    // Los controles de filtro se actualizan al instante (filters) y los cálculos usan una copia diferida
    // (deferredFilters): React recalcula tablas y gráficas sin congelar la pantalla mientras se escribe
    // una fecha o se encadenan clics. Una sola pasada calcula la vista filtrada y las vistas cruzadas.
    const deferredFilters = useDeferredValue(filters);
    const isUpdating = deferredFilters !== filters || isPending;
    const views = useMemo(() => computeFilterViews(data, deferredFilters), [data, deferredFilters]);

    const filteredData = views.all;
    const dataForDefectos = views.except.defectos;
    const dataForResponsables = views.except.responsables;
    const dataForCiudades = views.except.ciudades;
    const dataForZonas = views.except.zonas;
    const dataForClientes = views.except.clientes;
    const dataForProductos = views.except.productos;
    const dataForPlantas = views.except.plantas;
    const dataForMesPresupuesto = views.except.mesPresupuesto;
    const dataForMesCreacion = views.except.mesCreacion;
    const dataForCanalVenta = views.except.canalVenta;
    const dataForMercado = views.except.mercado;
    const dataForEstadoRiesgo = views.except.estadoRiesgo;
    const liveFiltersCtx = useMemo(() => ({ filters, setFilters }), [filters]);
    const verticalFiltersEl = useMemo(() => <LiveFilters data={data} activeTab={activeTab} isVertical={true} />, [data, activeTab]);

    // ── useCallback para evitar re-renders innecesarios en hijos ─────────────
    const handleFilterToggle = useCallback((key: keyof FilterState, value: string, e?: any) => {
        startTransition(() => {
            setFilters(prev => {
                const isMulti = e?.ctrlKey || e?.metaKey;
                const currentArray = prev[key] as string[];

                if (isMulti) {
                    if (currentArray.includes(value)) {
                        return { ...prev, [key]: currentArray.filter(v => v !== value) };
                    } else {
                        return { ...prev, [key]: [...currentArray, value] };
                    }
                } else {
                    if (currentArray.length === 1 && currentArray[0] === value) {
                        return { ...prev, [key]: [] };
                    }
                    return { ...prev, [key]: [value] };
                }
            });
        });
    }, []);

    const confirmExport = () => {
        let toExport = data;
        if (exportStartDate) {
            toExport = toExport.filter(d => new Date(d.created_at) >= new Date(exportStartDate + 'T00:00:00'));
        }
        if (exportEndDate) {
            toExport = toExport.filter(d => new Date(d.created_at) <= new Date(exportEndDate + 'T23:59:59'));
        }
        exportToExcel(toExport);
        setShowExportModal(false);
    };

    const exportToExcel = (dataToExport: RegistroMAC[] = filteredData) => {
        const allRows: Record<string, any>[] = [];

        const razonesMapExport = new Map(razones.map(r => [String(r.id), r.razon]));
        const responsablesMapExport = new Map(responsablesRef.map(r => [String(r.id), r.responsable]));

        dataToExport.forEach(d => {
            const baseRow: Record<string, any> = {};
            Object.entries(d).forEach(([key, val]) => {
                if (key.startsWith('_')) return;
                if (key === 'productos_compra' || key === 'productos_novedad') return;
                if (['cliente_id', 'cliente_final_id', 'cliente_nombre', 'cliente_final_nombre', 'canal_venta', 'fecha_compra', 'fecha_fabricacion'].includes(key)) return;
                if (val && typeof val === 'object') return;
                baseRow[key] = val;
            });

            baseRow['Cliente_Principal'] = d.cliente_nombre || 'No definido';
            baseRow['Cliente_Final'] = d.cliente_final_nombre || 'No definido';
            baseRow['Canal_Venta'] = d.canal_venta || 'No definido';
            baseRow['Mercado'] = d._mercado || 'Sin clasificar';
            baseRow['Agente_MAC'] = d._agenteNombre || 'Sin Asignar';
            baseRow['Ciudad'] = d._ciudad || 'No definida';
            baseRow['Zona'] = d._zona || 'No definida';
            baseRow['Estado_Riesgo'] = d._estadoRiesgo || 'Excelente';
            baseRow['Dias_Habiles'] = d._diasHabilesAbierta || 0;
            if (d._fechaCierre) {
                baseRow['Fecha_Cierre'] = new Date(d._fechaCierre).toLocaleDateString();
            }
            // @ts-ignore
            baseRow['Fecha_Verificacion'] = d.fecha_verificacion ? new Date(d.fecha_verificacion).toLocaleDateString() : '';

            const productosCompra = Array.isArray(d.productos_compra) ? d.productos_compra : [];
            const productosNovedad = Array.isArray(d.productos_novedad) ? d.productos_novedad : [];

            const novedadRows: Record<string, any>[] = [];
            productosNovedad.forEach(pn => {
                const problemas = Array.isArray(pn.problemas) && pn.problemas.length > 0
                    ? pn.problemas
                    : [{ tipo_problema_id: '', responsable_problema_id: '' }];

                problemas.forEach((prob: any) => {
                    novedadRows.push({
                        'Novedad_Cantidad': pn.cantidad || 1,
                        'Novedad_SKU': pn.sku || pn.codigo || '',
                        'Novedad_Referencia': pn.referencia || pn.sku || pn.codigo || '',
                        'Novedad_Descripcion': pn.descripcion || pn.nombre || '',
                        'Novedad_Grupo': getGrupoForProduct(pn),
                        'Novedad_Familia': getGrupoForProduct(pn),
                        'Novedad_Planta': getPlantaForProduct(pn),
                        'Novedad_Medidas': pn.medidas || '',
                        'Novedad_Tipo_Problema': prob.tipo_problema_id ? (razonesMapExport.get(String(prob.tipo_problema_id)) || prob.tipo_problema_id) : '',
                        'Novedad_Responsable_Problema': prob.responsable_problema_id ? (responsablesMapExport.get(String(prob.responsable_problema_id)) || prob.responsable_problema_id) : '',
                        'Novedad_Fecha_Compra': pn.fecha_compra || '',
                        'Novedad_Fecha_Fabricacion': pn.fecha_fabricacion || '',
                    });
                });
            });

            const maxRows = Math.max(1, productosCompra.length, novedadRows.length);

            for (let i = 0; i < maxRows; i++) {
                const row = { ...baseRow };

                if (i < productosCompra.length) {
                    const pc = productosCompra[i];
                    row['Compra_Cantidad'] = pc.cantidad || 1;
                    row['Compra_SKU'] = pc.sku || pc.codigo || '';
                    row['Compra_Referencia'] = pc.referencia || pc.sku || '';
                    row['Compra_Descripcion'] = pc.descripcion || pc.nombre || '';
                    row['Fecha_Compra'] = pc.fecha_compra || (i < novedadRows.length ? novedadRows[i].Novedad_Fecha_Compra : '') || '';
                    row['Fecha_Fabricacion'] = pc.fecha_fabricacion || (i < novedadRows.length ? novedadRows[i].Novedad_Fecha_Fabricacion : '') || '';
                } else {
                    row['Compra_Cantidad'] = '';
                    row['Compra_SKU'] = '';
                    row['Compra_Referencia'] = '';
                    row['Compra_Descripcion'] = '';
                    row['Fecha_Compra'] = (i < novedadRows.length ? novedadRows[i].Novedad_Fecha_Compra : '') || '';
                    row['Fecha_Fabricacion'] = (i < novedadRows.length ? novedadRows[i].Novedad_Fecha_Fabricacion : '') || '';
                }

                if (i < novedadRows.length) {
                    row['Novedad_Cantidad'] = novedadRows[i].Novedad_Cantidad;
                    row['Novedad_SKU'] = novedadRows[i].Novedad_SKU;
                    row['Novedad_Referencia'] = novedadRows[i].Novedad_Referencia;
                    row['Novedad_Descripcion'] = novedadRows[i].Novedad_Descripcion;
                    row['Novedad_Grupo'] = novedadRows[i].Novedad_Grupo;
                    row['Novedad_Familia'] = novedadRows[i].Novedad_Familia;
                    row['Novedad_Planta'] = novedadRows[i].Novedad_Planta;
                    row['Novedad_Medidas'] = novedadRows[i].Novedad_Medidas;
                    row['Novedad_Tipo_Problema'] = novedadRows[i].Novedad_Tipo_Problema;
                    row['Novedad_Responsable_Problema'] = novedadRows[i].Novedad_Responsable_Problema;
                } else {
                    row['Novedad_Cantidad'] = '';
                    row['Novedad_SKU'] = '';
                    row['Novedad_Referencia'] = '';
                    row['Novedad_Descripcion'] = '';
                    row['Novedad_Grupo'] = '';
                    row['Novedad_Familia'] = '';
                    row['Novedad_Planta'] = '';
                    row['Novedad_Medidas'] = '';
                    row['Novedad_Tipo_Problema'] = '';
                    row['Novedad_Responsable_Problema'] = '';
                    row['Novedad_Fecha_Compra'] = '';
                    row['Novedad_Fecha_Fabricacion'] = '';
                }

                allRows.push(row);
            }
        });

        const worksheet = XLSX.utils.json_to_sheet(allRows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Base de Datos MAC");
        XLSX.writeFile(workbook, `Base_Datos_MAC_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    const tabs: Array<{ label: string; icon: React.ElementType }> = [
        { label: 'General', icon: LayoutDashboardIcon },
        { label: 'Detalle', icon: ListChecksIcon },
        { label: 'Agentes', icon: UsersIcon },
        { label: 'Informe', icon: FileTextIcon },
        { label: 'Análisis', icon: SparklesIcon },
        { label: 'QRR', icon: ShieldCheckIcon },
    ];

    if (loading) {
        return (
            <div className="flex h-screen flex-col items-center justify-center gap-5 bg-cream">
                <img src="/logo-firplak-wordmark.png" alt="FIRPLAK" className="h-5 w-auto opacity-90" />
                <div className="h-1 w-40 overflow-hidden rounded-full bg-border">
                    <div className="h-full w-1/3 animate-[mac-loading_1.1s_ease-in-out_infinite] rounded-full bg-brand" />
                </div>
                <p className="text-xs tracking-[0.18em] uppercase text-brand-light">Cargando indicadores</p>
                <style>{`@keyframes mac-loading { 0% { transform: translateX(-100%); } 100% { transform: translateX(300%); } }`}</style>
            </div>
        );
    }

    const crossFilterDefs = [
        { key: 'mercado', label: 'Mercado' },
        { key: 'defectos', label: 'Defecto' },
        { key: 'productos', label: 'Producto' },
        { key: 'ciudades', label: 'Ciudad' },
        { key: 'responsables', label: 'Responsable' },
        { key: 'zonas', label: 'Zona' },
        { key: 'clientes', label: 'Cliente' },
        { key: 'mesPresupuesto', label: 'Mes SLA' },
        { key: 'mesCreacion', label: 'Mes Ingreso' },
    ];

    return (
        <div className="min-h-screen bg-cream flex flex-col font-sans text-brand-dark" style={{ zoom }}>
            <header className="bg-white/95 backdrop-blur border-b border-border sticky top-0 z-20">
                <div className="px-6 h-16 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                        <a href="/" className="w-9 h-9 flex items-center justify-center rounded-lg text-stone-500 hover:text-brand hover:bg-cream-light transition-colors" title="Volver al menú principal">
                            <ArrowLeftIcon className="w-5 h-5" />
                        </a>
                        <div className="flex flex-col">
                            <img src="/logo-firplak-wordmark.png" alt="FIRPLAK" className="h-[15px] w-auto self-start" />
                            <span className="text-[10px] font-medium tracking-[0.2em] uppercase text-brand-light mt-1">Indicadores MAC</span>
                        </div>
                        <span className="hidden lg:block w-px h-7 bg-border mx-2" />
                        <p className="hidden lg:block text-xs text-ink-muted truncate">Inteligencia de la Mesa de Atención al Cliente</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <span
                            className={`hidden sm:inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-[11px] font-medium transition-opacity ${isUpdating ? 'opacity-100 bg-sage-soft text-brand' : 'opacity-0'}`}
                            aria-live="polite"
                        >
                            <span className="w-1.5 h-1.5 rounded-full bg-brand-light animate-pulse" /> Actualizando
                        </span>
                        <span className="hidden md:inline text-xs text-stone-500 tabular-nums">
                            <span className="font-semibold text-brand-dark">{filteredData.length.toLocaleString('es-CO')}</span> de {data.length.toLocaleString('es-CO')} registros
                        </span>
                        <div className="hidden sm:flex items-center p-0.5 rounded-xl bg-cream-light border border-border" role="group" aria-label="Tamaño de la vista">
                            {DENSIDADES.map(d => (
                                <button
                                    key={d.id}
                                    onClick={() => cambiarDensidad(d.id)}
                                    title={`Vista ${d.label.toLowerCase()}`}
                                    className={`h-8 px-2.5 rounded-lg flex items-center gap-1.5 text-xs font-medium transition-colors cursor-pointer ${
                                        densidad === d.id ? 'bg-white text-brand shadow-[0_1px_3px_rgba(37,65,83,0.15)]' : 'text-stone-500 hover:text-brand-dark'
                                    }`}
                                >
                                    <span className={`font-semibold leading-none ${d.size}`}>A</span>
                                    <span className="hidden xl:inline">{d.label}</span>
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={() => setShowExportModal(true)}
                            className="flex items-center gap-1.5 h-9 px-3.5 text-xs font-semibold text-white bg-brand hover:bg-brand-hover rounded-xl transition-colors whitespace-nowrap cursor-pointer"
                        >
                            <DownloadIcon className="w-3.5 h-3.5" />
                            Exportar Excel
                        </button>
                    </div>
                </div>

                {/* Pestañas */}
                <nav className="px-4 flex gap-1 overflow-x-auto [scrollbar-width:none]">
                    {tabs.map((tab, idx) => {
                        const Icon = tab.icon;
                        const active = activeTab === idx;
                        return (
                            <button
                                key={tab.label}
                                onClick={() => startTransition(() => setActiveTab(idx))}
                                className={`inline-flex items-center gap-2 px-3.5 py-3 text-xs font-medium whitespace-nowrap border-b-2 -mb-px transition-colors cursor-pointer ${
                                    active ? 'border-brand text-brand' : 'border-transparent text-stone-500 hover:text-brand-dark'
                                }`}
                            >
                                <Icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        );
                    })}
                </nav>
            </header>

            {/* Filtros cruzados activos */}
            {crossFilterDefs.some(f => (filters[f.key as keyof FilterState] as string[]).length > 0) && (
                <div className="bg-white/90 backdrop-blur border-b border-border px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 sticky top-[7.1rem] z-10">
                    <div className="flex flex-wrap items-center gap-2 flex-1">
                        <span className="text-[11px] font-medium tracking-[0.12em] uppercase text-brand-light mr-1 flex items-center gap-1.5"><ListFilterIcon className="w-3.5 h-3.5" />Filtros cruzados</span>
                        {crossFilterDefs.map(f => (filters[f.key as keyof FilterState] as string[]).map((val: string, idx: number) => {
                            let displayLabel = f.label;
                            let displayVal = val;
                            if (f.key === 'productos' && val.startsWith('PL:')) {
                                displayLabel = 'Planta';
                                displayVal = val.substring(3);
                            } else if (f.key === 'productos' && val.startsWith('GF:')) {
                                displayLabel = 'Grupo';
                                displayVal = val.substring(3);
                            }
                            return (
                                <span key={`${f.key}-${idx}`} className="bg-brand-soft text-brand text-xs pl-2.5 pr-1 py-1 rounded-full flex items-center gap-1.5 animate-fade-in">
                                    <span className="text-brand-light">{displayLabel}:</span> <span className="font-semibold">{displayVal}</span>
                                    <button onClick={() => setFilters(prev => ({ ...prev, [f.key]: (prev[f.key as keyof FilterState] as string[]).filter(v => v !== val) }))} className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-brand hover:text-white transition-colors cursor-pointer" title="Quitar filtro">
                                        <XIcon className="w-3 h-3" />
                                    </button>
                                </span>
                            );
                        }))}
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="text-xs font-semibold bg-brand text-white h-8 px-3 rounded-lg hover:bg-brand-hover transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                            Ver {filteredData.length} registros
                        </button>
                        <button
                            onClick={() => setFilters(prev => ({
                                ...prev, defectos: [], productos: [], plantas: [], ciudades: [], responsables: [], zonas: [], clientes: [], mesPresupuesto: [], mesCreacion: [], canalVenta: [], mercado: []
                            }))}
                            className="text-xs font-medium text-stone-500 hover:text-red-600 h-8 px-2 transition-colors whitespace-nowrap cursor-pointer"
                        >
                            Limpiar
                        </button>
                    </div>
                </div>
            )}

            <LiveFiltersContext.Provider value={liveFiltersCtx}>
            <main className={`flex-1 p-6 overflow-auto transition-opacity duration-150 ${isUpdating ? "opacity-70" : "opacity-100"}`}>
                {activeTab === 3 ? (
                    <div className="transition-opacity duration-300">
                        <Suspense fallback={<TabFallback />}>
                            <InformeMac 
                                data={filteredData} 
                                prevData={data}
                                dataForCanalVenta={dataForCanalVenta}
                                dataForProductos={dataForProductos}
                                dataForPlantas={dataForPlantas}
                                dataForMercado={dataForMercado}
                                filters={deferredFilters}
                                setFilters={setFilters} 
                                onFilterToggle={handleFilterToggle} 
                                filtersComponent={verticalFiltersEl}
                            />
                        </Suspense>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {activeTab !== 0 && activeTab !== 4 && (
                            <div className="mb-2">
                                <Filters filters={filters} setFilters={setFilters} data={data} activeTab={activeTab} isVertical={false} />
                            </div>
                        )}

                        <div className="mt-2 transition-opacity duration-300">
                            <Suspense fallback={<TabFallback />}>
                                {activeTab === 0 && (
                                    <GeneralMac
                                        data={filteredData}
                                        dataForDefectos={dataForDefectos}
                                        dataForResponsables={dataForResponsables}
                                        dataForCiudades={dataForCiudades}
                                        dataForZonas={dataForZonas}
                                        dataForClientes={dataForClientes}
                                        dataForProductos={dataForProductos}
                                        dataForMesCreacion={dataForMesCreacion}
                                        dataForCanalVenta={dataForCanalVenta}
                                        dataForMercado={dataForMercado}
                                        prevData={data}
                                        filters={deferredFilters}
                                        setFilters={setFilters}
                                        onFilterToggle={handleFilterToggle}
                                        razones={razones}
                                        defectosRef={defectosRef}
                                        responsablesRef={responsablesRef}
                                        filtersComponent={verticalFiltersEl}
                                    />
                                )}
                                {activeTab === 1 && <DetalleMac data={filteredData} dataForMesPresupuesto={dataForMesPresupuesto} dataForEstadoRiesgo={dataForEstadoRiesgo} prevData={data} filters={deferredFilters} setFilters={setFilters} onFilterToggle={handleFilterToggle} />}
                                {activeTab === 2 && <AgentesMac data={filteredData} prevData={data} filters={deferredFilters} setFilters={setFilters} onFilterToggle={handleFilterToggle} />}
                                {activeTab === 4 && <AnalisisMac data={filteredData} prevData={data} filters={deferredFilters} setFilters={setFilters} onFilterToggle={handleFilterToggle} qrrRecords={qrrRecords} onAddQRR={handleAddQRR} />}
                                {activeTab === 5 && <QrrMac data={filteredData} prevData={data} filters={deferredFilters} qrrRecords={qrrRecords} setQrrRecords={setQrrRecords} />}
                            </Suspense>
                        </div>
                    </div>
                )}
            </main>
            </LiveFiltersContext.Provider>

            {isModalOpen && (
                <DetalleRadicadosModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    data={filteredData}
                />
            )}

            {/* Modal de Exportación a Excel */}
            {showExportModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-dark/40 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl border border-border shadow-[0_30px_60px_-20px_rgba(37,65,83,0.45)] w-full max-w-md overflow-hidden animate-scale-in">
                        <div className="px-6 py-4 flex items-center justify-between border-b border-border">
                            <h3 className="text-brand-dark font-semibold flex items-center gap-2">
                                <DownloadIcon className="w-5 h-5" /> Exportar Base de Datos
                            </h3>
                            <button onClick={() => setShowExportModal(false)} className="text-stone-400 hover:text-brand transition-colors cursor-pointer">
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6">
                            <p className="text-sm text-stone-500 mb-6">
                                Selecciona el rango de fechas de creación de las solicitudes que deseas descargar. Si dejas los campos vacíos, se descargará toda la base de datos.
                            </p>

                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div>
                                    <label className="block text-xs font-bold text-stone-600 mb-1">Fecha Desde</label>
                                    <input
                                        type="date"
                                        value={exportStartDate}
                                        onChange={e => setExportStartDate(e.target.value)}
                                        className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-brand/20 focus:outline-none text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-stone-600 mb-1">Fecha Hasta</label>
                                    <input
                                        type="date"
                                        value={exportEndDate}
                                        onChange={e => setExportEndDate(e.target.value)}
                                        className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-brand/20 focus:outline-none text-sm"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-border">
                                <button
                                    onClick={() => setShowExportModal(false)}
                                    className="px-4 py-2 text-sm font-bold text-stone-500 hover:bg-cream-light rounded-lg transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={confirmExport}
                                    className="px-4 py-2 text-sm font-bold text-white bg-brand hover:bg-brand-hover rounded-xl transition-colors flex items-center gap-2"
                                >
                                    <DownloadIcon className="w-4 h-4" /> Descargar Excel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
