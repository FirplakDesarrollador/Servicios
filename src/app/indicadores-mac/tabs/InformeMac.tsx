'use client';
import React, { useMemo, useState, useEffect } from 'react';
import { RegistroMAC, FilterState } from '../types';
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
}

// ── Helpers ────────────────────────────────────────────────────────────────
const MONTH_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const COLORS = ['#254153', '#749094', '#c96a4e', '#d3b99f', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#4b5563', '#6366f1', '#ec4899', '#f97316'];
const META_CALIDAD = 1.0;
const META_ECONOMICA = 0.5;

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

const normalizeGrupoName = (g: string): string => {
    if (!g) return 'OTROS';
    const norm = String(g).trim().toUpperCase();
    if (['COCINA', 'COCINAS', 'MESON', 'MESONES', 'LAVAPLATOS'].includes(norm)) return 'COCINAS';
    if (['BAÑO', 'BAÑOS', 'BANO', 'BANOS', 'LAVAMANOS', 'MUEBLE', 'MUEBLES'].includes(norm)) return 'BAÑOS';
    if (['HIDROMASAJE', 'HIDROMASAJES', 'SPA', 'TINA'].includes(norm)) return 'HIDROMASAJES';
    if (['REPUESTO', 'REPUESTOS', 'REPOSICION', 'MPDIRECT'].includes(norm)) return 'COMERCIALIZADOS';
    if (['LAVARROPAS', 'ROPA', 'ROPAS'].includes(norm)) return 'ROPAS';
    if (['INFRAESTRUCTURA', 'PATA', 'PISO'].includes(norm)) return 'INFRAESTRUCTURA';
    if (norm.includes('HIDROPOR')) return 'HIDROMASAJES';
    if (norm.includes('MPDIRECT')) return 'COMERCIALIZADOS';
    if (norm.includes('HIDROEMP')) return 'HIDROMASAJES';
    return norm;
};

const normalizeCanalName = (g: string): string => {
    if (!g) return 'No Definido';
    const norm = String(g).trim().toLowerCase();
    if (norm.includes('distribu')) return 'Distribución';
    if (norm.includes('constructor')) return 'Constructor';
    if (norm.includes('exportador') || norm.includes('exportacion')) return 'Exportaciones';
    if (norm.includes('b2c') || norm.includes('propio') || norm.includes('ecommerce') || norm.includes('firplakhome')) return 'Canal Propio';
    if (norm.includes('especial')) return 'Ventas Especiales';
    return g;
};

const getGrupoFromProduct = (p: any): string => {
    let grupoRaw = p._grupo || p.grupo || p.grupo_producto || p.linea || p.familia || p.categoria || '';
    if (!grupoRaw) {
        const desc = (p.descripcion || p.nombre || '').toUpperCase();
        if (desc.includes('COCINA') || desc.includes('MESON') || desc.includes('LAVAPLATOS')) grupoRaw = 'COCINAS';
        else if (desc.includes('BAÑO') || desc.includes('BANO') || desc.includes('LAVAMANOS') || desc.includes('LVM') || desc.includes('MUEBLE') || desc.includes('MBLE')) grupoRaw = 'BAÑOS';
        else if (desc.includes('HIDROMASAJE') || desc.includes('SPA') || desc.includes('TINA')) grupoRaw = 'HIDROMASAJES';
        else if (desc.includes('REPUESTO')) grupoRaw = 'REPUESTOS';
        else if (desc.includes('INFRAESTRUCTURA')) grupoRaw = 'INFRAESTRUCTURA';
        else grupoRaw = 'OTROS';
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
export default function InformeMac({ data, prevData, filters, filtersComponent, onFilterToggle, dataForCanalVenta }: Props) {
    const [ventas, setVentas] = useState<VentaRecord[]>([]);
    const [loadingVentas, setLoadingVentas] = useState(false);
    const [metricView, setMetricView] = useState<'porcentajes' | 'unidades' | 'inversion'>('unidades');
    const [expandedProblem, setExpandedProblem] = useState<string | null>(null);

    // 1. Cargar Ventas
    useEffect(() => {
        let isMounted = true;
        const fetchVentas = async () => {
            if (!filters.fechaInicial || !filters.fechaFinal) return;
            setLoadingVentas(true);
            try {
                const { data: vData, error } = await supabase
                    .from('Ventas')
                    .select('fecha_contabilizacion, cantidad, valor_total, familia, codigo_articulo, descripcion_articulo, zona, ciudad, tipo_documento, vendedor_senior, tipo_venta, grupo_cliente')
                    .gte('fecha_contabilizacion', filters.fechaInicial)
                    .lte('fecha_contabilizacion', filters.fechaFinal);

                if (error) throw error;
                if (isMounted) {
                    setVentas(vData || []);
                }
            } catch (err) {
                console.error("Error fetching ventas:", err);
            } finally {
                if (isMounted) setLoadingVentas(false);
            }
        };
        fetchVentas();
        return () => { isMounted = false; };
    }, [filters.fechaInicial, filters.fechaFinal]);

    // 2. Aplicar Filtros Globales a Ventas
    const filteredVentas = useMemo(() => {
        return ventas.filter(v => {
            if (filters.ciudades.length > 0 && v.ciudad) {
                if (!filters.ciudades.map(c => c.toLowerCase()).includes(v.ciudad.toLowerCase())) return false;
            }
            if (filters.zonas.length > 0 && v.zona) {
                if (!filters.zonas.map(z => z.toLowerCase()).includes(v.zona.toLowerCase())) return false;
            }
            if (filters.productos.length > 0) {
                const normFam = normalizeGrupoName(v.familia);
                if (!filters.productos.map(p => normalizeGrupoName(p)).includes(normFam)) return false;
            }
            if (filters.canalVenta && filters.canalVenta.length > 0) {
                const activeNorms = filters.canalVenta.map(f => normalizeCanalName(f));
                const vNorm = normalizeCanalName(v.grupo_cliente);
                if (!activeNorms.includes(vNorm)) return false;
            }
            return true;
        });
    }, [ventas, filters]);

    // Ventas filtradas por todo EXCEPTO canalVenta (para mantener visibles todos los canales)
    const ventasForCanal = useMemo(() => {
        return ventas.filter(v => {
            if (filters.ciudades.length > 0 && v.ciudad) {
                if (!filters.ciudades.map(c => c.toLowerCase()).includes(v.ciudad.toLowerCase())) return false;
            }
            if (filters.zonas.length > 0 && v.zona) {
                if (!filters.zonas.map(z => z.toLowerCase()).includes(v.zona.toLowerCase())) return false;
            }
            if (filters.productos.length > 0) {
                const normFam = normalizeGrupoName(v.familia);
                if (!filters.productos.map(p => normalizeGrupoName(p)).includes(normFam)) return false;
            }
            return true;
        });
    }, [ventas, filters.ciudades, filters.zonas, filters.productos]);

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

            const date = new Date(v.fecha_contabilizacion);
            const mKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const gKey = normalizeGrupoName(v.familia);
            const pKey = `${v.codigo_articulo || 'N/A'} - ${v.descripcion_articulo || 'Sin Nombre'}`;
            const zKey = normalizeZoneName(v.zona);
            const cKey = (v.ciudad || 'SIN CIUDAD').toUpperCase();
            const canalKey = normalizeCanalName(v.grupo_cliente);

            [
                getOrCreate(monthly, mKey),
                getOrCreate(byGroup, gKey),
                getOrCreate(byProduct, pKey),
                getOrCreate(byZone, zKey),
                getOrCreate(byCity, cKey)
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



            if (Array.isArray(r.productos_novedad)) {
                const seenGroups = new Set<string>();
                const seenProducts = new Set<string>();
                r.productos_novedad.forEach((p: any) => {
                    const cant = p.cantidad || 1;
                    unidadesNovedad += cant;
                    mObj.unidadesNovedad += cant;
                    zObj.unidadesNovedad += cant;
                    cObj.unidadesNovedad += cant;
                    
                    const responsableProb = p.responsable || 'SIN ASIGNAR';
                    const respObj = getOrCreate(byResponsible, responsableProb);
                    respObj.unidadesNovedad += cant;
                    respObj.registros += 1;
                    respObj.inversion += (inv / r.productos_novedad.length);

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

                    gObj.unidadesNovedad += cant;
                    gObj.inversion += (inv / r.productos_novedad.length);
                    prObj.unidadesNovedad += cant;
                    prObj.inversion += (inv / r.productos_novedad.length);

                    // TIPO DE PROBLEMA (Crucial)
                    const probName = String(p.defecto || p.tipo_problema_id || 'No Especificado');
                    const probObj = getOrCreate(byProblem, probName);
                    probObj.unidadesNovedad += cant;
                    probObj.registros += 1;
                    probObj.inversion += (inv / r.productos_novedad.length);
                    
                    // Evolución Mensual del Problema
                    const pme = problemMonthlyEvolution.get(mKey);
                    pme[probName] = (pme[probName] || 0) + cant;

                    // Drill-Down: Productos dentro del problema
                    const probProd = getOrCreate(probObj.subProducts, pKey);
                    probProd.unidadesNovedad += cant;
                    probProd.inversion += (inv / r.productos_novedad.length);
                    probProd.registros += 1;
                    
                    // Drill-Down: Responsables dentro del problema
                    const probResp = getOrCreate(probObj.subResponsibles, responsableProb);
                    probResp.unidadesNovedad += cant;
                    probResp.inversion += (inv / r.productos_novedad.length);
                    probResp.registros += 1;
                    
                    // Drill-Down: Zonas/Ciudades dentro del problema
                    const probZoneCity = getOrCreate(probObj.subZones, `${zKey} - ${cKey}`);
                    probZoneCity.unidadesNovedad += cant;
                    probZoneCity.inversion += (inv / r.productos_novedad.length);
                    probZoneCity.registros += 1;
                });
            }
        });

        // Computed totals
        const pctNovedad = unidadesVendidas > 0 ? (unidadesNovedad / unidadesVendidas) * 100 : 0;
        const pctInversion = ventasTotales > 0 ? (inversionMac / ventasTotales) * 100 : 0;
        const pctCasos = unidadesVendidas > 0 ? (registrosNovedad / unidadesVendidas) * 100 : 0;

        const kpis = {
            unidadesVendidas, ventasTotales, registrosNovedad, unidadesNovedad, inversionMac, pctNovedad, pctInversion, pctCasos
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
                    registros: 0, unidadesNovedad: 0, inversion: 0
                });
            }
            return map.get(key);
        };

        ventasForCanal.forEach(v => {
            const canalKey = normalizeCanalName(v.grupo_cliente);
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
                return { ...i, pctNovedad: pctNov, pctInversion: pctInv, pctRegistros: pctReg };
            });
        };

        return computePct(Array.from(byCanalVenta.values())).sort((a,b) => b.ventasTotales - a.ventasTotales);
    }, [ventasForCanal, dataForCanalVenta, prevData]);

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
             const subProds = Array.from(topProbUnidades.subProducts.values()).sort((a:any, b:any) => b.unidadesNovedad - a.unidadesNovedad);
             if (subProds.length > 0) probSubProdName = subProds[0].name;
        }
        
        // Buscar responsable del top problem
        let probRespName = 'Varios';
        if (topProbUnidades && topProbUnidades.subResponsibles) {
             const subResp = Array.from(topProbUnidades.subResponsibles.values()).sort((a:any, b:any) => b.unidadesNovedad - a.unidadesNovedad);
             if (subResp.length > 0) probRespName = subResp[0].name;
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
                            <div className="bg-white py-2 px-3.5 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between gap-4">
                                <div className="flex flex-col justify-center">
                                    <span className="text-[9px] font-bold text-[#749094] uppercase tracking-wider mb-0.5">Ventas</span>
                                    <span className="text-[17px] font-black text-[#254153] leading-none">{fmt$(kpis.ventasTotales)}</span>
                                </div>
                                <div className="p-1.5 bg-emerald-50 rounded-lg shrink-0">
                                    <DollarSign className="w-4 h-4 text-emerald-600" />
                                </div>
                            </div>
                            
                            {/* INVERSIÓN MAC */}
                            <div className="bg-white py-2 px-3.5 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between gap-4">
                                <div className="flex flex-col justify-center">
                                    <span className="text-[9px] font-bold text-[#749094] uppercase tracking-wider mb-0.5">Inversión MAC</span>
                                    <span className="text-[17px] font-black text-[#254153] leading-none">{fmt$(kpis.inversionMac)}</span>
                                </div>
                                <div className="p-1.5 bg-slate-100 rounded-lg shrink-0">
                                    <Briefcase className="w-4 h-4 text-[#254153]" />
                                </div>
                            </div>

                            {/* UNIDADES VENDIDAS */}
                            <div className="bg-white py-2 px-3.5 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between gap-4">
                                <div className="flex flex-col justify-center">
                                    <span className="text-[9px] font-bold text-[#749094] uppercase tracking-wider mb-0.5">Unds Vendidas</span>
                                    <span className="text-[17px] font-black text-[#254153] leading-none">{fmtN(kpis.unidadesVendidas)}</span>
                                </div>
                                <div className="p-1.5 bg-blue-50 rounded-lg shrink-0">
                                    <Package className="w-4 h-4 text-blue-500" />
                                </div>
                            </div>

                            {/* UNIDADES CON NOVEDAD */}
                            <div className="bg-white py-2 px-3.5 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between gap-4">
                                <div className="flex flex-col justify-center">
                                    <span className="text-[9px] font-bold text-[#749094] uppercase tracking-wider mb-0.5">Unds con Novedad</span>
                                    <span className="text-[17px] font-black text-[#1d1d1b] leading-none">{fmtN(kpis.unidadesNovedad)}</span>
                                </div>
                                <div className="p-1.5 bg-red-50 rounded-lg shrink-0">
                                    <AlertOctagon className="w-4 h-4 text-red-500" />
                                </div>
                            </div>

                            {/* REGISTROS DE NOVEDAD */}
                            <div className="bg-white py-2 px-3.5 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between gap-4">
                                <div className="flex flex-col justify-center">
                                    <span className="text-[9px] font-bold text-[#749094] uppercase tracking-wider mb-0.5">Registros Novedad</span>
                                    <span className="text-[17px] font-black text-[#1d1d1b] leading-none">{fmtN(kpis.registrosNovedad)}</span>
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
                                        <span className="text-xl font-black text-[#1d1d1b]">{kpis.pctNovedad.toFixed(2)}%</span>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-1 text-[10px]">
                                    <div className="flex justify-between text-slate-500 font-medium">
                                        <span>Meta</span>
                                        <span>≤ {META_CALIDAD.toFixed(2)}%</span>
                                    </div>
                                    <div className="flex justify-between text-slate-500 font-medium">
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
                                        <span className="text-xl font-black text-[#1d1d1b]">{kpis.pctCasos.toFixed(2)}%</span>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-1 text-[10px]">
                                    <div className="flex justify-between text-slate-500 font-medium">
                                        <span>Meta</span>
                                        <span>≤ {META_CALIDAD.toFixed(2)}%</span>
                                    </div>
                                    <div className="flex justify-between text-slate-500 font-medium">
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
                                        <span className="text-xl font-black text-[#1d1d1b]">{kpis.pctInversion.toFixed(2)}%</span>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-1 text-[10px]">
                                    <div className="flex justify-between text-slate-500 font-medium">
                                        <span>Meta</span>
                                        <span>≤ {META_ECONOMICA.toFixed(2)}%</span>
                                    </div>
                                    <div className="flex justify-between text-slate-500 font-medium">
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

            {/* PARTICIPACIÓN POR CANALES DE VENTA */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm mb-8">
                <div className="flex items-center gap-2 mb-6">
                    <h3 className="text-sm font-black text-[#254153] uppercase tracking-wider">Canales de Venta</h3>
                    <span className="text-[10px] text-slate-400 font-bold bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">(% de Participación)</span>
                </div>

                {/* STACKED PROGRESS BAR */}
                <div className="w-full h-2 flex rounded-full overflow-hidden mb-6 bg-slate-100 relative">
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
                                <div className="opacity-0 group-hover:opacity-100 absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-[#121c22] text-white text-[10px] p-2.5 rounded-lg whitespace-nowrap z-10 transition-opacity pointer-events-none shadow-lg border border-slate-700">
                                    <div className="flex justify-between gap-6 mb-2 border-b border-slate-700 pb-1.5">
                                        <strong className="text-white font-bold">{c.name}</strong>
                                        <span className="text-blue-400 font-black">{pct.toFixed(1)}%</span>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <div className="flex justify-between gap-6">
                                            <span className="text-slate-400">Total en Ventas:</span>
                                            <span className="font-bold text-white">{fmt$(c.ventasTotales)}</span>
                                        </div>
                                        <div className="flex justify-between gap-6">
                                            <span className="text-slate-400">Unidades con Novedad:</span>
                                            <span className="font-bold text-orange-400">{fmtN(c.unidadesNovedad)} unds</span>
                                        </div>
                                        <div className="flex justify-between gap-6">
                                            <span className="text-slate-400">Casos (Registros):</span>
                                            <span className="font-bold text-blue-400">{fmtN(c.registros)}</span>
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
                                className={`p-4 rounded-xl border bg-white shadow-sm hover:shadow-md transition-all cursor-pointer ${isActive ? 'border-[#254153] ring-1 ring-[#254153]' : 'border-slate-200'} ${filters.canalVenta && filters.canalVenta.length > 0 && !isActive ? 'opacity-40 hover:opacity-100' : 'opacity-100'}`}
                            >
                                {/* Header */}
                                <div className="flex justify-between items-center mb-2.5">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                                        <span className="text-[11px] font-bold text-[#254153] truncate">{c.name}</span>
                                    </div>
                                    <span className="text-[11px] font-black text-[#1d1d1b] shrink-0">{pct.toFixed(1)}%</span>
                                </div>
                                
                                {/* Mini Progress Bar */}
                                <div className="w-full h-1.5 bg-slate-100 rounded-full mb-3.5 overflow-hidden">
                                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                                </div>
                                
                                {/* Footer Metrics */}
                                <div className="flex flex-col gap-1.5 pt-1 border-t border-slate-50">
                                    <div className="flex justify-between items-center text-[10px]">
                                        <span className="text-slate-500">Ventas: <strong className="text-[#254153]">{fmt$(c.ventasTotales)}</strong></span>
                                        <span className="text-slate-500">Inv MAC: <strong className={c.pctInversion <= META_ECONOMICA ? 'text-emerald-600' : 'text-red-600'}>{fmt$(c.inversion)} ({fmtPct(c.pctInversion)})</strong></span>
                                    </div>
                                    <div className="flex justify-between items-center text-[10px]">
                                        <span className="text-slate-500">Unds: <strong className="text-[#254153]">{fmtN(c.unidadesVendidas)}</strong></span>
                                        <span className="text-slate-500">Novedad: <strong className={c.pctNovedad <= META_CALIDAD ? 'text-emerald-600' : 'text-red-600'}>{fmtN(c.unidadesNovedad)} unds ({fmtPct(c.pctNovedad)})</strong></span>
                                    </div>
                                    <div className="flex justify-end items-center text-[10px]">
                                        <span className="text-slate-500">Casos: <strong className={c.pctRegistros <= META_CALIDAD ? 'text-[#254153]' : 'text-red-600'}>{fmtN(c.registros)} reg. ({fmtPct(c.pctRegistros)})</strong></span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>


            {/* COMPORTAMIENTO MES A MES */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col xl:flex-row">
                <div className="flex-1 p-6 border-b xl:border-b-0 xl:border-r border-slate-100">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                        <h3 className="text-sm font-black text-[#254153] uppercase flex items-center gap-2">
                            <TrendingUpIcon className="w-4 h-4 text-[#749094]" />
                            Comportamiento Mes a Mes
                        </h3>
                        <div className="flex bg-slate-100 p-1 rounded-lg">
                            <button onClick={() => setMetricView('unidades')} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-colors ${metricView === 'unidades' ? 'bg-white text-[#254153] shadow-sm' : 'text-slate-500 hover:text-[#254153]'}`}>Unidades</button>
                            <button onClick={() => setMetricView('inversion')} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-colors ${metricView === 'inversion' ? 'bg-white text-[#254153] shadow-sm' : 'text-slate-500 hover:text-[#254153]'}`}>Inversión</button>
                            <button onClick={() => setMetricView('porcentajes')} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-colors ${metricView === 'porcentajes' ? 'bg-white text-[#254153] shadow-sm' : 'text-slate-500 hover:text-[#254153]'}`}>Porcentajes</button>
                        </div>
                    </div>

                    <div className="h-72 w-full">
                        {metricView === 'porcentajes' && (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={analytics.monthly} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis dataKey="monthLabel" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                                    <RechartsTooltip 
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                        formatter={(val: number, name: string) => [fmtPct(val), name]}
                                    />
                                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                                    <ReferenceLine y={META_CALIDAD} stroke="#c96a4e" strokeDasharray="3 3" label={{ position: 'top', value: 'Meta Calidad 1%', fill: '#c96a4e', fontSize: 10 }} />
                                    <ReferenceLine y={META_ECONOMICA} stroke="#ef4444" strokeDasharray="3 3" label={{ position: 'bottom', value: 'Meta Inversión 0.5%', fill: '#ef4444', fontSize: 10 }} />
                                    <Line type="monotone" dataKey="pctNovedad" name="% Novedad" stroke="#c96a4e" strokeWidth={3} dot={{ r: 4 }} />
                                    <Line type="monotone" dataKey="pctInversion" name="% Inversión" stroke="#ef4444" strokeWidth={3} dot={{ r: 4 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        )}
                        {metricView === 'unidades' && (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={analytics.monthly} margin={{ top: 30, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis dataKey="monthLabel" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                    <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={fmtN} />
                                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={fmtN} />
                                    <RechartsTooltip 
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                        formatter={(val: number) => fmtN(val)}
                                    />
                                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                                    <Bar yAxisId="left" dataKey="unidadesVendidas" name="Unidades Vendidas" fill="#e8e2d5" radius={[4,4,0,0]} barSize={20}>
                                        <LabelList dataKey="unidadesVendidas" position="top" fill="#94a3b8" fontSize={9} formatter={fmtN} />
                                    </Bar>
                                    <Bar yAxisId="right" dataKey="unidadesNovedad" name="Unidades Novedad" fill="#c96a4e" radius={[4,4,0,0]} barSize={20}>
                                        <LabelList dataKey="unidadesNovedad" position="top" fill="#c96a4e" fontSize={9} formatter={fmtN} />
                                    </Bar>
                                    <Bar yAxisId="right" dataKey="registros" name="Cantidad Casos" fill="#3b82f6" radius={[4,4,0,0]} barSize={20}>
                                        <LabelList dataKey="registros" position="top" fill="#3b82f6" fontSize={9} formatter={fmtN} />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                        {metricView === 'inversion' && (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={analytics.monthly} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis dataKey="monthLabel" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                    <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v/1000000).toFixed(0)}M`} />
                                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v/1000000).toFixed(1)}M`} />
                                    <RechartsTooltip 
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                        formatter={(val: number) => fmt$(val)}
                                    />
                                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                                    <Bar yAxisId="left" dataKey="ventasTotales" name="$ Venta" fill="#e8e2d5" radius={[4,4,0,0]} barSize={20} />
                                    <Bar yAxisId="right" dataKey="inversion" name="$ Inversión" fill="#ef4444" radius={[4,4,0,0]} barSize={20} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>
                
                <div className="xl:w-[500px] flex flex-col">
                    <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                        <h3 className="text-[11px] font-black text-[#254153] uppercase">Tabla Mensual (Tendencias)</h3>
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
                            <tbody className="divide-y divide-slate-50">
                                {analytics.monthly.map(m => {
                                    const novTrendIcon = m.varPctNovedad === null ? '' : (m.varPctNovedad > 0.05 ? '↑' : (m.varPctNovedad < -0.05 ? '↓' : '→'));
                                    const invTrendIcon = m.varPctInversion === null ? '' : (m.varPctInversion > 0.05 ? '↑' : (m.varPctInversion < -0.05 ? '↓' : '→'));
                                    
                                    return (
                                        <tr key={m.name} className="hover:bg-slate-50">
                                            <td className="p-3 font-medium text-[#1d1d1b]">{m.monthLabel}</td>
                                            <td className="p-3 text-right">{fmtN(m.unidadesVendidas)}</td>
                                            <td className="p-3 text-right font-bold text-[#c96a4e]">{fmtN(m.unidadesNovedad)}</td>
                                            <td className="p-3 text-right font-bold text-[#3b82f6]">{fmtN(m.registros)}</td>
                                            <td className="p-3 text-right">
                                                <div className={`font-bold ${m.pctNovedad > META_CALIDAD ? 'text-red-600' : 'text-green-600'}`}>{fmtPct(m.pctNovedad)}</div>
                                                {m.varPctNovedad !== null && (
                                                    <div className="text-[9px] text-slate-400 font-medium mt-0.5" title="Variación vs mes anterior">
                                                        {novTrendIcon} {m.varPctNovedad > 0 ? '+' : ''}{m.varPctNovedad.toFixed(2)} pp
                                                    </div>
                                                )}
                                            </td>
                                            <td className="p-3 text-right">
                                                <div className={`font-bold ${m.pctCasos > META_CALIDAD ? 'text-red-600' : 'text-[#254153]'}`}>{fmtPct(m.pctCasos)}</div>
                                                {m.varPctCasos !== null && (
                                                    <div className="text-[9px] text-slate-400 font-medium mt-0.5" title="Variación vs mes anterior">
                                                        {m.varPctCasos > 0.05 ? '↑' : (m.varPctCasos < -0.05 ? '↓' : '→')} {m.varPctCasos > 0 ? '+' : ''}{m.varPctCasos.toFixed(2)} pp
                                                    </div>
                                                )}
                                            </td>
                                            <td className="p-3 text-right">
                                                <div className={`font-bold ${m.pctInversion > META_ECONOMICA ? 'text-red-600' : 'text-green-600'}`}>{fmtPct(m.pctInversion)}</div>
                                                {m.varPctInversion !== null && (
                                                    <div className="text-[9px] text-slate-400 font-medium mt-0.5" title="Variación vs mes anterior">
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
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col h-[400px]">
                    <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                        <h3 className="text-sm font-black text-[#254153] uppercase">Comportamiento por Grupo de Producto</h3>
                    </div>
                    <div className="flex-1 overflow-auto p-0">
                        <table className="w-full text-left text-xs whitespace-nowrap">
                            <thead className="bg-white sticky top-0 shadow-sm z-10">
                                <tr>
                                    <th className="p-3 font-bold text-[#749094]">Grupo</th>
                                    <th className="p-3 font-bold text-[#749094] text-right">Registros</th>
                                    <th className="p-3 font-bold text-[#749094] text-right">% Casos Reg.</th>
                                    <th className="p-3 font-bold text-[#749094] text-right">Unds Vend.</th>
                                    <th className="p-3 font-bold text-[#749094] text-right">Unds Nov.</th>
                                    <th className="p-3 font-bold text-[#749094] text-right">% Nov.</th>
                                    <th className="p-3 font-bold text-[#749094] text-right">% Inv.</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {analytics.groups.filter(g => g.unidadesNovedad > 0).map(g => (
                                    <tr key={g.name} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-3 font-medium text-[#1d1d1b]">{g.name}</td>
                                        <td className="p-3 text-right">{fmtN(g.registros)}</td>
                                        <td className="p-3 text-right font-medium text-slate-500">{fmtPct(g.pctCasos)}</td>
                                        <td className="p-3 text-right">{fmtN(g.unidadesVendidas)}</td>
                                        <td className="p-3 text-right font-medium text-[#c96a4e]">{fmtN(g.unidadesNovedad)}</td>
                                        <td className="p-3 text-right font-bold">{fmtPct(g.pctNovedad)}</td>
                                        <td className="p-3 text-right font-bold">{fmtPct(g.pctInversion)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col h-[400px]">
                    <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                        <h3 className="text-sm font-black text-[#254153] uppercase">Comportamiento por Zona</h3>
                    </div>
                    <div className="flex-1 overflow-auto p-0">
                        <table className="w-full text-left text-xs whitespace-nowrap">
                            <thead className="bg-white sticky top-0 shadow-sm z-10">
                                <tr>
                                    <th className="p-3 font-bold text-[#749094]">Zona</th>
                                    <th className="p-3 font-bold text-[#749094] text-right">Registros</th>
                                    <th className="p-3 font-bold text-[#749094] text-right">% Casos Reg.</th>
                                    <th className="p-3 font-bold text-[#749094] text-right">Unds Vend.</th>
                                    <th className="p-3 font-bold text-[#749094] text-right">Unds Nov.</th>
                                    <th className="p-3 font-bold text-[#749094] text-right">% Nov.</th>
                                    <th className="p-3 font-bold text-[#749094] text-right">% Inv.</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {analytics.zones.filter(z => z.unidadesNovedad > 0).map(z => (
                                    <tr key={z.name} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-3 font-medium text-[#1d1d1b]">{z.name}</td>
                                        <td className="p-3 text-right">{fmtN(z.registros)}</td>
                                        <td className="p-3 text-right font-medium text-slate-500">{fmtPct(z.pctCasos)}</td>
                                        <td className="p-3 text-right">{fmtN(z.unidadesVendidas)}</td>
                                        <td className="p-3 text-right font-medium text-[#c96a4e]">{fmtN(z.unidadesNovedad)}</td>
                                        <td className="p-3 text-right font-bold">{fmtPct(z.pctNovedad)}</td>
                                        <td className="p-3 text-right font-bold">{fmtPct(z.pctInversion)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            {/* ANÁLISIS COMPLETO: TIPO DE PROBLEMA */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                    <h3 className="text-sm font-black text-[#254153] uppercase">Comportamiento por Tipo de Problema (Drill-Down)</h3>
                </div>
                <div className="p-0 overflow-auto max-h-[800px]">
                    <table className="w-full text-left text-xs whitespace-nowrap">
                        <thead className="bg-white sticky top-0 shadow-sm z-10">
                            <tr>
                                <th className="p-3 font-bold text-[#749094] w-10"></th>
                                <th className="p-3 font-bold text-[#749094]">Tipo de Problema</th>
                                <th className="p-3 font-bold text-[#749094] text-right">Registros</th>
                                <th className="p-3 font-bold text-[#749094] text-right">% Casos Reg.</th>
                                <th className="p-3 font-bold text-[#749094] text-right">Unidades Afectadas</th>
                                <th className="p-3 font-bold text-[#749094] text-right">% del Total Nov.</th>
                                <th className="p-3 font-bold text-[#749094] text-right">$ Inversión</th>
                                <th className="p-3 font-bold text-[#749094] text-right">% de Inversión Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {analytics.problems.map(p => (
                                <React.Fragment key={p.name}>
                                    <tr 
                                        className={`hover:bg-slate-50 transition-colors cursor-pointer ${expandedProblem === p.name ? 'bg-indigo-50/50' : ''}`}
                                        onClick={() => setExpandedProblem(expandedProblem === p.name ? null : p.name)}
                                    >
                                        <td className="p-3 text-center text-slate-400">
                                            {expandedProblem === p.name ? <ChevronUpIcon className="w-4 h-4 mx-auto" /> : <ChevronDownIcon className="w-4 h-4 mx-auto" />}
                                        </td>
                                        <td className="p-3 font-black text-[#1d1d1b]">{p.name}</td>
                                        <td className="p-3 text-right">{fmtN(p.registros)}</td>
                                        <td className="p-3 text-right font-medium text-slate-500">{kpis.registrosNovedad > 0 ? fmtPct((p.registros / kpis.registrosNovedad)*100) : '0%'}</td>
                                        <td className="p-3 text-right font-bold text-[#c96a4e]">{fmtN(p.unidadesNovedad)}</td>
                                        <td className="p-3 text-right font-medium text-slate-500">{kpis.unidadesNovedad > 0 ? fmtPct((p.unidadesNovedad / kpis.unidadesNovedad)*100) : '0%'}</td>
                                        <td className="p-3 text-right font-bold text-red-600">{fmt$(p.inversion)}</td>
                                        <td className="p-3 text-right font-medium text-slate-500">{kpis.inversionMac > 0 ? fmtPct((p.inversion / kpis.inversionMac)*100) : '0%'}</td>
                                    </tr>
                                    {expandedProblem === p.name && (
                                        <tr className="bg-slate-50">
                                            <td colSpan={8} className="p-6">
                                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                                    {/* Drill-Down Productos */}
                                                    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                                                        <div className="bg-slate-100 p-2 border-b border-slate-200 font-bold text-[10px] uppercase text-[#254153]">1. Productos Afectados</div>
                                                        <ul className="max-h-48 overflow-auto divide-y divide-slate-100">
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
                                                                        <div className="flex justify-between text-slate-500 bg-slate-50 p-1 rounded">
                                                                            <span>Ventas: {fmtN(globalProd?.unidadesVendidas || 0)}</span>
                                                                            <span className="text-[#c96a4e] font-bold">Novedad: {fmtN(sp.unidadesNovedad)}</span>
                                                                            <span className="font-bold">Incidencia: {fmtPct(pctNovProd)}</span>
                                                                        </div>
                                                                        <div className="flex justify-between text-slate-500 bg-slate-50 p-1 rounded">
                                                                            <span>$ Venta: {fmt$(globalProd?.ventasTotales || 0)}</span>
                                                                            <span className="text-red-600 font-bold">$ Inv: {fmt$(sp.inversion)}</span>
                                                                            <span className="font-bold">% Inv: {fmtPct(pctInvProd)}</span>
                                                                        </div>
                                                                    </li>
                                                                )})}
                                                        </ul>
                                                    </div>
                                                    {/* Drill-Down Responsables */}
                                                    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                                                        <div className="bg-slate-100 p-2 border-b border-slate-200 font-bold text-[10px] uppercase text-[#254153]">2. Responsables</div>
                                                        <ul className="max-h-48 overflow-auto divide-y divide-slate-100">
                                                            {Array.from(p.subResponsibles.values()).sort((a:any, b:any) => b.unidadesNovedad - a.unidadesNovedad).map((sr: any) => (
                                                                <li key={sr.name} className="p-2 flex justify-between items-center text-[10px]">
                                                                    <span className="font-bold text-[#1d1d1b]">{sr.name}</span>
                                                                    <div className="flex gap-3 text-slate-500">
                                                                        <span className="text-[#c96a4e] font-bold">{fmtN(sr.unidadesNovedad)} Unds</span>
                                                                        <span className="text-red-600 font-bold">{fmt$(sr.inversion)}</span>
                                                                    </div>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                    {/* Drill-Down Zonas/Ciudades */}
                                                    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                                                        <div className="bg-slate-100 p-2 border-b border-slate-200 font-bold text-[10px] uppercase text-[#254153]">3. Zona / Ciudad</div>
                                                        <ul className="max-h-48 overflow-auto divide-y divide-slate-100">
                                                            {Array.from(p.subZones.values()).sort((a:any, b:any) => b.unidadesNovedad - a.unidadesNovedad).slice(0,50).map((sz: any) => (
                                                                <li key={sz.name} className="p-2 flex justify-between items-center text-[10px]">
                                                                    <span className="font-bold text-[#1d1d1b] truncate">{sz.name}</span>
                                                                    <div className="flex gap-3 text-slate-500">
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
            

        </div>
    );
}
