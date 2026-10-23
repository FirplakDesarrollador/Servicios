'use client';

import React, { useEffect, useState, useMemo, useCallback, Suspense, lazy, useTransition } from 'react';

import { supabase } from '@/lib/supabase';
import { RegistroMAC, FilterState, QRRRecord } from './types';
import Filters from './components/Filters';
import { DownloadIcon, XIcon, ListFilterIcon } from 'lucide-react';
import DetalleRadicadosModal from './components/DetalleRadicadosModal';
import * as XLSX from 'xlsx';
import { getBusinessDaysDifference, addBusinessDays } from './utils/businessDays';

// ── Lazy loading de tabs → no bloquea el render inicial ──────────────────────
const GeneralMac = lazy(() => import('./tabs/GeneralMac').then(m => ({ default: m.default })));
const CanalesVentaCard = lazy(() => import('./tabs/GeneralMac').then(m => ({ default: m.CanalesVentaCard })));
const DetalleMac = lazy(() => import('./tabs/DetalleMac'));
const AgentesMac = lazy(() => import('./tabs/AgentesMac'));
const InformeMac = lazy(() => import('./tabs/InformeMac'));
const AnalisisMac = lazy(() => import('./tabs/AnalisisMac'));
const QrrMac = lazy(() => import('./tabs/QrrMac'));

// ── Helpers para normalización de grupo / familia ───────────────────────────
const normalizeGrupo = (g: string): string => {
    if (!g || g === 'En Blanco' || g.toLowerCase() === 'en blanco') return 'En Blanco';
    const norm = String(g).trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (['COCINA', 'COCINAS'].includes(norm)) return 'Cocinas';
    if (['BANO', 'BANOS'].includes(norm)) return 'Baño';
    if (['HIDROTERAPIA', 'HIDROMASAJE', 'HIDROMASAJES', 'SPA', 'TINA'].includes(norm)) return 'Hidroterapia';
    if (['LABOR', 'LABORES'].includes(norm)) return 'Labores';
    if (['GRIFERIA', 'GRIFERIAS'].includes(norm)) return 'Griferia';
    if (['PLOMERIA', 'PLOMERIAS'].includes(norm)) return 'Plomeria';
    if (['SERVICIO', 'SERVICIOS'].includes(norm)) return 'Servicios';
    if (['CUIDADO&MANTENIMIENTO', 'CUIDADO & MANTENIMIENTO'].includes(norm)) return 'Cuidado&Mantenimiento';
    return 'En Blanco';
};

const normalizePlantaName = (planta: string): string => {
    if (!planta || !String(planta).trim() || String(planta).trim().toLowerCase().includes('seleccione')) return 'En Blanco';
    const p = String(planta).toUpperCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (['MARMOL', 'MARMOLES', 'PC'].includes(p)) return 'Marmol';
    if (['MUEBLE', 'MUEBLES', 'MBL'].includes(p)) return 'Muebles';
    if (['FIBRA', 'FIBRAS', 'FV', 'FVHM', 'FVHMP'].includes(p)) return 'Fibra';
    if (['COMERCIALIZADO', 'COMERCIALIZADOS'].includes(p)) return 'Comercializado';
    if (['SERVICIO', 'SERVICIOS'].includes(p)) return 'Servicios';
    if (p === 'RTM') return 'RTM';
    if (['QUARZTONE', 'CUARZO'].includes(p)) return 'Quarztone';
    return 'En Blanco';
};

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

