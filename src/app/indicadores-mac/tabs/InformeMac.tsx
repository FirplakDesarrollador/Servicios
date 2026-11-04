'use client';
import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { RegistroMAC, FilterState, QRRRecord } from '../types';
import { ComparacionDetalle, ComparacionResumen, fmtVar, periodoAnteriorAutomatico, periodoDesdeFiltros } from '../components/ComparacionPeriodos';
import PanoramaMetas from '../components/PanoramaMetas';
import { normalizeGrupo, plantaDeVenta } from '../utils/filterEngine';
import { META_CALIDAD, META_ECONOMICA, generarDecisiones, generarResumen, getMercadoVenta, indicadoresDe, normalizeCanalName, type Entidad } from '../utils/panorama';
import { leerRadicados, type ComentarioHilo } from '../utils/temasComentarios';
import { resumirPor, totalProblemas, type LineaProblema } from '../utils/conteoProblemas';
import { buildMonthRangeFromKey, calculateVariation, filterByPeriod, getAvailableMonths, runFullAnalysis } from '../utils/analysisEngine';
import { supabase } from '@/lib/supabase';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip as RechartsTooltip, Legend, ResponsiveContainer, LabelList,
    LineChart, Line, ReferenceLine
} from 'recharts';
import {
    AlertTriangleIcon, CheckCircle2Icon, XCircleIcon, 
    TrendingUpIcon, AlertCircleIcon, ChevronDownIcon, ChevronUpIcon,
    DollarSign, FileText, Package, Briefcase, AlertOctagon
} from 'lucide-react';
import * as XLSX from 'xlsx';

// ── Types ──────────────────────────────────────────────────────────────────
interface Props {
    data: RegistroMAC[];
    prevData: RegistroMAC[];
    filters: FilterState;
    setFilters?: any;
    onFilterToggle: (key: keyof FilterState, value: string, e?: any) => void;
    filtersComponent?: React.ReactNode;
    dataForCanalVenta?: RegistroMAC[];
    dataForProductos?: RegistroMAC[];
    dataForPlantas?: RegistroMAC[];
    dataForMercado?: RegistroMAC[];
    /** Registros con todos los filtros salvo el periodo: base de la comparación entre periodos */
    dataComparable: RegistroMAC[];
    /** Igual que dataComparable, sin el filtro de esa tabla (la tabla sigue mostrando las demás filas) */
    dataComparableProductos: RegistroMAC[];
    dataComparablePlantas: RegistroMAC[];
    onAddQRR: (rec: Partial<QRRRecord>) => void;
}

interface VentaRecord {
    fecha_contabilizacion: string;
    cantidad: number;
    valor_total: number;
    familia: string;
    codigo_articulo: string;
    descripcion_articulo: string;
    zona: string;
    ciudad: string;
    tipo_documento: string;
    vendedor_senior: string;
    tipo_venta: string;
    grupo_cliente?: string;
    planta?: string;
    nombre_cliente?: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────
const valoresConPrefijo = (filtros: string[], prefijo: 'GF:' | 'PL:') =>
    filtros.filter((f) => String(f).toUpperCase().startsWith(prefijo)).map((f) => String(f).substring(3));
const MONTH_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const COLORS = ['#254153', '#749094', '#c96a4e', '#d3b99f', '#3b778c', '#10b981', '#f59e0b', '#ef4444', '#a67347', '#5b8e9e', '#4b5563', '#4a6b82', '#ec4899', '#f97316'];

const fmt$ = (v: number) => `$${Math.round(v).toLocaleString('es-CO')}`;
const fmtN = (v: number) => Math.round(v).toLocaleString('es-CO');
const fmtPct = (v: number | null) => {
    if (v === null || isNaN(v)) return '—';
    return `${v.toFixed(2)}%`;
};
const normalizeZoneName = (z: string | undefined | null): string => {
    if (!z) return 'SIN ZONA';
    return String(z).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
};

const normalizePlantaName = (planta: string) => {
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

const normalizeGrupoName = normalizeGrupo;

// Clave YYYY-MM de una fecha de contabilización (sin pasar por Date para evitar el corrimiento de zona horaria)
const ventaMonthKey = (fecha: string): string => {
    if (/^\d{4}-\d{2}/.test(fecha || '')) return fecha.slice(0, 7);
    const d = new Date(fecha);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const MERCADOS = ['Nacional', 'Internacional', 'Sin clasificar'];
const MERCADO_COLORS: Record<string, string> = { 'Nacional': '#254153', 'Internacional': '#3b778c', 'Sin clasificar': '#d3b99f' };

const getGrupoFromProduct = (p: any): string => {
    const grupoRaw = p?.familia;
    if (!grupoRaw || typeof grupoRaw !== 'string' || !String(grupoRaw).trim() || String(grupoRaw).toLowerCase().includes('seleccione')) {
        return 'En Blanco';
    }
    return normalizeGrupoName(grupoRaw);
};

// Hook para ordenamiento
function useSortable<T extends Record<string, any>>(data: T[], defaultKey: string = '', defaultDir: 'asc' | 'desc' = 'desc') {
    const [sortKey, setSortKey] = useState<string>(defaultKey);
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>(defaultDir);

    const sortedData = useMemo(() => {
        if (!sortKey) return data;
        return [...data].sort((a, b) => {
            const aVal = a[sortKey];
            const bVal = b[sortKey];
            if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
            return 0;
        });
    }, [data, sortKey, sortDir]);

    const requestSort = (key: string) => {
        if (sortKey === key) {
            setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortDir('desc');
        }
    };

    return { sortedData, requestSort, sortKey, sortDir };
}

// ── Componente Principal ───────────────────────────────────────────────────
const TAMANO_PAGINA = 1000;
async function cargarVentas(desde: string, hasta: string): Promise<VentaRecord[]> {
    const filas: VentaRecord[] = [];
    for (let inicio = 0; ; inicio += TAMANO_PAGINA) {
        const { data, error } = await supabase
            .from('Ventas')
            .select('fecha_contabilizacion, cantidad, valor_total, familia, codigo_articulo, descripcion_articulo, zona, ciudad, tipo_documento, vendedor_senior, tipo_venta, grupo_cliente, planta, nombre_cliente')
            .gte('fecha_contabilizacion', desde)
            .lte('fecha_contabilizacion', hasta)
            .order('id', { ascending: true })
            .range(inicio, inicio + TAMANO_PAGINA - 1);
        if (error) throw error;
        filas.push(...((data || []) as VentaRecord[]));
        if (!data || data.length < TAMANO_PAGINA) return filas;
    }
}

async function cargarHilo(): Promise<ComentarioHilo[]> {
    const filas: ComentarioHilo[] = [];
    for (let inicio = 0; ; inicio += TAMANO_PAGINA) {
        const { data, error } = await supabase
            .from('Comentarios_RegistroMAC')
            .select('numero_radicado, comentario, adjuntos')
            .order('id', { ascending: true })
            .range(inicio, inicio + TAMANO_PAGINA - 1);
        if (error) throw error;
        filas.push(...((data || []) as ComentarioHilo[]));
        if (!data || data.length < TAMANO_PAGINA) return filas;
    }
}

export default function InformeMac({ data, prevData, filters, filtersComponent, onFilterToggle, dataForCanalVenta, dataForProductos, dataForPlantas, dataForMercado, dataComparable, dataComparableProductos, dataComparablePlantas, onAddQRR }: Props) {
    // ── Comparación contra el periodo anterior ──────────────────────────────
    const [comparaCon, setComparaCon] = useState('auto');
    const periodoActual = useMemo(() => periodoDesdeFiltros(filters), [filters.mesCreacion, filters.fechaInicial, filters.fechaFinal]);
    const anteriorAutomatico = useMemo(() => periodoAnteriorAutomatico(periodoActual, filters.mesCreacion), [periodoActual, filters.mesCreacion]);
    const periodoAnterior = useMemo(() => (comparaCon === 'auto' ? anteriorAutomatico : buildMonthRangeFromKey(comparaCon)), [comparaCon, anteriorAutomatico]);
    const mesesParaComparar = useMemo(() => getAvailableMonths(prevData).filter((m) => m.key < periodoActual.start.slice(0, 7)).reverse(), [prevData, periodoActual]);
    useEffect(() => {
        // El mes elegido debe ser anterior al periodo actual; si el periodo cambió y ya no lo es, vuelve a automático
        if (comparaCon !== 'auto' && comparaCon >= periodoActual.start.slice(0, 7)) setComparaCon('auto');
    }, [comparaCon, periodoActual]);

    // Con meses salteados (ej.: agosto y octubre) el periodo va de agosto a octubre, pero septiembre no cuenta
    const sinMesesExcluidos = useCallback((registros: RegistroMAC[]) => {
        if (filters.mesCreacion.length === 0) return registros;
        const inicio = periodoActual.start.slice(0, 7);
        const fin = periodoActual.end.slice(0, 7);
        return registros.filter((r) => {
            const mes = r._mesCreacionKey;
            return !mes || mes < inicio || mes > fin || filters.mesCreacion.includes(mes);
        });
    }, [filters.mesCreacion, periodoActual]);

    const basePeriodos = useMemo(() => sinMesesExcluidos(dataComparable), [dataComparable, sinMesesExcluidos]);
    const comparacion = useMemo(() => runFullAnalysis(basePeriodos, periodoActual, periodoAnterior), [basePeriodos, periodoActual, periodoAnterior]);
    const defectoPorNombre = useMemo(() => new Map(comparacion.defects.map((d) => [d.name.toUpperCase().trim(), d])), [comparacion]);

    /** Variación de problemas por grupo/planta entre los dos periodos */
    const variacionPor = useCallback((registros: RegistroMAC[], claveDe: (l: LineaProblema) => string) => {
        const base = sinMesesExcluidos(registros);
        const actual = resumirPor(filterByPeriod(base, periodoActual), claveDe);
        const anterior = resumirPor(filterByPeriod(base, periodoAnterior), claveDe);
        return (nombre: string) => calculateVariation(actual.get(nombre)?.problemas || 0, anterior.get(nombre)?.problemas || 0);
    }, [sinMesesExcluidos, periodoActual, periodoAnterior]);

    const [ventas, setVentas] = useState<VentaRecord[]>([]);
    const [loadingVentas, setLoadingVentas] = useState(false);
    const [metricView, setMetricView] = useState<'porcentajes' | 'unidades' | 'inversion'>('unidades');
    const [expandedProblem, setExpandedProblem] = useState<string | null>(null);

    // 1. Cargar Ventas
    useEffect(() => {
        let isMounted = true;
        if (!filters.fechaInicial || !filters.fechaFinal) return;
        setLoadingVentas(true);
        cargarVentas(filters.fechaInicial, filters.fechaFinal)
            .then((filas) => { if (isMounted) setVentas(filas); })
            .catch((err) => console.error('Error fetching ventas:', err))
            .finally(() => { if (isMounted) setLoadingVentas(false); });
        return () => { isMounted = false; };
    }, [filters.fechaInicial, filters.fechaFinal]);

    // Ventas del periodo de comparación: no bloquean la pantalla; los cambios aparecen cuando llegan
    const [ventasPrevias, setVentasPrevias] = useState<VentaRecord[]>([]);
    useEffect(() => {
        let isMounted = true;
        cargarVentas(periodoAnterior.start, periodoAnterior.end)
            .then((filas) => { if (isMounted) setVentasPrevias(filas); })
            .catch((err) => console.error('Error fetching ventas previas:', err));
        return () => { isMounted = false; };
    }, [periodoAnterior.start, periodoAnterior.end]);

    // Hilo de comentarios y fotos de los radicados
    const [hilo, setHilo] = useState<ComentarioHilo[]>([]);
    useEffect(() => {
        let isMounted = true;
        cargarHilo()
            .then((filas) => { if (isMounted) setHilo(filas); })
            .catch((err) => console.error('Error fetching comentarios:', err));
        return () => { isMounted = false; };
    }, []);

    // 2. Aplicar Filtros Globales a Ventas.
    // `exclude` deja por fuera un filtro para que su propia sección siga mostrando todas las opciones.
    const filterVentas = useCallback((exclude: (keyof FilterState)[] = [], fuente: VentaRecord[] = ventas) => {
        const activo = (k: keyof FilterState) => !exclude.includes(k) && ((filters[k] as string[]) || []).length > 0;
        const ciudades = filters.ciudades.map(c => c.toLowerCase());
        const zonas = filters.zonas.map(z => z.toLowerCase());
        const gruposFiltro = valoresConPrefijo(filters.productos, 'GF:').map(g => normalizeGrupoName(g).toUpperCase());
        const plantasFiltro = valoresConPrefijo(filters.productos, 'PL:').map(p => normalizePlantaName(p).toUpperCase());
        const referencias = filters.productos.filter(f => !/^(GF|PL):/i.test(String(f))).map(f => String(f).toUpperCase().trim());
        const canales = (filters.canalVenta || []).map(f => normalizeCanalName(f));
        const plantas = (filters.plantas || []).map(p => normalizePlantaName(p).toUpperCase());

        return fuente.filter(v => {
            if (activo('mesCreacion') && !filters.mesCreacion.includes(ventaMonthKey(v.fecha_contabilizacion))) return false;
            if (activo('mercado') && !filters.mercado.includes(getMercadoVenta(v.tipo_venta))) return false;
            if (activo('ciudades') && v.ciudad && !ciudades.includes(v.ciudad.toLowerCase())) return false;
            if (activo('zonas') && v.zona && !zonas.includes(v.zona.toLowerCase())) return false;
            if (activo('productos')) {
                const cumple = gruposFiltro.includes(normalizeGrupoName(v.familia).toUpperCase())
                    || plantasFiltro.includes(plantaDeVenta(v).toUpperCase())
                    || referencias.includes(String(v.descripcion_articulo || '').toUpperCase().trim())
                    || referencias.includes(String(v.codigo_articulo || '').toUpperCase().trim());
                if (!cumple) return false;
            }
            if (activo('canalVenta') && !canales.includes(normalizeCanalName(v.grupo_cliente || ''))) return false;
            if (activo('plantas') && !plantas.includes(plantaDeVenta(v).toUpperCase())) return false;
            return true;
        });
    }, [ventas, filters]);

    const filteredVentas = useMemo(() => filterVentas(), [filterVentas]);
    const ventasForCanal = useMemo(() => filterVentas(['canalVenta']), [filterVentas]);
    const ventasForProductos = useMemo(() => filterVentas(['productos']), [filterVentas]);
    const ventasForPlantas = useMemo(() => filterVentas(['plantas']), [filterVentas]);
    const ventasForMercado = useMemo(() => filterVentas(['mercado']), [filterVentas]);

    // 3. Procesar y Agrupar Datos (Cruce Real)
    const analytics = useMemo(() => {
        let unidadesVendidas = 0;
        let ventasTotales = 0;
        let registrosNovedad = data.length;
        let unidadesNovedad = 0;
        let inversionMac = 0;

        const monthly = new Map<string, any>();
        const byGroup = new Map<string, any>();
        const byProduct = new Map<string, any>();
        const byZone = new Map<string, any>();
        const byPlant = new Map<string, any>();
        const byCity = new Map<string, any>();
        const byCanalVenta = new Map<string, any>();
        
        // Estructuras para Tipo de Problema y Responsable
        const byProblem = new Map<string, any>();
        const byResponsible = new Map<string, any>();
        
        // Estructura para el gráfico de barras apiladas de problemas por mes
        const problemMonthlyEvolution = new Map<string, any>();

        const getOrCreate = (map: Map<string, any>, key: string) => {
            if (!map.has(key)) {
                map.set(key, { 
                    name: key, 
                    unidadesVendidas: 0, ventasTotales: 0, 
                    registros: 0, unidadesNovedad: 0, inversion: 0,
                    // Sub-agrupaciones para Drill-Down (solo MAC)
                    subProducts: new Map<string, any>(),
                    subResponsibles: new Map<string, any>(),
                    subZones: new Map<string, any>()
                });
            }
            return map.get(key);
        };

        // 3.1 Procesar Ventas
        filteredVentas.forEach(v => {
            unidadesVendidas += (v.cantidad || 0);
            ventasTotales += (v.valor_total || 0);

            const mKey = ventaMonthKey(v.fecha_contabilizacion);
            const gKey = normalizeGrupoName(v.familia);
            const pKey = `${v.codigo_articulo || 'N/A'} - ${v.descripcion_articulo || 'Sin Nombre'}`;
            const zKey = normalizeZoneName(v.zona);
            const cKey = (v.ciudad || 'SIN CIUDAD').toUpperCase();
            const canalKey = normalizeCanalName(v.grupo_cliente || '');
            const plKey = plantaDeVenta(v);

            [
                getOrCreate(monthly, mKey),
                getOrCreate(byGroup, gKey),
                getOrCreate(byProduct, pKey),
                getOrCreate(byZone, zKey),
                getOrCreate(byCity, cKey),
                getOrCreate(byPlant, plKey)
            ].forEach(obj => {
                obj.unidadesVendidas += (v.cantidad || 0);
                obj.ventasTotales += (v.valor_total || 0);
            });
            
            if(!problemMonthlyEvolution.has(mKey)) {
                problemMonthlyEvolution.set(mKey, { monthKey: mKey });
            }
        });

        // 3.2 Procesar Novedades MAC
        data.forEach(r => {
            const date = new Date(r.created_at);
            const mKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const inv = ((r as any).valor_servicio || 0) + ((r as any).valor_flete || 0) + ((r as any).valor_producto || 0);
            const zKey = normalizeZoneName((r as any)._zona || (r as any).Ubicaciones?.ciudades?.zonas?.zona);
            const cKey = r.Ubicaciones?.ciudades?.ciudad?.toUpperCase() || 'SIN CIUDAD';
            const canalKey = normalizeCanalName(r.canal_venta);
            
            inversionMac += inv;

            const mObj = getOrCreate(monthly, mKey);
            const zObj = getOrCreate(byZone, zKey);
            const cObj = getOrCreate(byCity, cKey);
            const canalObj = getOrCreate(byCanalVenta, canalKey);
            
            if(!problemMonthlyEvolution.has(mKey)) {
                problemMonthlyEvolution.set(mKey, { monthKey: mKey });
            }

            mObj.registros += 1;
            mObj.inversion += inv;
            zObj.registros += 1;
            zObj.inversion += inv;
            cObj.registros += 1;
            cObj.inversion += inv;

            const novs = Array.isArray(r.productos_novedad) ? r.productos_novedad : [];
            if (novs.length === 0) {
                unidadesNovedad += 1;
                mObj.unidadesNovedad += 1;
                zObj.unidadesNovedad += 1;
                cObj.unidadesNovedad += 1;
                
                const gObj = getOrCreate(byGroup, 'En Blanco');
                gObj.registros += 1;
                gObj.unidadesNovedad += 1;
                gObj.inversion += inv;

                const plObj = getOrCreate(byPlant, 'En Blanco');
                plObj.registros += 1;
                plObj.unidadesNovedad += 1;
                plObj.inversion += inv;

                const prObj = getOrCreate(byProduct, 'Sin Producto Asignado');
                prObj.registros += 1;
                prObj.unidadesNovedad += 1;
                prObj.inversion += inv;

                const respObj = getOrCreate(byResponsible, 'SIN ASIGNAR');
                respObj.registros += 1;
                respObj.unidadesNovedad += 1;
                respObj.inversion += inv;

                const probObj = getOrCreate(byProblem, 'No Especificado');
                probObj.registros += 1;
                probObj.unidadesNovedad += 1;
                probObj.inversion += inv;
            } else {
                const seenGroups = new Set<string>();
                const seenProducts = new Set<string>();
                const seenPlants = new Set<string>();
                novs.forEach((p: any) => {
                    const cant = p.cantidad || 1;
                    unidadesNovedad += cant;
                    mObj.unidadesNovedad += cant;
                    zObj.unidadesNovedad += cant;
                    cObj.unidadesNovedad += cant;
                    
                    const responsableProb = p.responsable || 'SIN ASIGNAR';
                    const respObj = getOrCreate(byResponsible, responsableProb);
                    respObj.unidadesNovedad += cant;
                    respObj.registros += 1;
                    respObj.inversion += (inv / novs.length);

                    const gKey = getGrupoFromProduct(p);
                    const pKey = `${p.codigo || 'N/A'} - ${p.descripcion || p.nombre || 'Sin Nombre'}`;
                    const gObj = getOrCreate(byGroup, gKey);
                    const prObj = getOrCreate(byProduct, pKey);

                    if (!seenGroups.has(gKey)) {
                        seenGroups.add(gKey);
                        gObj.registros += 1;
                    }
                    if (!seenProducts.has(pKey)) {
                        seenProducts.add(pKey);
                        prObj.registros += 1;
                    }

                    const plKey = normalizePlantaName(p.planta || '');
                    const plObj = getOrCreate(byPlant, plKey);
                    if (!seenPlants.has(plKey)) {
                        seenPlants.add(plKey);
                        plObj.registros += 1;
                    }
                    plObj.unidadesNovedad += cant;
                    plObj.inversion += (inv / novs.length);

                    gObj.unidadesNovedad += cant;
                    gObj.inversion += (inv / novs.length);
                    prObj.unidadesNovedad += cant;
                    prObj.inversion += (inv / novs.length);

                    // TIPO DE PROBLEMA (Crucial)
                    const probName = String(p.defecto || p.tipo_problema_id || 'No Especificado');
                    const probObj = getOrCreate(byProblem, probName);
                    probObj.unidadesNovedad += cant;
                    probObj.registros += 1;
                    probObj.inversion += (inv / novs.length);
                    
                    // Evolución Mensual del Problema
                    const pme = problemMonthlyEvolution.get(mKey);
                    pme[probName] = (pme[probName] || 0) + cant;

                    // Drill-Down: Productos dentro del problema
                    const probProd = getOrCreate(probObj.subProducts, pKey);
                    probProd.unidadesNovedad += cant;
                    probProd.inversion += (inv / novs.length);
                    probProd.registros += 1;
                    
                    // Drill-Down: Responsables dentro del problema
                    const probResp = getOrCreate(probObj.subResponsibles, responsableProb);
                    probResp.unidadesNovedad += cant;
                    probResp.inversion += (inv / novs.length);
                    probResp.registros += 1;
                    
                    // Drill-Down: Zonas/Ciudades dentro del problema
                    const probZoneCity = getOrCreate(probObj.subZones, `${zKey} - ${cKey}`);
                    probZoneCity.unidadesNovedad += cant;
                    probZoneCity.inversion += (inv / novs.length);
                    probZoneCity.registros += 1;
                });
            }
        });

        // Problemas, grupos y plantas se cuentan con la regla única (utils/conteoProblemas)
        const conteoDefectos = resumirPor(data, (l) => l.defecto);
        conteoDefectos.forEach((c, nombre) => {
            const obj = getOrCreate(byProblem, nombre === 'En Blanco' ? 'No Especificado' : nombre);
            obj.registros = c.problemas;
        });
        const conteoGrupos = resumirPor(data, (l) => l.grupo);
        byGroup.forEach((o, nombre) => { o.registros = conteoGrupos.get(nombre)?.problemas || 0; });
        const conteoPlantas = resumirPor(data, (l) => l.planta);
        byPlant.forEach((o, nombre) => { o.registros = conteoPlantas.get(nombre)?.problemas || 0; });
        const problemasTotal = totalProblemas(data);

        // Computed totals
        const pctNovedad = unidadesVendidas > 0 ? (unidadesNovedad / unidadesVendidas) * 100 : 0;
        const pctInversion = ventasTotales > 0 ? (inversionMac / ventasTotales) * 100 : 0;
        const pctCasos = unidadesVendidas > 0 ? (registrosNovedad / unidadesVendidas) * 100 : 0;

        const kpis = {
            problemasTotal, unidadesVendidas, ventasTotales, registrosNovedad, unidadesNovedad, inversionMac, pctNovedad, pctInversion, pctCasos
        };

        const computePct = (arr: any[]) => {
            const sorted = arr.sort((a,b) => a.name.localeCompare(b.name));
            return sorted.map((i, idx) => {
                const prev = idx > 0 ? sorted[idx - 1] : null;
                const pctNov = i.unidadesVendidas > 0 ? (i.unidadesNovedad / i.unidadesVendidas) * 100 : (i.unidadesNovedad > 0 ? 100 : 0);
                const pctInv = i.ventasTotales > 0 ? (i.inversion / i.ventasTotales) * 100 : (i.inversion > 0 ? 100 : 0);
                const pctReg = i.unidadesVendidas > 0 ? (i.registros / i.unidadesVendidas) * 100 : (i.registros > 0 ? 100 : 0);
                
                let varPctNovedad = null;
                let varPctInversion = null;
                let varPctCasos = null;
                
                if (prev) {
                    const prevPctNov = prev.unidadesVendidas > 0 ? (prev.unidadesNovedad / prev.unidadesVendidas) * 100 : (prev.unidadesNovedad > 0 ? 100 : 0);
                    const prevPctInv = prev.ventasTotales > 0 ? (prev.inversion / prev.ventasTotales) * 100 : (prev.inversion > 0 ? 100 : 0);
                    const prevPctReg = prev.unidadesVendidas > 0 ? (prev.registros / prev.unidadesVendidas) * 100 : (prev.registros > 0 ? 100 : 0);
                    varPctNovedad = pctNov - prevPctNov;
                    varPctInversion = pctInv - prevPctInv;
                    varPctCasos = pctReg - prevPctReg;
                }

                return { ...i, pctNovedad: pctNov, pctInversion: pctInv, pctCasos: pctReg, varPctNovedad, varPctInversion, varPctCasos };
            });
        };

        const monthlyArr = computePct(Array.from(monthly.values())).sort((a,b) => a.name.localeCompare(b.name));
        monthlyArr.forEach(m => {
            const [y, mo] = m.name.split('-');
            m.monthLabel = `${MONTH_SHORT[parseInt(mo)-1]} ${y}`;
        });
        
        const problemEvolArr = Array.from(problemMonthlyEvolution.values()).sort((a,b) => a.monthKey.localeCompare(b.monthKey));
        problemEvolArr.forEach(m => {
            const [y, mo] = m.monthKey.split('-');
            m.monthLabel = `${MONTH_SHORT[parseInt(mo)-1]} ${y}`;
        });
        
        const allProblemNames = Array.from(byProblem.keys());

        return {
            kpis,
            monthly: monthlyArr,
            problemMonthlyEvol: problemEvolArr,
            problemNames: allProblemNames,
            groups: computePct(Array.from(byGroup.values())).sort((a,b) => b.unidadesNovedad - a.unidadesNovedad),
            products: computePct(Array.from(byProduct.values())).sort((a,b) => b.unidadesNovedad - a.unidadesNovedad),
            plants: computePct(Array.from(byPlant.values())).sort((a,b) => b.unidadesNovedad - a.unidadesNovedad),
            zones: computePct(Array.from(byZone.values())).sort((a,b) => b.unidadesNovedad - a.unidadesNovedad),
            cities: computePct(Array.from(byCity.values())).sort((a,b) => b.unidadesNovedad - a.unidadesNovedad),
            problems: Array.from(byProblem.values()).sort((a,b) => b.registros - a.registros),
            responsibles: Array.from(byResponsible.values()).sort((a,b) => b.registros - a.registros),
            byProductMap: byProduct
        };

    }, [filteredVentas, data]);

    // 4. Procesar Canales de Venta (Mantiene TODOS los canales ignorando el filtro actual)
    const analyticsCanales = useMemo(() => {
        const byCanalVenta = new Map<string, any>();
        const getOrCreate = (map: Map<string, any>, key: string) => {
            if (!map.has(key)) {
                map.set(key, { 
                    name: key, 
                    unidadesVendidas: 0, ventasTotales: 0, 
                    registros: 0, unidadesNovedad: 0, inversion: 0,
                    mercados: { 'Nacional': 0, 'Internacional': 0, 'Sin clasificar': 0 }
                });
            }
            return map.get(key);
        };

        ventasForCanal.forEach(v => {
            const canalKey = normalizeCanalName(v.grupo_cliente || '');
            const obj = getOrCreate(byCanalVenta, canalKey);
            obj.unidadesVendidas += (v.cantidad || 0);
            obj.ventasTotales += (v.valor_total || 0);
        });

        const sourceData = dataForCanalVenta || prevData; // Si no hay dataForCanalVenta, usamos prevData
        sourceData.forEach(r => {
            const inv = ((r as any).valor_servicio || 0) + ((r as any).valor_flete || 0) + ((r as any).valor_producto || 0);
            const canalKey = normalizeCanalName(r.canal_venta);
            const canalObj = getOrCreate(byCanalVenta, canalKey);
            
            canalObj.registros += 1;
            canalObj.inversion += inv;

            const m = r._mercado || 'Sin clasificar';
            if (!canalObj.mercados) canalObj.mercados = { 'Nacional': 0, 'Internacional': 0, 'Sin clasificar': 0 };
            canalObj.mercados[m] = (canalObj.mercados[m] || 0) + 1;

            if (Array.isArray(r.productos_novedad)) {
                r.productos_novedad.forEach((p: any) => {
                    const cant = p.cantidad || 1;
                    canalObj.unidadesNovedad += cant;
                });
            }
        });

        const computePct = (arr: any[]) => {
            return arr.map(i => {
                const pctNov = i.unidadesVendidas > 0 ? (i.unidadesNovedad / i.unidadesVendidas) * 100 : (i.unidadesNovedad > 0 ? 100 : 0);
                const pctInv = i.ventasTotales > 0 ? (i.inversion / i.ventasTotales) * 100 : (i.inversion > 0 ? 100 : 0);
                const pctReg = i.unidadesVendidas > 0 ? (i.registros / i.unidadesVendidas) * 100 : (i.registros > 0 ? 100 : 0);
                const cTotal = i.registros || 1;
                const nacRegs = i.mercados?.['Nacional'] || 0;
                const intRegs = i.mercados?.['Internacional'] || 0;
                const sinRegs = i.mercados?.['Sin clasificar'] || 0;
                return { 
                    ...i, 
                    pctNovedad: pctNov, pctInversion: pctInv, pctRegistros: pctReg,
                    mercadoNacionalRegs: nacRegs,
                    mercadoNacionalPct: ((nacRegs / cTotal) * 100).toFixed(1),
                    mercadoInternacionalRegs: intRegs,
                    mercadoInternacionalPct: ((intRegs / cTotal) * 100).toFixed(1),
                    mercadoSinClasificarRegs: sinRegs,
                    mercadoSinClasificarPct: ((sinRegs / cTotal) * 100).toFixed(1),
                };
            });
        };

        return computePct(Array.from(byCanalVenta.values())).sort((a,b) => b.ventasTotales - a.ventasTotales);
    }, [ventasForCanal, dataForCanalVenta, prevData]);

    // 5. Indicadores por Mercado (mantiene todos los mercados ignorando el filtro de mercado)
    const analyticsMercados = useMemo(() => {
        const byMercado = new Map<string, any>(MERCADOS.map(m => [m, { name: m, unidadesVendidas: 0, ventasTotales: 0, registros: 0, unidadesNovedad: 0, inversion: 0 }]));

        ventasForMercado.forEach(v => {
            const obj = byMercado.get(getMercadoVenta(v.tipo_venta))!;
            obj.unidadesVendidas += (v.cantidad || 0);
            obj.ventasTotales += (v.valor_total || 0);
        });

        (dataForMercado || prevData).forEach(r => {
            const m = MERCADOS.includes(r._mercado || '') ? r._mercado! : 'Sin clasificar';
            const obj = byMercado.get(m)!;
            obj.registros += 1;
            obj.inversion += ((r as any).valor_servicio || 0) + ((r as any).valor_flete || 0) + ((r as any).valor_producto || 0);
            const novs = Array.isArray(r.productos_novedad) ? r.productos_novedad : [];
            obj.unidadesNovedad += novs.length === 0 ? 1 : novs.reduce((acc: number, p: any) => acc + (p.cantidad || 1), 0);
        });

        const totalVentas = Array.from(byMercado.values()).reduce((acc, i) => acc + i.ventasTotales, 0);
        return Array.from(byMercado.values())
            // "Sin clasificar" solo se muestra si tiene movimiento
            .filter(i => i.name !== 'Sin clasificar' || i.ventasTotales > 0 || i.registros > 0)
            .map(i => ({
                ...i,
                participacion: totalVentas > 0 ? (i.ventasTotales / totalVentas) * 100 : 0,
                pctNovedad: i.unidadesVendidas > 0 ? (i.unidadesNovedad / i.unidadesVendidas) * 100 : null,
                pctInversion: i.ventasTotales > 0 ? (i.inversion / i.ventasTotales) * 100 : null,
                pctCasos: i.unidadesVendidas > 0 ? (i.registros / i.unidadesVendidas) * 100 : null,
            }));
    }, [ventasForMercado, dataForMercado, prevData]);

    const variacionGrupo = useMemo(() => variacionPor(dataComparableProductos, (l) => l.grupo), [variacionPor, dataComparableProductos]);
    const variacionPlanta = useMemo(() => variacionPor(dataComparablePlantas, (l) => l.planta), [variacionPor, dataComparablePlantas]);

    const analyticsProductos = useMemo(() => {
        const byGroup = new Map<string, any>();
        const getOrCreate = (map: Map<string, any>, key: string) => {
            if (!map.has(key)) {
                map.set(key, { name: key, unidadesVendidas: 0, ventasTotales: 0, registros: 0, unidadesNovedad: 0, inversion: 0 });
            }
            return map.get(key);
        };

        ventasForProductos.forEach(v => {
            const gKey = normalizeGrupoName(v.familia);
            const obj = getOrCreate(byGroup, gKey);
            obj.unidadesVendidas += (v.cantidad || 0);
            obj.ventasTotales += (v.valor_total || 0);
        });

        const sourceData = dataForProductos || prevData;
        sourceData.forEach(r => {
            const inv = ((r as any).valor_servicio || 0) + ((r as any).valor_flete || 0) + ((r as any).valor_producto || 0);
            const novs = Array.isArray(r.productos_novedad) ? r.productos_novedad : [];
            if (novs.length === 0) {
                if (filters.plantas && filters.plantas.length > 0 && !filters.plantas.map(p => normalizePlantaName(p).toUpperCase()).includes('EN BLANCO')) {
                    return;
                }
                const obj = getOrCreate(byGroup, 'En Blanco');
                obj.registros += 1;
                obj.unidadesNovedad += 1;
                obj.inversion += inv;
            } else {
                const seenGroups = new Set<string>();
                novs.forEach((p: any) => {
                    const rawP = p.planta || '';
                    const planta = normalizePlantaName(rawP);
                    if (filters.plantas && filters.plantas.length > 0 && !filters.plantas.map(x => normalizePlantaName(x).toUpperCase()).includes(planta.toUpperCase())) {
                        return;
                    }

                    const cant = p.cantidad || 1;
                    const rawG = p.familia || '';
                    const gKey = normalizeGrupoName(rawG);
                    const obj = getOrCreate(byGroup, gKey);
                    
                    if (!seenGroups.has(gKey)) {
                        seenGroups.add(gKey);
                        obj.registros += 1;
                    }
                    obj.unidadesNovedad += cant;
                    obj.inversion += (inv / novs.length);
                });
            }
        });

        const computePct = (arr: any[]) => {
            return arr.map(i => {
                const pctNov = i.unidadesVendidas > 0 ? (i.unidadesNovedad / i.unidadesVendidas) * 100 : null;
                const pctInv = i.ventasTotales > 0 ? (i.inversion / i.ventasTotales) * 100 : null;
                const pctReg = i.unidadesVendidas > 0 ? (i.registros / i.unidadesVendidas) * 100 : null;
                return { ...i, pctNovedad: pctNov, pctInversion: pctInv, pctCasos: pctReg };
            });
        };

        const plantasFiltro = (filters.plantas || []).map(p => normalizePlantaName(p).toUpperCase());
        const conteo = resumirPor(sourceData, (l) => l.grupo, (l) => plantasFiltro.length === 0 || plantasFiltro.includes(l.planta.toUpperCase()));
        byGroup.forEach((o, nombre) => { o.registros = conteo.get(nombre)?.problemas || 0; });

        return computePct(Array.from(byGroup.values())).sort((a,b) => b.unidadesNovedad - a.unidadesNovedad);
    }, [ventasForProductos, dataForProductos, prevData, filters.plantas]);

    const analyticsPlantas = useMemo(() => {
        const gruposFiltrados = valoresConPrefijo(filters.productos || [], 'GF:').map(g => normalizeGrupoName(g).toUpperCase());
        const byPlant = new Map<string, any>();
        const getOrCreate = (map: Map<string, any>, key: string) => {
            if (!map.has(key)) {
                map.set(key, { name: key, unidadesVendidas: 0, ventasTotales: 0, registros: 0, unidadesNovedad: 0, inversion: 0 });
            }
            return map.get(key);
        };

        ventasForPlantas.forEach(v => {
            const plKey = plantaDeVenta(v);
            const obj = getOrCreate(byPlant, plKey);
            obj.unidadesVendidas += (v.cantidad || 0);
            obj.ventasTotales += (v.valor_total || 0);
        });

        const sourceData = dataForPlantas || prevData;
        sourceData.forEach(r => {
            const inv = ((r as any).valor_servicio || 0) + ((r as any).valor_flete || 0) + ((r as any).valor_producto || 0);
            const novs = Array.isArray(r.productos_novedad) ? r.productos_novedad : [];
            if (novs.length === 0) {
                if (gruposFiltrados.length > 0 && !gruposFiltrados.includes('EN BLANCO')) {
                    return;
                }
                const obj = getOrCreate(byPlant, 'En Blanco');
                obj.registros += 1;
                obj.unidadesNovedad += 1;
                obj.inversion += inv;
            } else {
                const seenPlants = new Set<string>();
                novs.forEach((p: any) => {
                    const rawG = p.familia || '';
                    const grupo = normalizeGrupoName(rawG);
                    if (gruposFiltrados.length > 0 && !gruposFiltrados.includes(grupo.toUpperCase())) {
                        return;
                    }

                    const cant = p.cantidad || 1;
                    const rawP = p.planta || '';
                    const plKey = normalizePlantaName(rawP);
                    const obj = getOrCreate(byPlant, plKey);
                    
                    if (!seenPlants.has(plKey)) {
                        seenPlants.add(plKey);
                        obj.registros += 1;
                    }
                    obj.unidadesNovedad += cant;
                    obj.inversion += (inv / novs.length);
                });
            }
        });

        const computePct = (arr: any[]) => {
            return arr.map(i => {
                const pctNov = i.unidadesVendidas > 0 ? (i.unidadesNovedad / i.unidadesVendidas) * 100 : null;
                const pctInv = i.ventasTotales > 0 ? (i.inversion / i.ventasTotales) * 100 : null;
                const pctReg = i.unidadesVendidas > 0 ? (i.registros / i.unidadesVendidas) * 100 : null;
                return { ...i, pctNovedad: pctNov, pctInversion: pctInv, pctCasos: pctReg };
            });
        };

        const conteoP = resumirPor(sourceData, (l) => l.planta, (l) => gruposFiltrados.length === 0 || gruposFiltrados.includes(l.grupo.toUpperCase()));
        byPlant.forEach((o, nombre) => { o.registros = conteoP.get(nombre)?.problemas || 0; });

        return computePct(Array.from(byPlant.values())).sort((a,b) => b.unidadesNovedad - a.unidadesNovedad);
    }, [ventasForPlantas, dataForPlantas, prevData, filters.productos]);

    const kpis = analytics.kpis;

    // Resumen Ejecutivo Dinamico y Textual
    const execSummary = useMemo(() => {
        if (!analytics.problems.length) return { text: "No hay suficientes datos.", topProbUnidades: null, topProbDinero: null, topProd: null, topProdDinero: null, topResp: null, topZone: null, topCity: null, probSubProdName: '', probRespName: '', topGroup: null, probUp: [] };
        
        const topProbUnidades = analytics.problems[0];
        const topProbDinero = [...analytics.problems].sort((a,b) => b.inversion - a.inversion)[0];
        const topProd = analytics.products[0] || {name: 'N/A', unidadesNovedad: 0};
        const topProdDinero = [...analytics.products].sort((a,b) => b.inversion - a.inversion)[0];
        const topResp = analytics.responsibles[0] || {name: 'N/A'};
        const topZone = analytics.zones[0] || {name: 'N/A'};
        const topCity = analytics.cities[0] || {name: 'N/A'};
        const topGroup = analytics.groups[0] || {name: 'N/A'};

        // Buscar el producto mas afectado del top problem
        let probSubProdName = 'Varios';
        if (topProbUnidades && topProbUnidades.subProducts) {
             const subProds = (Array.from(topProbUnidades.subProducts.values()) as any[]).sort((a: any, b: any) => (b.unidadesNovedad || 0) - (a.unidadesNovedad || 0));
             if (subProds.length > 0 && subProds[0]?.name) probSubProdName = subProds[0].name;
        }
        
        // Buscar responsable del top problem
        let probRespName = 'Varios';
        if (topProbUnidades && topProbUnidades.subResponsibles) {
             const subResp = (Array.from(topProbUnidades.subResponsibles.values()) as any[]).sort((a: any, b: any) => (b.unidadesNovedad || 0) - (a.unidadesNovedad || 0));
             if (subResp.length > 0 && subResp[0]?.name) probRespName = subResp[0].name;
        }

        // Problemas en crecimiento
        const probUp = [];
        if (analytics.problemMonthlyEvol.length >= 2) {
            const current = analytics.problemMonthlyEvol[analytics.problemMonthlyEvol.length - 1];
            const prev = analytics.problemMonthlyEvol[analytics.problemMonthlyEvol.length - 2];
            for (const pName of analytics.problemNames) {
                if ((current[pName] || 0) > (prev[pName] || 0)) {
                    probUp.push(pName);
                }
            }
        }

        const text = `Durante el período seleccionado se generaron ${fmt$(kpis.ventasTotales)} en ventas, correspondientes a ${fmtN(kpis.unidadesVendidas)} unidades vendidas, y una inversión MAC de ${fmt$(kpis.inversionMac)}. Se registraron ${fmtN(kpis.registrosNovedad)} casos de novedad (incidencia de casos del ${fmtPct(kpis.pctCasos)}), que afectaron a ${fmtN(kpis.unidadesNovedad)} unidades (incidencia de producto del ${fmtPct(kpis.pctNovedad)}), ambas frente a la meta del 1.00%. La inversión representó el ${fmtPct(kpis.pctInversion)} de las ventas, dentro de la meta del 0.50%.

El principal tipo de problema fue **${topProbUnidades.name}**, con ${fmtN(topProbUnidades.unidadesNovedad)} unidades afectadas y ${fmt$(topProbUnidades.inversion)} de inversión. 

Este problema se concentró principalmente en el producto **${probSubProdName}** y estuvo asociado al responsable **${probRespName}**, según la clasificación registrada en MAC.

El grupo con mayor incidencia fue **${topGroup.name}**, mientras que el mayor impacto económico se concentró en el problema **${topProbDinero.name}**. 

La inversión total representó el **${fmtPct(kpis.pctInversion)}** de las ventas, frente a una meta máxima de 0.50%.`;

        return { text, topProbUnidades, topProbDinero, topProd, topProdDinero, topResp, topZone, topCity, topGroup, probSubProdName, probRespName, probUp };
    }, [kpis, analytics]);


    // ── Panorama: metas, explicación, decisiones y resumen ──────────────────
    const lecturas = useMemo(() => leerRadicados(prevData, hilo), [prevData, hilo]);
    const ventasPreviasFiltradas = useMemo(() => filterVentas(['mesCreacion'], ventasPrevias), [filterVentas, ventasPrevias]);
    const datosPrevios = useMemo(() => filterByPeriod(basePeriodos, periodoAnterior), [basePeriodos, periodoAnterior]);

    const entidades = useMemo<Entidad[]>(() => {
        const crear = (dimension: Entidad['dimension'], nombre: string, i: any, unidadesVendidas: number, unidadesNovedad: number): Entidad => {
            const clave = { dimension, nombre };
            return {
                id: `${dimension}:${nombre}`, dimension, nombre,
                pctNovedad: unidadesVendidas > 0 ? i.pctNovedad : null,
                pctCasos: unidadesVendidas > 0 ? (i.pctCasos ?? i.pctRegistros) : null,
                pctInversion: i.ventasTotales > 0 ? i.pctInversion : null,
                unidadesVendidas, unidadesNovedad,
                previo: ventasPrevias.length > 0 ? indicadoresDe(clave, datosPrevios, ventasPreviasFiltradas) : null,
            };
        };
        const conMovimiento = (i: any) => i.unidadesNovedad > 0 || i.registros > 0;
        return [
            crear('empresa', 'Empresa', kpis, kpis.unidadesVendidas, kpis.unidadesNovedad),
            ...analyticsPlantas.filter(conMovimiento).map((i: any) => crear('planta', i.name, i, i.unidadesVendidas, i.unidadesNovedad)),
            ...analyticsProductos.filter(conMovimiento).map((i: any) => crear('grupo', i.name, i, i.unidadesVendidas, i.unidadesNovedad)),
            ...analyticsCanales.filter(conMovimiento).map((i: any) => crear('canal', i.name, i, i.unidadesVendidas, i.unidadesNovedad)),
            ...analyticsMercados.filter(conMovimiento).map((i: any) => crear('mercado', i.name, i, i.unidadesVendidas, i.unidadesNovedad)),
        ];
    }, [kpis, analyticsPlantas, analyticsProductos, analyticsCanales, analyticsMercados, datosPrevios, ventasPreviasFiltradas, ventasPrevias.length]);

    const decisiones = useMemo(() => generarDecisiones(comparacion, entidades, data, lecturas), [comparacion, entidades, data, lecturas]);
    const decisionPorNombre = useMemo(() => new Map(decisiones.map((d) => [d.problema.toUpperCase().trim(), d])), [decisiones]);
    const resumenEjecutivo = useMemo(
        () => generarResumen(entidades[0], entidades, comparacion, decisiones, data, filteredVentas, lecturas, periodoAnterior),
        [entidades, comparacion, decisiones, data, filteredVentas, lecturas, periodoAnterior],
    );

    if (loadingVentas) {
        return (
            <div className="flex flex-col items-center justify-center py-32 space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#254153]" />
                <p className="text-[#749094] font-medium">Cruzando información con el módulo de Ventas...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-24">
            
            {/* ENCABEZADO SUPERIOR CON FILTROS Y KPIS JUNTOS */}
            <div className="flex flex-col lg:flex-row gap-6">
                
                {/* FILTROS (IZQUIERDA) */}
                {filtersComponent && (
                    <div className="w-full lg:w-[260px] shrink-0">
                        {filtersComponent}
                    </div>
                )}
                
                {/* KPIs EJECUTIVOS (DERECHA) */}
                <div className="flex-1 min-w-0">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                        
                        {/* BLOQUE DE MÉTRICAS PEQUEÑAS (Izquierda) */}
                        <div className="lg:col-span-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {/* VENTAS */}
                            <div className="bg-white py-2 px-3.5 rounded-xl shadow-sm border border-border flex items-center justify-between gap-4">
                                <div className="flex flex-col justify-center">
                                    <span className="text-[9px] font-bold text-[#749094] uppercase tracking-wider mb-0.5">Ventas</span>
                                    <span className="text-[17px] font-bold text-[#254153] leading-none">{fmt$(kpis.ventasTotales)}</span>
                                </div>
                                <div className="p-1.5 bg-emerald-50 rounded-lg shrink-0">
                                    <DollarSign className="w-4 h-4 text-emerald-600" />
                                </div>
                            </div>
                            
                            {/* INVERSIÓN MAC */}
                            <div className="bg-white py-2 px-3.5 rounded-xl shadow-sm border border-border flex items-center justify-between gap-4">
                                <div className="flex flex-col justify-center">
                                    <span className="text-[9px] font-bold text-[#749094] uppercase tracking-wider mb-0.5">Inversión MAC</span>
                                    <span className="text-[17px] font-bold text-[#254153] leading-none">{fmt$(kpis.inversionMac)}</span>
                                </div>
                                <div className="p-1.5 bg-stone-100 rounded-lg shrink-0">
                                    <Briefcase className="w-4 h-4 text-[#254153]" />
                                </div>
                            </div>

                            {/* UNIDADES VENDIDAS */}
                            <div className="bg-white py-2 px-3.5 rounded-xl shadow-sm border border-border flex items-center justify-between gap-4">
                                <div className="flex flex-col justify-center">
                                    <span className="text-[9px] font-bold text-[#749094] uppercase tracking-wider mb-0.5">Unds Vendidas</span>
                                    <span className="text-[17px] font-bold text-[#254153] leading-none">{fmtN(kpis.unidadesVendidas)}</span>
                                </div>
                                <div className="p-1.5 bg-brand-soft rounded-lg shrink-0">
                                    <Package className="w-4 h-4 text-brand-light" />
                                </div>
                            </div>

                            {/* UNIDADES CON NOVEDAD */}
                            <div className="bg-white py-2 px-3.5 rounded-xl shadow-sm border border-border flex items-center justify-between gap-4">
                                <div className="flex flex-col justify-center">
                                    <span className="text-[9px] font-bold text-[#749094] uppercase tracking-wider mb-0.5">Unds con Novedad</span>
                                    <span className="text-[17px] font-bold text-[#1d1d1b] leading-none">{fmtN(kpis.unidadesNovedad)}</span>
                                </div>
                                <div className="p-1.5 bg-red-50 rounded-lg shrink-0">
                                    <AlertOctagon className="w-4 h-4 text-red-500" />
                                </div>
                            </div>

                            {/* REGISTROS DE NOVEDAD */}
                            <div className="bg-white py-2 px-3.5 rounded-xl shadow-sm border border-border flex items-center justify-between gap-4">
                                <div className="flex flex-col justify-center">
                                    <span className="text-[9px] font-bold text-[#749094] uppercase tracking-wider mb-0.5">Registros Novedad</span>
                                    <span className="text-[17px] font-bold text-[#1d1d1b] leading-none">{fmtN(kpis.registrosNovedad)}</span>
                                </div>
                                <div className="p-1.5 bg-orange-50 rounded-lg shrink-0">
                                    <FileText className="w-4 h-4 text-orange-500" />
                                </div>
                            </div>
                        </div>

                        {/* BLOQUE DE PORCENTAJES (Derecha) */}
                        <div className="lg:col-span-6 grid grid-cols-1 md:grid-cols-3 gap-3">
                            {/* % PRODUCTO CON NOVEDAD */}
                            <div className="bg-white p-3 rounded-xl shadow-sm border border-[#254153] flex flex-col justify-between h-full">
                                <div>
                                    <span className="text-[9px] font-bold text-[#254153] uppercase tracking-wider mb-1">% Producto con Novedad</span>
                                    <div className="flex items-baseline mb-2">
                                        <span className="text-xl font-bold text-[#1d1d1b]">{kpis.pctNovedad.toFixed(2)}%</span>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-1 text-[10px]">
                                    <div className="flex justify-between text-stone-500 font-medium">
                                        <span>Meta</span>
                                        <span>≤ {META_CALIDAD.toFixed(2)}%</span>
                                    </div>
                                    <div className="flex justify-between text-stone-500 font-medium">
                                        <span>Desviación</span>
                                        <span>{(kpis.pctNovedad - META_CALIDAD) > 0 ? '+' : ''}{(kpis.pctNovedad - META_CALIDAD).toFixed(2)} pp</span>
                                    </div>
                                    <div className={`mt-1 py-1 px-2 rounded-md font-bold text-center ${kpis.pctNovedad <= META_CALIDAD ? 'bg-[#f5f1ea] text-[#254153]' : 'bg-red-50 text-red-700'}`}>
                                        {kpis.pctNovedad <= META_CALIDAD ? 'Dentro de meta' : 'Sobre meta'}
                                    </div>
                                </div>
                            </div>

                            {/* % CASOS CON NOVEDAD */}
                            <div className="bg-white p-3 rounded-xl shadow-sm border border-[#254153] flex flex-col justify-between h-full">
                                <div>
                                    <span className="text-[9px] font-bold text-[#254153] uppercase tracking-wider mb-1">% Casos con Novedad</span>
                                    <div className="flex items-baseline mb-2">
                                        <span className="text-xl font-bold text-[#1d1d1b]">{kpis.pctCasos.toFixed(2)}%</span>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-1 text-[10px]">
                                    <div className="flex justify-between text-stone-500 font-medium">
                                        <span>Meta</span>
                                        <span>≤ {META_CALIDAD.toFixed(2)}%</span>
                                    </div>
                                    <div className="flex justify-between text-stone-500 font-medium">
                                        <span>Desviación</span>
                                        <span>{(kpis.pctCasos - META_CALIDAD) > 0 ? '+' : ''}{(kpis.pctCasos - META_CALIDAD).toFixed(2)} pp</span>
                                    </div>
                                    <div className={`mt-1 py-1 px-2 rounded-md font-bold text-center ${kpis.pctCasos <= META_CALIDAD ? 'bg-[#f5f1ea] text-[#254153]' : 'bg-red-50 text-red-700'}`}>
                                        {kpis.pctCasos <= META_CALIDAD ? 'Dentro de meta' : 'Sobre meta'}
                                    </div>
                                </div>
                            </div>

                            {/* % INVERSIÓN / VENTA */}
                            <div className="bg-white p-3 rounded-xl shadow-sm border border-[#254153] flex flex-col justify-between h-full">
                                <div>
                                    <span className="text-[9px] font-bold text-[#254153] uppercase tracking-wider mb-1">% Inversión / Venta</span>
                                    <div className="flex items-baseline mb-2">
                                        <span className="text-xl font-bold text-[#1d1d1b]">{kpis.pctInversion.toFixed(2)}%</span>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-1 text-[10px]">
                                    <div className="flex justify-between text-stone-500 font-medium">
                                        <span>Meta</span>
                                        <span>≤ {META_ECONOMICA.toFixed(2)}%</span>
                                    </div>
                                    <div className="flex justify-between text-stone-500 font-medium">
                                        <span>Desviación</span>
                                        <span>{(kpis.pctInversion - META_ECONOMICA) > 0 ? '+' : ''}{(kpis.pctInversion - META_ECONOMICA).toFixed(2)} pp</span>
                                    </div>
                                    <div className={`mt-1 py-1 px-2 rounded-md font-bold text-center ${kpis.pctInversion <= META_ECONOMICA ? 'bg-[#f5f1ea] text-[#254153]' : 'bg-red-50 text-red-700'}`}>
                                        {kpis.pctInversion <= META_ECONOMICA ? 'Dentro de meta' : 'Sobre meta'}
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                    </div>
                    
                    {/* RESUMEN EJECUTIVO TEXTUAL (Full Width) */}
                    <div className="mt-6 bg-[#f5f1ea] p-4 rounded-xl shadow-sm text-xs text-[#1d1d1b] leading-relaxed border border-[#e8e2d5]">
                        <span className="font-bold text-[#254153] uppercase tracking-wider block mb-1">Lectura Ejecutiva</span>
                        Durante el período seleccionado se generaron <strong>{fmt$(kpis.ventasTotales)}</strong> en ventas, correspondientes a <strong>{fmtN(kpis.unidadesVendidas)}</strong> unidades vendidas, y una inversión MAC de <strong>{fmt$(kpis.inversionMac)}</strong>. La incidencia de producto con novedad fue <strong>{kpis.pctNovedad.toFixed(2)}%</strong>, {kpis.pctNovedad <= META_CALIDAD ? 'dentro de' : 'superando'} la meta del {META_CALIDAD.toFixed(2)}%. La inversión representó el <strong>{kpis.pctInversion.toFixed(2)}%</strong> de las ventas, {kpis.pctInversion <= META_ECONOMICA ? 'dentro de' : 'superando'} la meta del {META_ECONOMICA.toFixed(2)}%.
                    </div>
                </div>

            </div>

            {/* RESUMEN, COMPARACIÓN, EXPLICACIÓN DE METAS Y DECISIONES */}
            <ComparacionResumen
                analysis={comparacion}
                actual={periodoActual}
                anterior={periodoAnterior}
                opciones={mesesParaComparar}
                comparaCon={comparaCon}
                onComparaCon={setComparaCon}
                registros={basePeriodos}
                onAddQRR={onAddQRR}
                resumen={resumenEjecutivo}
                decisiones={decisiones}
                panorama={<PanoramaMetas entidades={entidades} data={data} ventas={filteredVentas} lecturas={lecturas} />}
            />

            {/* INDICADORES POR MERCADO */}
            <div className="bg-white p-6 rounded-2xl border border-border shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
                    <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-[#254153] uppercase tracking-wider">Mercados</h3>
                        <span className="text-[10px] text-stone-400 font-bold bg-cream-light px-2 py-0.5 rounded-md border border-border">(% de Participación en Ventas)</span>
                    </div>
                    <span className="text-[10px] text-stone-400">Clic en una tarjeta para filtrar todo el informe por mercado</span>
                </div>

                {/* STACKED PROGRESS BAR */}
                <div className="w-full h-2 flex rounded-full overflow-hidden mb-6 bg-stone-100">
                    {analyticsMercados.map((m: any) => m.participacion > 0 && (
                        <div
                            key={m.name}
                            onClick={() => onFilterToggle('mercado', m.name)}
                            title={`${m.name}: ${m.participacion.toFixed(1)}%`}
                            style={{ width: `${m.participacion}%`, backgroundColor: MERCADO_COLORS[m.name] }}
                            className={`h-full border-r-2 border-white last:border-0 cursor-pointer transition-opacity ${filters.mercado.length > 0 && !filters.mercado.includes(m.name) ? 'opacity-30' : 'opacity-100'}`}
                        />
                    ))}
                </div>

                {/* CARDS */}
                <div className={`grid grid-cols-1 gap-4 ${analyticsMercados.length >= 3 ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
                    {analyticsMercados.map((m: any) => {
                        const isActive = filters.mercado.includes(m.name);
                        const indicadores = [
                            { label: '% Producto con Novedad', value: m.pctNovedad, meta: META_CALIDAD },
                            { label: '% Casos con Novedad', value: m.pctCasos, meta: META_CALIDAD },
                            { label: '% Inversión / Venta', value: m.pctInversion, meta: META_ECONOMICA },
                        ];
                        return (
                            <div
                                key={m.name}
                                onClick={() => onFilterToggle('mercado', m.name)}
                                className={`p-4 rounded-xl border bg-white shadow-sm hover:shadow-md transition-all cursor-pointer ${isActive ? 'border-[#254153] ring-1 ring-[#254153]' : 'border-border'} ${filters.mercado.length > 0 && !isActive ? 'opacity-40 hover:opacity-100' : 'opacity-100'}`}
                            >
                                {/* Header */}
                                <div className="flex justify-between items-center mb-2.5">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: MERCADO_COLORS[m.name] }} />
                                        <span className="text-[12px] font-bold text-[#254153]">Mercado {m.name}</span>
                                    </div>
                                    <span className="text-[12px] font-bold text-[#1d1d1b]">{m.participacion.toFixed(1)}%</span>
                                </div>
                                <div className="w-full h-1.5 bg-stone-100 rounded-full mb-3.5 overflow-hidden">
                                    <div className="h-full rounded-full" style={{ width: `${m.participacion}%`, backgroundColor: MERCADO_COLORS[m.name] }} />
                                </div>

                                {/* Totales */}
                                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[10px] pb-3 border-b border-border">
                                    <span className="text-stone-500">Ventas: <strong className="text-[#254153]">{fmt$(m.ventasTotales)}</strong></span>
                                    <span className="text-stone-500 text-right">Inv MAC: <strong className="text-[#254153]">{fmt$(m.inversion)}</strong></span>
                                    <span className="text-stone-500">Unds vendidas: <strong className="text-[#254153]">{fmtN(m.unidadesVendidas)}</strong></span>
                                    <span className="text-stone-500 text-right">Unds novedad: <strong className="text-[#254153]">{fmtN(m.unidadesNovedad)}</strong></span>
                                    <span className="text-stone-500">Casos: <strong className="text-[#254153]">{fmtN(m.registros)}</strong></span>
                                </div>

                                {/* Indicadores vs meta */}
                                <div className="grid grid-cols-3 gap-2 pt-3">
                                    {indicadores.map(ind => {
                                        const ok = ind.value === null || ind.value <= ind.meta;
                                        return (
                                            <div key={ind.label} className={`rounded-lg px-2 py-1.5 text-center ${ok ? 'bg-[#f5f1ea]' : 'bg-red-50'}`}>
                                                <div className="text-[8px] font-bold text-[#749094] uppercase tracking-wide leading-tight min-h-[20px]">{ind.label}</div>
                                                <div className={`text-sm font-bold ${ok ? 'text-[#254153]' : 'text-red-700'}`}>{fmtPct(ind.value)}</div>
                                                <div className="text-[9px] text-stone-400">Meta ≤ {ind.meta.toFixed(2)}%</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* PARTICIPACIÓN POR CANALES DE VENTA */}
            <div className="bg-white p-6 rounded-2xl border border-border shadow-sm mb-8">
                <div className="flex items-center gap-2 mb-6">
                    <h3 className="text-sm font-bold text-[#254153] uppercase tracking-wider">Canales de Venta</h3>
                    <span className="text-[10px] text-stone-400 font-bold bg-cream-light px-2 py-0.5 rounded-md border border-border">(% de Participación)</span>
                </div>

                {/* STACKED PROGRESS BAR */}
                <div className="w-full h-2 flex rounded-full overflow-hidden mb-6 bg-stone-100 relative">
                    {analyticsCanales.map((c: any, i: number) => {
                        const totalVentasAllCanales = analyticsCanales.reduce((acc, curr) => acc + curr.ventasTotales, 0);
                        const pct = totalVentasAllCanales > 0 ? (c.ventasTotales / totalVentasAllCanales) * 100 : 0;
                        if (pct === 0) return null;
                        const color = COLORS[i % COLORS.length];
                        return (
                            <div 
                                key={c.name} 
                                onClick={() => onFilterToggle('canalVenta', c.name)}
                                style={{ width: `${pct}%`, backgroundColor: color }}
                                className={`h-full border-r-2 border-white last:border-0 relative group cursor-pointer transition-opacity ${filters.canalVenta && filters.canalVenta.length > 0 && !filters.canalVenta.includes(c.name) ? 'opacity-30' : 'opacity-100'}`}
                            >
                                {/* Tooltip */}
                                <div className="opacity-0 group-hover:opacity-100 absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-[#121c22] text-white text-[10px] p-2.5 rounded-lg whitespace-nowrap z-10 transition-opacity pointer-events-none shadow-lg border border-white/10">
                                    <div className="flex justify-between gap-6 mb-2 border-b border-white/10 pb-1.5">
                                        <strong className="text-white font-bold">{c.name}</strong>
                                        <span className="text-brand-light font-bold">{pct.toFixed(1)}%</span>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <div className="flex justify-between gap-6">
                                            <span className="text-stone-400">Total en Ventas:</span>
                                            <span className="font-bold text-white">{fmt$(c.ventasTotales)}</span>
                                        </div>
                                        <div className="flex justify-between gap-6">
                                            <span className="text-stone-400">Unidades con Novedad:</span>
                                            <span className="font-bold text-orange-400">{fmtN(c.unidadesNovedad)} unds</span>
                                        </div>
                                        <div className="flex justify-between gap-6">
                                            <span className="text-stone-400">Casos (Registros):</span>
                                            <span className="font-bold text-brand-light">{fmtN(c.registros)}</span>
                                        </div>
                                        <div className="border-t border-white/10 pt-1.5 mt-1">
                                            <span className="text-stone-400 block mb-1 font-bold">Participación Mercado:</span>
                                            <div className="flex justify-between gap-4">
                                                <span className="text-emerald-300">Nacional:</span>
                                                <span className="font-bold text-white">{c.mercadoNacionalPct}% ({c.mercadoNacionalRegs})</span>
                                            </div>
                                            <div className="flex justify-between gap-4">
                                                <span className="text-brand-light">Internacional:</span>
                                                <span className="font-bold text-white">{c.mercadoInternacionalPct}% ({c.mercadoInternacionalRegs})</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* CARDS GRID */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                    {analyticsCanales.map((c: any, i: number) => {
                        const totalVentasAllCanales = analyticsCanales.reduce((acc, curr) => acc + curr.ventasTotales, 0);
                        const pct = totalVentasAllCanales > 0 ? (c.ventasTotales / totalVentasAllCanales) * 100 : 0;
                        const color = COLORS[i % COLORS.length];
                        const isActive = filters.canalVenta && filters.canalVenta.includes(c.name);
                        return (
                            <div 
                                key={c.name} 
                                onClick={() => onFilterToggle('canalVenta', c.name)}
                                className={`p-4 rounded-xl border bg-white shadow-sm hover:shadow-md transition-all cursor-pointer ${isActive ? 'border-[#254153] ring-1 ring-[#254153]' : 'border-border'} ${filters.canalVenta && filters.canalVenta.length > 0 && !isActive ? 'opacity-40 hover:opacity-100' : 'opacity-100'}`}
                            >
                                {/* Header */}
                                <div className="flex justify-between items-center mb-2.5">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                                        <span className="text-[11px] font-bold text-[#254153] truncate">{c.name}</span>
                                    </div>
                                    <span className="text-[11px] font-bold text-[#1d1d1b] shrink-0">{pct.toFixed(1)}%</span>
                                </div>
                                
                                {/* Mini Progress Bar */}
                                <div className="w-full h-1.5 bg-stone-100 rounded-full mb-3.5 overflow-hidden">
                                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                                </div>
                                
                                {/* Footer Metrics */}
                                <div className="flex flex-col gap-1.5 pt-1 border-t border-border">
                                    <div className="flex justify-between items-center text-[10px]">
                                        <span className="text-stone-500">Ventas: <strong className="text-[#254153]">{fmt$(c.ventasTotales)}</strong></span>
                                        <span className="text-stone-500">Inv MAC: <strong className={c.pctInversion <= META_ECONOMICA ? 'text-emerald-600' : 'text-red-600'}>{fmt$(c.inversion)} ({fmtPct(c.pctInversion)})</strong></span>
                                    </div>
                                    <div className="flex justify-between items-center text-[10px]">
                                        <span className="text-stone-500">Unds: <strong className="text-[#254153]">{fmtN(c.unidadesVendidas)}</strong></span>
                                        <span className="text-stone-500">Novedad: <strong className={c.pctNovedad <= META_CALIDAD ? 'text-emerald-600' : 'text-red-600'}>{fmtN(c.unidadesNovedad)} unds ({fmtPct(c.pctNovedad)})</strong></span>
                                    </div>
                                    <div className="flex justify-between items-center text-[10px] pt-1 border-t border-border">
                                        <span className="text-stone-500 font-medium">Mercado:</span>
                                        <span className="font-bold text-stone-700">Nac: {c.mercadoNacionalPct}% • Int: {c.mercadoInternacionalPct}%</span>
                                    </div>
                                    <div className="flex justify-end items-center text-[10px]">
                                        <span className="text-stone-500">Casos: <strong className={c.pctRegistros <= META_CALIDAD ? 'text-[#254153]' : 'text-red-600'}>{fmtN(c.registros)} reg. ({fmtPct(c.pctRegistros)})</strong></span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>


            {/* COMPORTAMIENTO MES A MES */}
            <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden flex flex-col xl:flex-row">
                <div className="flex-1 p-6 border-b xl:border-b-0 xl:border-r border-border">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                        <h3 className="text-sm font-bold text-[#254153] uppercase flex items-center gap-2">
                            <TrendingUpIcon className="w-4 h-4 text-[#749094]" />
                            Comportamiento Mes a Mes <span className="ml-1 text-[10px] font-medium normal-case tracking-normal text-stone-400">· clic en un mes para filtrar</span>
                        </h3>
                        <div className="flex bg-stone-100 p-1 rounded-lg">
                            <button onClick={() => setMetricView('unidades')} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-colors ${metricView === 'unidades' ? 'bg-white text-[#254153] shadow-sm' : 'text-stone-500 hover:text-[#254153]'}`}>Unidades</button>
                            <button onClick={() => setMetricView('inversion')} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-colors ${metricView === 'inversion' ? 'bg-white text-[#254153] shadow-sm' : 'text-stone-500 hover:text-[#254153]'}`}>Inversión</button>
                            <button onClick={() => setMetricView('porcentajes')} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-colors ${metricView === 'porcentajes' ? 'bg-white text-[#254153] shadow-sm' : 'text-stone-500 hover:text-[#254153]'}`}>Porcentajes</button>
                        </div>
                    </div>

                    <div className="h-72 w-full">
                        {metricView === 'porcentajes' && (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={analytics.monthly} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8e2d5" />
                                    <XAxis dataKey="monthLabel" tick={{ fontSize: 11, fill: '#8a8780' }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fontSize: 11, fill: '#8a8780' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                                    <RechartsTooltip 
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                        formatter={(val: any, name: any) => [fmtPct(Number(val) || 0), String(name || '')]}
                                    />
                                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                                    <ReferenceLine y={META_CALIDAD} stroke="#c96a4e" strokeDasharray="3 3" label={{ position: 'top', value: 'Meta Calidad 1%', fill: '#c96a4e', fontSize: 10 }} />
                                    <ReferenceLine y={META_ECONOMICA} stroke="#ef4444" strokeDasharray="3 3" label={{ position: 'bottom', value: 'Meta Inversión 0.5%', fill: '#ef4444', fontSize: 10 }} />
                                    <Line isAnimationActive={false} type="monotone" dataKey="pctNovedad" name="% Novedad" stroke="#c96a4e" strokeWidth={3} dot={{ r: 4, cursor: 'pointer' }} activeDot={{ r: 6, cursor: 'pointer', onClick: (_e: any, p: any) => { const m = p?.payload; if (m?.name) onFilterToggle('mesCreacion', m.name); } }} />
                                    <Line isAnimationActive={false} type="monotone" dataKey="pctInversion" name="% Inversión" stroke="#ef4444" strokeWidth={3} dot={{ r: 4, cursor: 'pointer' }} activeDot={{ r: 6, cursor: 'pointer', onClick: (_e: any, p: any) => { const m = p?.payload; if (m?.name) onFilterToggle('mesCreacion', m.name); } }} />
                                </LineChart>
                            </ResponsiveContainer>
                        )}
                        {metricView === 'unidades' && (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={analytics.monthly} margin={{ top: 30, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8e2d5" />
                                    <XAxis dataKey="monthLabel" tick={{ fontSize: 11, fill: '#8a8780' }} axisLine={false} tickLine={false} />
                                    <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#8a8780' }} axisLine={false} tickLine={false} tickFormatter={(v: any) => fmtN(Number(v) || 0)} />
                                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#8a8780' }} axisLine={false} tickLine={false} tickFormatter={(v: any) => fmtN(Number(v) || 0)} />
                                    <RechartsTooltip 
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                        formatter={(val: any, name: any) => [fmtN(Number(val) || 0), String(name || '')]}
                                    />
                                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                                    <Bar isAnimationActive={false} yAxisId="left" dataKey="unidadesVendidas" name="Unidades Vendidas" fill="#e8e2d5" radius={[4,4,0,0]} barSize={20} className="cursor-pointer" onClick={(b: any, _i: number, e: any) => b?.payload?.name && onFilterToggle('mesCreacion', b.payload.name, e)}>
                                        <LabelList dataKey="unidadesVendidas" position="top" fill="#b3bec4" fontSize={9} formatter={(v: any) => fmtN(Number(v) || 0)} />
                                    </Bar>
                                    <Bar isAnimationActive={false} yAxisId="right" dataKey="unidadesNovedad" name="Unidades Novedad" fill="#c96a4e" radius={[4,4,0,0]} barSize={20} className="cursor-pointer" onClick={(b: any, _i: number, e: any) => b?.payload?.name && onFilterToggle('mesCreacion', b.payload.name, e)}>
                                        <LabelList dataKey="unidadesNovedad" position="top" fill="#c96a4e" fontSize={9} formatter={(v: any) => fmtN(Number(v) || 0)} />
                                    </Bar>
                                    <Bar isAnimationActive={false} yAxisId="right" dataKey="registros" name="Cantidad Casos" fill="#3b778c" radius={[4,4,0,0]} barSize={20} className="cursor-pointer" onClick={(b: any, _i: number, e: any) => b?.payload?.name && onFilterToggle('mesCreacion', b.payload.name, e)}>
                                        <LabelList dataKey="registros" position="top" fill="#3b778c" fontSize={9} formatter={(v: any) => fmtN(Number(v) || 0)} />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                        {metricView === 'inversion' && (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={analytics.monthly} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8e2d5" />
                                    <XAxis dataKey="monthLabel" tick={{ fontSize: 11, fill: '#8a8780' }} axisLine={false} tickLine={false} />
                                    <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#8a8780' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v/1000000).toFixed(0)}M`} />
                                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#8a8780' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v/1000000).toFixed(1)}M`} />
                                    <RechartsTooltip 
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                        formatter={(val: any, name: any) => [fmt$(Number(val) || 0), String(name || '')]}
                                    />
                                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                                    <Bar isAnimationActive={false} yAxisId="left" dataKey="ventasTotales" name="$ Venta" fill="#e8e2d5" radius={[4,4,0,0]} barSize={20} className="cursor-pointer" onClick={(b: any, _i: number, e: any) => b?.payload?.name && onFilterToggle('mesCreacion', b.payload.name, e)} />
                                    <Bar isAnimationActive={false} yAxisId="right" dataKey="inversion" name="$ Inversión" fill="#ef4444" radius={[4,4,0,0]} barSize={20} className="cursor-pointer" onClick={(b: any, _i: number, e: any) => b?.payload?.name && onFilterToggle('mesCreacion', b.payload.name, e)} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>
                
                <div className="xl:w-[500px] flex flex-col">
                    <div className="p-4 border-b border-border bg-cream-light flex justify-between items-center">
                        <h3 className="text-[11px] font-bold text-[#254153] uppercase">Tabla Mensual (Tendencias)</h3>
                    </div>
                    <div className="flex-1 overflow-auto p-0">
                        <table className="w-full text-left text-xs whitespace-nowrap">
                            <thead className="bg-white sticky top-0 shadow-sm z-10">
                                <tr>
                                    <th className="p-3 font-bold text-[#749094]">Mes</th>
                                    <th className="p-3 font-bold text-[#749094] text-right">Unds Vend.</th>
                                    <th className="p-3 font-bold text-[#749094] text-right">Unds Nov.</th>
                                    <th className="p-3 font-bold text-[#749094] text-right">Casos</th>
                                    <th className="p-3 font-bold text-[#749094] text-right">% Nov.</th>
                                    <th className="p-3 font-bold text-[#749094] text-right">% Casos</th>
                                    <th className="p-3 font-bold text-[#749094] text-right">% Inv.</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {analytics.monthly.map(m => {
                                    const novTrendIcon = m.varPctNovedad === null ? '' : (m.varPctNovedad > 0.05 ? '↑' : (m.varPctNovedad < -0.05 ? '↓' : '→'));
                                    const invTrendIcon = m.varPctInversion === null ? '' : (m.varPctInversion > 0.05 ? '↑' : (m.varPctInversion < -0.05 ? '↓' : '→'));
                                    
                                    return (
                                        <tr key={m.name} className="hover:bg-cream-light">
                                            <td className="p-3 font-medium text-[#1d1d1b]">{m.monthLabel}</td>
                                            <td className="p-3 text-right">{fmtN(m.unidadesVendidas)}</td>
                                            <td className="p-3 text-right font-bold text-[#c96a4e]">{fmtN(m.unidadesNovedad)}</td>
                                            <td className="p-3 text-right font-bold text-[#3b778c]">{fmtN(m.registros)}</td>
                                            <td className="p-3 text-right">
                                                <div className={`font-bold ${m.pctNovedad > META_CALIDAD ? 'text-red-600' : 'text-green-600'}`}>{fmtPct(m.pctNovedad)}</div>
                                                {m.varPctNovedad !== null && (
                                                    <div className="text-[9px] text-stone-400 font-medium mt-0.5" title="Variación vs mes anterior">
                                                        {novTrendIcon} {m.varPctNovedad > 0 ? '+' : ''}{m.varPctNovedad.toFixed(2)} pp
                                                    </div>
                                                )}
                                            </td>
                                            <td className="p-3 text-right">
                                                <div className={`font-bold ${m.pctCasos > META_CALIDAD ? 'text-red-600' : 'text-[#254153]'}`}>{fmtPct(m.pctCasos)}</div>
                                                {m.varPctCasos !== null && (
                                                    <div className="text-[9px] text-stone-400 font-medium mt-0.5" title="Variación vs mes anterior">
                                                        {m.varPctCasos > 0.05 ? '↑' : (m.varPctCasos < -0.05 ? '↓' : '→')} {m.varPctCasos > 0 ? '+' : ''}{m.varPctCasos.toFixed(2)} pp
                                                    </div>
                                                )}
                                            </td>
                                            <td className="p-3 text-right">
                                                <div className={`font-bold ${m.pctInversion > META_ECONOMICA ? 'text-red-600' : 'text-green-600'}`}>{fmtPct(m.pctInversion)}</div>
                                                {m.varPctInversion !== null && (
                                                    <div className="text-[9px] text-stone-400 font-medium mt-0.5" title="Variación vs mes anterior">
                                                        {invTrendIcon} {m.varPctInversion > 0 ? '+' : ''}{m.varPctInversion.toFixed(2)} pp
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* TABLAS GENERALES CON CRUCE DE VENTAS */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden flex flex-col h-[400px]">
                    <div className="p-4 border-b border-border bg-cream-light flex justify-between items-center">
                        <h3 className="text-sm font-bold text-[#254153] uppercase">Comportamiento por Grupo de Producto</h3>
                    </div>
                    <div className="flex-1 overflow-auto p-0">
                        <table className="w-full text-left text-xs whitespace-nowrap">
                            <thead className="bg-white sticky top-0 shadow-sm z-10">
                                <tr>
                                    <th className="p-3 font-bold text-[#749094]">Grupo</th>
                                    <th className="p-3 font-bold text-[#749094] text-right" title="Un mismo defecto cuenta una vez por producto comprado">Problemas</th>
                                    <th className="p-3 font-bold text-[#749094] text-right">% Casos Reg.</th>
                                    <th className="p-3 font-bold text-[#749094] text-right">Unds Vend.</th>
                                    <th className="p-3 font-bold text-[#749094] text-right">Unds Nov.</th>
                                    <th className="p-3 font-bold text-[#749094] text-right">% Nov.</th>
                                    <th className="p-3 font-bold text-[#749094] text-right">% Inv.</th>
                                    <th className="p-3 font-bold text-[#749094] text-right" title={`Registros vs ${periodoAnterior.label}`}>Var. reg.</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {analyticsProductos.filter((g: any) => g.unidadesNovedad > 0 || g.registros > 0).map((g: any) => {
                                    const isSelected = filters.productos.includes(`GF:${g.name}`);
                                    return (
                                        <tr 
                                            key={g.name} 
                                            onClick={(e) => onFilterToggle('productos', `GF:${g.name}`, e)}
                                            className={`transition-colors cursor-pointer ${isSelected ? 'bg-brand-soft/70 border-l-4 border-brand-light' : 'hover:bg-cream-light border-l-4 border-transparent'}`}
                                        >
                                            <td className="p-3 font-medium text-[#1d1d1b]">{g.name}</td>
                                            <td className="p-3 text-right">{fmtN(g.registros)}</td>
                                            <td className="p-3 text-right font-medium text-stone-500">{fmtPct(g.pctCasos)}</td>
                                            <td className="p-3 text-right">{fmtN(g.unidadesVendidas)}</td>
                                            <td className="p-3 text-right font-medium text-[#c96a4e]">{fmtN(g.unidadesNovedad)}</td>
                                            <td className="p-3 text-right font-bold">{fmtPct(g.pctNovedad)}</td>
                                            <td className="p-3 text-right font-bold">{fmtPct(g.pctInversion)}</td>
                                            <td className="p-3 text-right">{fmtVar(variacionGrupo(g.name))}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden flex flex-col h-[400px]">
                    <div className="p-4 border-b border-border bg-cream-light flex justify-between items-center">
                        <h3 className="text-sm font-bold text-[#254153] uppercase">Comportamiento por Planta</h3>
                    </div>
                    <div className="flex-1 overflow-auto p-0">
                        <table className="w-full text-left text-xs whitespace-nowrap">
                            <thead className="bg-white sticky top-0 shadow-sm z-10">
                                <tr>
                                    <th className="p-3 font-bold text-[#749094]">Planta</th>
                                    <th className="p-3 font-bold text-[#749094] text-right" title="Un mismo defecto cuenta una vez por producto comprado">Problemas</th>
                                    <th className="p-3 font-bold text-[#749094] text-right">% Casos Reg.</th>
                                    <th className="p-3 font-bold text-[#749094] text-right">Unds Vend.</th>
                                    <th className="p-3 font-bold text-[#749094] text-right">Unds Nov.</th>
                                    <th className="p-3 font-bold text-[#749094] text-right">% Nov.</th>
                                    <th className="p-3 font-bold text-[#749094] text-right">% Inv.</th>
                                    <th className="p-3 font-bold text-[#749094] text-right" title={`Registros vs ${periodoAnterior.label}`}>Var. reg.</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {analyticsPlantas.filter((pl: any) => pl.unidadesNovedad > 0 || pl.registros > 0).map((pl: any) => {
                                    const isSelected = filters.plantas && filters.plantas.includes(pl.name);
                                    return (
                                        <tr 
                                            key={pl.name} 
                                            onClick={(e) => onFilterToggle('plantas', pl.name, e)}
                                            className={`transition-colors cursor-pointer ${isSelected ? 'bg-brand-soft/70 border-l-4 border-brand-light' : 'hover:bg-cream-light border-l-4 border-transparent'}`}
                                        >
                                            <td className="p-3 font-medium text-[#1d1d1b]">{pl.name}</td>
                                            <td className="p-3 text-right">{fmtN(pl.registros)}</td>
                                            <td className="p-3 text-right font-medium text-stone-500">{fmtPct(pl.pctCasos)}</td>
                                            <td className="p-3 text-right">{fmtN(pl.unidadesVendidas)}</td>
                                            <td className="p-3 text-right font-medium text-[#c96a4e]">{fmtN(pl.unidadesNovedad)}</td>
                                            <td className="p-3 text-right font-bold">{fmtPct(pl.pctNovedad)}</td>
                                            <td className="p-3 text-right font-bold">{fmtPct(pl.pctInversion)}</td>
                                            <td className="p-3 text-right">{fmtVar(variacionPlanta(pl.name))}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            {/* ANÁLISIS COMPLETO: TIPO DE PROBLEMA */}
            <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden flex flex-col">
                <div className="p-4 border-b border-border bg-cream-light flex justify-between items-center">
                    <h3 className="text-sm font-bold text-[#254153] uppercase">Comportamiento por Tipo de Problema (Drill-Down)</h3>
                </div>
                <div className="p-0 overflow-auto max-h-[800px]">
                    <table className="w-full text-left text-xs whitespace-nowrap">
                        <thead className="bg-white sticky top-0 shadow-sm z-10">
                            <tr>
                                <th className="p-3 font-bold text-[#749094] w-10"></th>
                                <th className="p-3 font-bold text-[#749094]">Tipo de Problema</th>
                                <th className="p-3 font-bold text-[#749094] text-right" title="Un mismo defecto cuenta una vez por producto comprado">Problemas</th>
                                <th className="p-3 font-bold text-[#749094] text-right">% de Problemas</th>
                                <th className="p-3 font-bold text-[#749094] text-right">Unidades Afectadas</th>
                                <th className="p-3 font-bold text-[#749094] text-right">% del Total Nov.</th>
                                <th className="p-3 font-bold text-[#749094] text-right">$ Inversión</th>
                                <th className="p-3 font-bold text-[#749094] text-right">% de Inversión Total</th>
                                <th className="p-3 font-bold text-[#749094] text-right" title={`Registros vs ${periodoAnterior.label}`}>Var. reg.</th>
                                <th className="p-3 font-bold text-[#749094] text-right" title={`Inversión vs ${periodoAnterior.label}`}>Var. $</th>
                                <th className="p-3 font-bold text-[#749094]">Decisión</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {analytics.problems.map(p => (
                                <React.Fragment key={p.name}>
                                    <tr 
                                        className={`hover:bg-cream-light transition-colors cursor-pointer ${expandedProblem === p.name ? 'bg-brand-soft/50' : ''}`}
                                        onClick={() => setExpandedProblem(expandedProblem === p.name ? null : p.name)}
                                    >
                                        <td className="p-3 text-center text-stone-400">
                                            {expandedProblem === p.name ? <ChevronUpIcon className="w-4 h-4 mx-auto" /> : <ChevronDownIcon className="w-4 h-4 mx-auto" />}
                                        </td>
                                        <td className="p-3 font-bold text-[#1d1d1b]">{p.name}</td>
                                        <td className="p-3 text-right">{fmtN(p.registros)}</td>
                                        <td className="p-3 text-right font-medium text-stone-500">{kpis.problemasTotal > 0 ? fmtPct((p.registros / kpis.problemasTotal)*100) : '0%'}</td>
                                        <td className="p-3 text-right font-bold text-[#c96a4e]">{fmtN(p.unidadesNovedad)}</td>
                                        <td className="p-3 text-right font-medium text-stone-500">{kpis.unidadesNovedad > 0 ? fmtPct((p.unidadesNovedad / kpis.unidadesNovedad)*100) : '0%'}</td>
                                        <td className="p-3 text-right font-bold text-red-600">{fmt$(p.inversion)}</td>
                                        <td className="p-3 text-right font-medium text-stone-500">{kpis.inversionMac > 0 ? fmtPct((p.inversion / kpis.inversionMac)*100) : '0%'}</td>
                                        <td className="p-3 text-right">{defectoPorNombre.get(p.name.toUpperCase().trim()) ? fmtVar(defectoPorNombre.get(p.name.toUpperCase().trim())!.variationRecords) : '—'}</td>
                                        <td className="p-3 text-right">{defectoPorNombre.get(p.name.toUpperCase().trim()) ? fmtVar(defectoPorNombre.get(p.name.toUpperCase().trim())!.variationValue) : '—'}</td>
                                        <td className="p-3 text-[10px] font-semibold whitespace-nowrap">{decisionPorNombre.get(p.name.toUpperCase().trim())?.accion || '—'}</td>
                                    </tr>
                                    {expandedProblem === p.name && (
                                        <tr className="bg-cream-light">
                                            <td colSpan={11} className="p-6">
                                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                                    {/* Drill-Down Productos */}
                                                    <div className="bg-white border border-border rounded-lg overflow-hidden shadow-sm">
                                                        <div className="bg-stone-100 p-2 border-b border-border font-bold text-[10px] uppercase text-[#254153]">1. Productos Afectados</div>
                                                        <ul className="max-h-48 overflow-auto divide-y divide-border">
                                                            {Array.from(p.subProducts.values())
                                                                .sort((a:any, b:any) => b.unidadesNovedad - a.unidadesNovedad)
                                                                .slice(0, 50).map((sp: any) => {
                                                                    // Buscar metricas globales del producto para cruzar
                                                                    const globalProd = analytics.byProductMap.get(sp.name);
                                                                    const pctNovProd = globalProd && globalProd.unidadesVendidas > 0 ? (sp.unidadesNovedad / globalProd.unidadesVendidas) * 100 : 0;
                                                                    const pctInvProd = globalProd && globalProd.ventasTotales > 0 ? (sp.inversion / globalProd.ventasTotales) * 100 : 0;
                                                                    
                                                                    return (
                                                                    <li key={sp.name} className="p-2 flex flex-col gap-1 text-[10px]">
                                                                        <div className="font-bold text-[#1d1d1b] truncate" title={sp.name}>{sp.name}</div>
                                                                        <div className="flex justify-between text-stone-500 bg-cream-light p-1 rounded">
                                                                            <span>Ventas: {fmtN(globalProd?.unidadesVendidas || 0)}</span>
                                                                            <span className="text-[#c96a4e] font-bold">Novedad: {fmtN(sp.unidadesNovedad)}</span>
                                                                            <span className="font-bold">Incidencia: {fmtPct(pctNovProd)}</span>
                                                                        </div>
                                                                        <div className="flex justify-between text-stone-500 bg-cream-light p-1 rounded">
                                                                            <span>$ Venta: {fmt$(globalProd?.ventasTotales || 0)}</span>
                                                                            <span className="text-red-600 font-bold">$ Inv: {fmt$(sp.inversion)}</span>
                                                                            <span className="font-bold">% Inv: {fmtPct(pctInvProd)}</span>
                                                                        </div>
                                                                    </li>
                                                                )})}
                                                        </ul>
                                                    </div>
                                                    {/* Drill-Down Responsables */}
                                                    <div className="bg-white border border-border rounded-lg overflow-hidden shadow-sm">
                                                        <div className="bg-stone-100 p-2 border-b border-border font-bold text-[10px] uppercase text-[#254153]">2. Responsables</div>
                                                        <ul className="max-h-48 overflow-auto divide-y divide-border">
                                                            {Array.from(p.subResponsibles.values()).sort((a:any, b:any) => b.unidadesNovedad - a.unidadesNovedad).map((sr: any) => (
                                                                <li key={sr.name} className="p-2 flex justify-between items-center text-[10px]">
                                                                    <span className="font-bold text-[#1d1d1b]">{sr.name}</span>
                                                                    <div className="flex gap-3 text-stone-500">
                                                                        <span className="text-[#c96a4e] font-bold">{fmtN(sr.unidadesNovedad)} Unds</span>
                                                                        <span className="text-red-600 font-bold">{fmt$(sr.inversion)}</span>
                                                                    </div>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                    {/* Drill-Down Zonas/Ciudades */}
                                                    <div className="bg-white border border-border rounded-lg overflow-hidden shadow-sm">
                                                        <div className="bg-stone-100 p-2 border-b border-border font-bold text-[10px] uppercase text-[#254153]">3. Zona / Ciudad</div>
                                                        <ul className="max-h-48 overflow-auto divide-y divide-border">
                                                            {Array.from(p.subZones.values()).sort((a:any, b:any) => b.unidadesNovedad - a.unidadesNovedad).slice(0,50).map((sz: any) => (
                                                                <li key={sz.name} className="p-2 flex justify-between items-center text-[10px]">
                                                                    <span className="font-bold text-[#1d1d1b] truncate">{sz.name}</span>
                                                                    <div className="flex gap-3 text-stone-500">
                                                                        <span className="text-[#c96a4e] font-bold">{fmtN(sz.unidadesNovedad)} Unds</span>
                                                                        <span className="text-red-600 font-bold">{fmt$(sz.inversion)}</span>
                                                                    </div>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            

            {/* QUIÉN Y DÓNDE ESTÁ CRECIENDO */}
            <ComparacionDetalle analysis={comparacion} filters={filters} onFilterToggle={onFilterToggle} />
        </div>
    );
}