// ── TabSuspense wrapper ──────────────────────────────────────────────────────
function TabFallback() {
    return (
        <div className="flex items-center justify-center py-24">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand" />
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

    // ── Filtros: comparar timestamps numéricos en vez de crear Date objects ──
    const getFilteredData = useCallback((excludeKeys: (keyof FilterState)[] = []) => {
        // Pre-calcular límites de fecha una sola vez (fuera del loop)
        const fechaInicialTs = filters.fechaInicial ? new Date(filters.fechaInicial).getTime() : null;
        const fechaFinalTs = filters.fechaFinal ? new Date(filters.fechaFinal).getTime() + 86400000 : null;

        return data.filter(d => {
            // Comparar timestamps numéricos (sin crear Date en cada iteración)
            const ts = (d as any)._createdAtTs as number;
            if (!excludeKeys.includes('fechaInicial') && fechaInicialTs !== null && ts < fechaInicialTs) return false;
            if (!excludeKeys.includes('fechaFinal') && fechaFinalTs !== null && ts > fechaFinalTs) return false;

            if (!excludeKeys.includes('estado') && filters.estado.length > 0 && !filters.estado.includes(d.estado)) return false;
            if (!excludeKeys.includes('mercado') && filters.mercado && filters.mercado.length > 0) {
                const itemMercado = (d as any)._mercado || 'Sin clasificar';
                if (!filters.mercado.includes(itemMercado)) return false;
            }
            if (!excludeKeys.includes('canalVenta') && filters.canalVenta.length > 0) {
                const activeFilters = filters.canalVenta.map(f => f.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
                const dCanal = (d.canal_venta || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                const match = activeFilters.some(f =>
                    dCanal === f || dCanal.includes(f) || f.includes(dCanal) ||
                    (f.includes('distribucion') && (dCanal.includes('distribuid') || dCanal.includes('ditribuid') || dCanal.includes('export'))) ||
                    (f.includes('constructor') && dCanal.includes('construct')) ||
                    ((f.includes('propio') || f.includes('b2c')) && (dCanal.includes('propio') || dCanal.includes('firplakhome') || dCanal.includes('ecommerce') || dCanal.includes('b2c'))) ||
                    (f.includes('especial') && dCanal.includes('especial'))
                );
                if (!match) return false;
            }
            if (!excludeKeys.includes('tipoSolicitud') && filters.tipoSolicitud.length > 0) {
                const normTipoSol = d.tipo_solicitud ? d.tipo_solicitud.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim() : '';
                const match = filters.tipoSolicitud.some(f => {
                    const normF = f.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
                    return normTipoSol === normF || normTipoSol.includes(normF) || normF.includes(normTipoSol);
                });
                if (!match) return false;
            }
            if (!excludeKeys.includes('agenteMac') && filters.agenteMac.length > 0 && !filters.agenteMac.includes(d._agenteNombre || '')) return false;

            if (!excludeKeys.includes('ciudades') && filters.ciudades.length > 0 && !filters.ciudades.includes(d._ciudad || '')) return false;
            if (!excludeKeys.includes('zonas') && filters.zonas.length > 0 && !filters.zonas.includes(d._zona || '')) return false;
            if (!excludeKeys.includes('clientes') && filters.clientes.length > 0 && !filters.clientes.includes(d._clientePrincipalFinal || '')) return false;
            if (!excludeKeys.includes('mesPresupuesto') && filters.mesPresupuesto.length > 0 && !filters.mesPresupuesto.includes(d._mesPresupuestoKey || '')) return false;
            if (!excludeKeys.includes('mesCreacion') && filters.mesCreacion.length > 0 && !filters.mesCreacion.includes(d._mesCreacionKey || '')) return false;
            if (!excludeKeys.includes('estadoRiesgo') && filters.estadoRiesgo.length > 0 && !filters.estadoRiesgo.includes(d._estadoRiesgo || '')) return false;

            if (!excludeKeys.includes('defectos') && filters.defectos.length > 0 && !filters.defectos.some(f => d._defectosNombres?.some((dn: any) => String(dn).toUpperCase().trim() === String(f).toUpperCase().trim()))) return false;
            if (!excludeKeys.includes('responsables') && filters.responsables.length > 0 && !filters.responsables.some(f => d._responsablesNombres?.some((rn: any) => String(rn).toUpperCase().trim() === String(f).toUpperCase().trim()))) return false;
            if (!excludeKeys.includes('productos') && filters.productos.length > 0 && !filters.productos.some(f => {
                if (String(f).toUpperCase().startsWith('PL:')) {
                    const plantaName = normalizePlantaName(String(f).substring(3)).toUpperCase().trim();
                    return d._plantasNombres?.some((pn: any) => String(pn).toUpperCase().trim() === plantaName);
                } else if (String(f).toUpperCase().startsWith('GF:')) {
                    const groupName = normalizeGrupo(String(f).substring(3)).toUpperCase().trim();
                    return (d as any)._gruposNombres?.some((gn: any) => String(gn).toUpperCase().trim() === groupName);
                } else {
                    return d._productosNombres?.some((pn: any) => String(pn).toUpperCase().trim() === String(f).toUpperCase().trim());
                }
            })) return false;
            if (!excludeKeys.includes('plantas') && filters.plantas.length > 0 && !filters.plantas.some(f => d._plantasNombres?.some((pn: any) => String(pn).toUpperCase().trim() === String(f).toUpperCase().trim()))) return false;

            return true;
        });
    }, [data, filters]);

    const filteredData = useMemo(() => getFilteredData(), [getFilteredData]);
    const dataForDefectos = useMemo(() => getFilteredData(['defectos']), [getFilteredData]);
    const dataForResponsables = useMemo(() => getFilteredData(['responsables']), [getFilteredData]);
    const dataForCiudades = useMemo(() => getFilteredData(['ciudades']), [getFilteredData]);
    const dataForZonas = useMemo(() => getFilteredData(['zonas']), [getFilteredData]);
    const dataForClientes = useMemo(() => getFilteredData(['clientes']), [getFilteredData]);
    const dataForProductos = useMemo(() => getFilteredData(['productos']), [getFilteredData]);
    const dataForPlantas = useMemo(() => getFilteredData(['plantas']), [getFilteredData]);
    const dataForMesPresupuesto = useMemo(() => getFilteredData(['mesPresupuesto']), [getFilteredData]);
    const dataForMesCreacion = useMemo(() => getFilteredData(['mesCreacion']), [getFilteredData]);
    const dataForCanalVenta = useMemo(() => getFilteredData(['canalVenta']), [getFilteredData]);
    const dataForMercado = useMemo(() => getFilteredData(['mercado']), [getFilteredData]);
    const dataForEstadoRiesgo = useMemo(() => getFilteredData(['estadoRiesgo']), [getFilteredData]);

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

    const tabs = ['General MAC', 'Detalle MAC', 'Agentes MAC', 'Informe', 'Análisis', 'QRR'];

    if (loading) {
        return <div className="flex h-screen items-center justify-center bg-gray-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand"></div></div>;
    }

    return (
        <div className="min-h-screen bg-[#f8f9fa] flex flex-col font-sans" style={{ zoom: 0.8 }}>
            <header className="bg-white border-b border-gray-200 px-6 pt-4 flex flex-col md:flex-row md:items-center justify-between sticky top-0 z-20 shadow-sm gap-4">
                <div className="pb-2 md:pb-4">
                    <h1 className="text-xl font-black text-gray-800 tracking-tight">Indicadores MAC</h1>
                    <p className="text-xs text-gray-500 font-medium mt-1">Módulo de inteligencia de negocios para Mesa de Atención al Cliente</p>
                </div>

                <div className="flex flex-wrap items-center gap-4 pb-3 md:pb-0">
                    <button
                        onClick={() => setShowExportModal(true)}
                        className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-lg shadow-sm transition-all whitespace-nowrap"
                    >
                        <DownloadIcon className="w-3.5 h-3.5" />
                        Exportar Excel
                    </button>

                    {/* Tabs */}
                    <div className="flex border-b border-transparent md:-mb-[1px] overflow-x-auto pb-1 md:pb-0">
                        {tabs.map((tab, idx) => (
                            <button
                                key={idx}
                                onClick={() => startTransition(() => setActiveTab(idx))}
                                className={`
                                    px-5 py-3 text-xs font-bold whitespace-nowrap transition-colors border-b-2
                                    ${activeTab === idx
                                        ? 'border-brand text-brand bg-gray-50/50'
                                        : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50/30'
                                    }
                                `}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            {/* Breadcrumb de Filtros Activos y Limpiar */}
            {(filters.defectos.length > 0 || filters.productos.length > 0 || filters.ciudades.length > 0 || filters.responsables.length > 0 || filters.zonas.length > 0 || filters.clientes.length > 0 || filters.mesPresupuesto.length > 0 || filters.canalVenta.length > 0 || filters.mercado.length > 0) && (
                <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shadow-sm z-10">
                    <div className="flex flex-wrap items-center gap-2 flex-1">
                        <span className="text-xs font-bold text-gray-500 mr-2 flex items-center gap-1"><ListFilterIcon className="w-3.5 h-3.5" />Filtros cruzados:</span>
                        {[
                            { key: 'mercado', label: 'Mercado' },
                            { key: 'defectos', label: 'Defecto' },
                            { key: 'productos', label: 'Producto' },
                            { key: 'ciudades', label: 'Ciudad' },
                            { key: 'responsables', label: 'Responsable' },
                            { key: 'zonas', label: 'Zona' },
                            { key: 'clientes', label: 'Cliente' },
                            { key: 'mesPresupuesto', label: 'Mes SLA' },
                            { key: 'mesCreacion', label: 'Mes Ingreso' },
                        ].map(f => (filters[f.key as keyof FilterState] as string[]).map((val: string, idx: number) => {
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
                                <span key={`${f.key}-${idx}`} className="bg-brand text-white text-xs font-semibold px-2 py-1 rounded-md flex items-center gap-1.5 shadow-sm animate-fade-in">
                                    {displayLabel}: {displayVal}
                                    <button onClick={() => setFilters(prev => ({ ...prev, [f.key]: (prev[f.key as keyof FilterState] as string[]).filter(v => v !== val) }))} className="hover:text-red-300 transition-colors">
                                        <XIcon className="w-3.5 h-3.5" />
                                    </button>
                                </span>
                            );
                        }))}
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="text-xs font-bold bg-brandLight text-white px-3 py-1.5 rounded-lg hover:bg-brand transition-colors flex items-center gap-1.5 shadow-sm"
                        >
                            Ver {filteredData.length} registros
                        </button>
                        <button
                            onClick={() => setFilters(prev => ({
                                ...prev, defectos: [], productos: [], plantas: [], ciudades: [], responsables: [], zonas: [], clientes: [], mesPresupuesto: [], mesCreacion: [], canalVenta: [], mercado: []
                            }))}
                            className="text-xs font-bold text-gray-500 hover:text-red-500 transition-colors whitespace-nowrap"
                        >
                            Restablecer filtros cruzados
                        </button>
                    </div>
                </div>
            )}

            <main className="flex-1 p-6 overflow-auto">
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
                                filters={filters}
                                setFilters={setFilters} 
                                onFilterToggle={handleFilterToggle} 
                                filtersComponent={
                                    <Filters filters={filters} setFilters={setFilters} data={data} activeTab={activeTab} isVertical={true} />
                                }
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
                                        filters={filters}
                                        setFilters={setFilters}
                                        onFilterToggle={handleFilterToggle}
                                        razones={razones}
                                        defectosRef={defectosRef}
                                        responsablesRef={responsablesRef}
                                        filtersComponent={<Filters filters={filters} setFilters={setFilters} data={data} activeTab={activeTab} isVertical={true} />}
                                    />
                                )}
                                {activeTab === 1 && <DetalleMac data={filteredData} dataForMesPresupuesto={dataForMesPresupuesto} dataForEstadoRiesgo={dataForEstadoRiesgo} prevData={data} filters={filters} setFilters={setFilters} onFilterToggle={handleFilterToggle} />}
                                {activeTab === 2 && <AgentesMac data={filteredData} prevData={data} filters={filters} setFilters={setFilters} onFilterToggle={handleFilterToggle} />}
                                {activeTab === 4 && <AnalisisMac data={filteredData} prevData={data} filters={filters} setFilters={setFilters} onFilterToggle={handleFilterToggle} qrrRecords={qrrRecords} onAddQRR={handleAddQRR} />}
                                {activeTab === 5 && <QrrMac data={filteredData} prevData={data} filters={filters} qrrRecords={qrrRecords} setQrrRecords={setQrrRecords} />}
                            </Suspense>
                        </div>
                    </div>
                )}
            </main>

            {isModalOpen && (
                <DetalleRadicadosModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    data={filteredData}
                />
            )}

            {/* Modal de Exportación a Excel */}
            {showExportModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-scale-in">
                        <div className="bg-emerald-600 px-6 py-4 flex items-center justify-between">
                            <h3 className="text-white font-black flex items-center gap-2">
                                <DownloadIcon className="w-5 h-5" /> Exportar Base de Datos
                            </h3>
                            <button onClick={() => setShowExportModal(false)} className="text-white/80 hover:text-white transition-colors">
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6">
                            <p className="text-sm text-gray-600 mb-6">
                                Selecciona el rango de fechas de creación de las solicitudes que deseas descargar. Si dejas los campos vacíos, se descargará toda la base de datos.
                            </p>

                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Fecha Desde</label>
                                    <input
                                        type="date"
                                        value={exportStartDate}
                                        onChange={e => setExportStartDate(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Fecha Hasta</label>
                                    <input
                                        type="date"
                                        value={exportEndDate}
                                        onChange={e => setExportEndDate(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                                <button
                                    onClick={() => setShowExportModal(false)}
                                    className="px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={confirmExport}
                                    className="px-4 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors flex items-center gap-2"
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
