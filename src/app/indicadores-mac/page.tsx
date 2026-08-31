'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { RegistroMAC, FilterState } from './types';
import Filters from './components/Filters';
import GeneralMac from './tabs/GeneralMac';
import DetalleMac from './tabs/DetalleMac';
import AgentesMac from './tabs/AgentesMac';
import { getBusinessDaysDifference, isBusinessDay, addBusinessDays } from './utils/businessDays';
import * as XLSX from 'xlsx';
import { DownloadIcon, XIcon, ListFilterIcon } from 'lucide-react';
import DetalleRadicadosModal from './components/DetalleRadicadosModal';

export default function IndicadoresMacPage() {
    const [data, setData] = useState<RegistroMAC[]>([]);
    const [razones, setRazones] = useState<any[]>([]);
    const [defectosRef, setDefectosRef] = useState<any[]>([]);
    // Excel Export Modal State
    const [showExportModal, setShowExportModal] = useState(false);
    const [exportStartDate, setExportStartDate] = useState('');
    const [exportEndDate, setExportEndDate] = useState('');

    // Fetch filters options
    const [responsablesRef, setResponsablesRef] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState(0);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const [filters, setFilters] = useState<FilterState>({
        fechaInicial: '2026-07-03',
        fechaFinal: new Date().toISOString().split('T')[0],
        estado: [],
        canalVenta: [],
        tipoSolicitud: ['Garantía'],
        agenteMac: [],
        defectos: [],
        productos: [],
        ciudades: [],
        responsables: [],
        zonas: [],
        clientes: [],
        mesPresupuesto: [],
        mesCreacion: [],
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {

            const { data: registrosData, error } = await supabase
                .from('registro_solicitudes')
                .select(`
                    *,
                    Usuarios!registro_solicitudes_tratado_por_id_fkey(nombres, apellidos, rol),
                    AsesorMAC:Usuarios!registro_solicitudes_asesor_mac_id_fkey(nombres, apellidos),
                    Ubicaciones:cliente_id(ciudad_id, ciudades:ciudad_id(ciudad, zona_id, zonas:zona_id(zona))),
                    Consumidores:cliente_final_id(ciudad_id, ciudades:ciudad_id(ciudad, zona_id, zonas:zona_id(zona)))
                `);

            if (error) throw error;

            const { data: razonesData } = await supabase.from('razones_queja').select('id, razon');
            setRazones(razonesData || []);

            const { data: defectosData } = await supabase.from('defectos').select('id, defecto');
            setDefectosRef(defectosData || []);
            
            const { data: responsablesData } = await supabase.from('responsable_queja').select('id, responsable');
            setResponsablesRef(responsablesData || []);

            const { data: zonasData } = await supabase.from('zonas').select('id, zona');
            const zonasRef = zonasData || [];

            // Procesar y enriquecer datos en cliente
            const processed = (registrosData as any[]).map(r => {
                // REGLA GLOBAL: El estado se define única y exclusivamente por la existencia de la Fecha de Verificación.
                const isClosed = !!r.fecha_verificacion;
                const estado = isClosed ? 'Cerrado' : 'Abierto';
                
                const createdAt = new Date(r.created_at);
                const fechaCierre = isClosed ? new Date(r.fecha_verificacion) : null;
                const fechaReferencia = fechaCierre || new Date();
                
                const diasHabilesAbierta = getBusinessDaysDifference(createdAt, fechaReferencia);

                let estadoRiesgo: 'Excelente' | 'Regular' | 'Riesgo de demanda' | 'Demandante' = 'Excelente';
                if (diasHabilesAbierta > 20) estadoRiesgo = 'Demandante';
                else if (diasHabilesAbierta >= 16) estadoRiesgo = 'Riesgo de demanda';
                else if (diasHabilesAbierta >= 11) estadoRiesgo = 'Regular';

                // Lógica de ciudad y zona
                // Si existe Cliente Canal y Cliente Final, predomina Cliente Final
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
                // If no zona from consumidor, try the canal client's city
                if (zona === 'No definida' && r.cliente_id && r.Ubicaciones?.ciudades) {
                    if (!r.cliente_final_id) ciudad = r.Ubicaciones.ciudades.ciudad || ciudad;
                    const zonaName = r.Ubicaciones.ciudades.zonas?.zona;
                    const zonaIdVal = r.Ubicaciones.ciudades.zona_id;
                    if (zonaName) zona = zonaName;
                    else if (zonaIdVal) zonaId = zonaIdVal;
                }

                if (zonaId && zona === 'No definida') {
                    const foundZona = zonasRef.find((z: any) => String(z.id) === String(zonaId));
                    if (!foundZona) console.warn(`[Zona] No encontrada: zonaId=${zonaId} (tipo: ${typeof zonaId}), zonas disponibles:`, zonasRef.map((z:any) => `${z.id}(${typeof z.id})`).join(', '));
                    zona = foundZona ? foundZona.zona : `Zona ${zonaId}`;
                }

                const agenteNombre = r.AsesorMAC 
                    ? `${r.AsesorMAC.nombres} ${r.AsesorMAC.apellidos}`.trim() 
                    : (r.Usuarios?.rol?.toLowerCase() === 'mac' ? `${r.Usuarios.nombres} ${r.Usuarios.apellidos}`.trim() : 'Sin Asignar');

                const _defectosNombres = new Set<string>();
                const _responsablesNombres = new Set<string>();
                const _productosNombres = new Set<string>();
                
                if (Array.isArray(r.productos_compra)) {
                    r.productos_compra.forEach((p: any) => {
                        _productosNombres.add(p.descripcion || p.nombre || p.sku || p.referencia || 'Desconocido');
                        const code = p.codigo || p.referencia || p.sku || p.codigo_producto || p.cod_producto || p.cod;
                        if (code && String(code).trim()) _productosNombres.add(String(code).trim());
                    });
                }
                
                if (Array.isArray(r.productos_novedad)) {
                    r.productos_novedad.forEach((p: any) => {
                        _productosNombres.add(p.descripcion || p.nombre || p.sku || p.referencia || 'Desconocido');
                        const code = p.codigo || p.referencia || p.sku || p.codigo_producto || p.cod_producto || p.cod;
                        if (code && String(code).trim()) _productosNombres.add(String(code).trim());
                        let hasProblema = false;
                        let hasResp = false;
                        if (Array.isArray(p.problemas)) {
                            p.problemas.forEach((prob: any) => {
                                if (prob.tipo_problema_id) {
                                    hasProblema = true;
                                    const d = defectosData?.find(x => x.id == prob.tipo_problema_id)?.defecto || razonesData?.find(x => x.id == prob.tipo_problema_id)?.razon || `ID ${prob.tipo_problema_id}`;
                                    _defectosNombres.add(d);
                                }
                                if (prob.responsable_problema_id) {
                                    hasResp = true;
                                    const resp = responsablesData?.find(x => x.id == prob.responsable_problema_id)?.responsable || `ID ${prob.responsable_problema_id}`;
                                    _responsablesNombres.add(resp);
                                }
                            });
                        }
                        if (!hasProblema && p.tipo_problema_id) {
                             const d = defectosData?.find(x => x.id == p.tipo_problema_id)?.defecto || razonesData?.find(x => x.id == p.tipo_problema_id)?.razon || `ID ${p.tipo_problema_id}`;
                            _defectosNombres.add(d);
                        }
                        if (!hasResp && p.responsable_problema_id) {
                             const resp = responsablesData?.find(x => x.id == p.responsable_problema_id)?.responsable || `ID ${p.responsable_problema_id}`;
                            _responsablesNombres.add(resp);
                        }
                    });
                }

                const fechaObjetivo = addBusinessDays(createdAt, 15);
                const mesPresupuestoKey = `${fechaObjetivo.getFullYear()}-${String(fechaObjetivo.getMonth() + 1).padStart(2, '0')}`;
                const mesCreacionKey = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, '0')}`;
                const clienteFinalOrPrincipal = r.cliente_final_nombre || r.cliente_nombre || 'Desconocido';

                const canalVentaMap: Record<string, string> = {
                    'canal_ditribuidor': 'Canal Distribuidor',
                    'canal_distribuidor': 'Canal Distribuidor',
                    'canal_exportador': 'Canal Exportador',
                    'canal_constructor': 'Canal Constructor',
                    'canal_propio_firplakhome': 'Canal Propio Firplakhome',
                    'canal_propio_ecommerce': 'Canal Propio eCommerce'
                };

                return {
                    ...r,
                    canal_venta: canalVentaMap[r.canal_venta] || r.canal_venta,
                    estado,
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

    const getFilteredData = (excludeKeys: (keyof FilterState)[] = []) => {
        return data.filter(d => {
            if (!excludeKeys.includes('fechaInicial') && filters.fechaInicial && new Date(d.created_at) < new Date(filters.fechaInicial)) return false;
            if (!excludeKeys.includes('fechaFinal') && filters.fechaFinal && new Date(d.created_at) > new Date(new Date(filters.fechaFinal).getTime() + 86400000)) return false;
            if (!excludeKeys.includes('estado') && filters.estado.length > 0 && !filters.estado.includes(d.estado)) return false;
            if (!excludeKeys.includes('canalVenta') && filters.canalVenta.length > 0 && !filters.canalVenta.includes(d.canal_venta)) return false;
            if (!excludeKeys.includes('tipoSolicitud') && filters.tipoSolicitud.length > 0 && !filters.tipoSolicitud.includes(d.tipo_solicitud)) return false;
            if (!excludeKeys.includes('agenteMac') && filters.agenteMac.length > 0 && !filters.agenteMac.includes(d._agenteNombre || '')) return false;
            
            if (!excludeKeys.includes('ciudades') && filters.ciudades.length > 0 && !filters.ciudades.includes(d._ciudad || '')) return false;
            if (!excludeKeys.includes('zonas') && filters.zonas.length > 0 && !filters.zonas.includes(d._zona || '')) return false;
            if (!excludeKeys.includes('clientes') && filters.clientes.length > 0 && !filters.clientes.includes(d._clientePrincipalFinal || '')) return false;
            if (!excludeKeys.includes('mesPresupuesto') && filters.mesPresupuesto.length > 0 && !filters.mesPresupuesto.includes(d._mesPresupuestoKey || '')) return false;
            if (!excludeKeys.includes('mesCreacion') && filters.mesCreacion.length > 0 && !filters.mesCreacion.includes(d._mesCreacionKey || '')) return false;
            
            if (!excludeKeys.includes('defectos') && filters.defectos.length > 0 && !filters.defectos.some(f => d._defectosNombres?.includes(f))) return false;
            if (!excludeKeys.includes('responsables') && filters.responsables.length > 0 && !filters.responsables.some(f => d._responsablesNombres?.includes(f))) return false;
            if (!excludeKeys.includes('productos') && filters.productos.length > 0 && !filters.productos.some(f => d._productosNombres?.includes(f))) return false;

            return true;
        });
    };

    const filteredData = useMemo(() => getFilteredData(), [data, filters]);
    const dataForDefectos = useMemo(() => getFilteredData(['defectos']), [data, filters]);
    const dataForResponsables = useMemo(() => getFilteredData(['responsables']), [data, filters]);
    const dataForCiudades = useMemo(() => getFilteredData(['ciudades']), [data, filters]);
    const dataForZonas = useMemo(() => getFilteredData(['zonas']), [data, filters]);
    const dataForClientes = useMemo(() => getFilteredData(['clientes']), [data, filters]);
    const dataForProductos = useMemo(() => getFilteredData(['productos']), [data, filters]);
    const dataForMesPresupuesto = useMemo(() => getFilteredData(['mesPresupuesto']), [data, filters]);
    const dataForMesCreacion = useMemo(() => getFilteredData(['mesCreacion']), [data, filters]);

    const handleFilterToggle = (key: keyof FilterState, value: string, e?: any) => {
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
    };

    const confirmExport = () => {
        let toExport = data; // Usamos todos los datos (base de datos)
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

        // Crear mapas de lookup para resolver IDs a nombres
        const razonesMap = new Map(razones.map(r => [String(r.id), r.razon]));
        const responsablesMap = new Map(responsablesRef.map(r => [String(r.id), r.responsable]));

        dataToExport.forEach(d => {
            // Construir fila base con todos los campos escalares
            const baseRow: Record<string, any> = {};
            Object.entries(d).forEach(([key, val]) => {
                if (key.startsWith('_')) return;
                if (key === 'productos_compra' || key === 'productos_novedad') return;
                // Omitir IDs crudos y campos que formateamos manualmente
                if (['cliente_id', 'cliente_final_id', 'cliente_nombre', 'cliente_final_nombre', 'canal_venta', 'fecha_compra', 'fecha_fabricacion'].includes(key)) return; 
                if (val && typeof val === 'object') return; // Skip relaciones Supabase
                baseRow[key] = val;
            });

            // Asegurar que nombre y canal de venta sean legibles
            baseRow['Cliente_Principal'] = d.cliente_nombre || 'No definido';
            baseRow['Cliente_Final'] = d.cliente_final_nombre || 'No definido';
            baseRow['Canal_Venta'] = d.canal_venta || 'No definido';

            // Agregar campos calculados
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

            // Aplanar productos novedad incluyendo sus problemas
            // Cada problema dentro de un producto genera una fila separada
            const novedadRows: Record<string, any>[] = [];
            productosNovedad.forEach(pn => {
                const problemas = Array.isArray(pn.problemas) && pn.problemas.length > 0 
                    ? pn.problemas 
                    : [{ tipo_problema_id: '', responsable_problema_id: '' }];

                problemas.forEach((prob: any) => {
                    novedadRows.push({
                        'Novedad_Cantidad': pn.cantidad || 1,
                        'Novedad_SKU': pn.sku || pn.codigo || '',
                        'Novedad_Referencia': pn.referencia || pn.sku || '',
                        'Novedad_Descripcion': pn.descripcion || pn.nombre || '',
                        'Novedad_Tipo_Problema': prob.tipo_problema_id ? (razonesMap.get(String(prob.tipo_problema_id)) || prob.tipo_problema_id) : '',
                        'Novedad_Responsable_Problema': prob.responsable_problema_id ? (responsablesMap.get(String(prob.responsable_problema_id)) || prob.responsable_problema_id) : '',
                        'Novedad_Fecha_Compra': pn.fecha_compra || '',
                        'Novedad_Fecha_Fabricacion': pn.fecha_fabricacion || '',
                    });
                });
            });

            // Determinar el máximo de filas necesarias
            const maxRows = Math.max(1, productosCompra.length, novedadRows.length);

            for (let i = 0; i < maxRows; i++) {
                const row = { ...baseRow };

                // Producto Compra
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

                // Producto Novedad (ya aplanado con problemas)
                if (i < novedadRows.length) {
                    // Mantenemos solo las columnas de Novedad principales (sin repetir fechas)
                    row['Novedad_Cantidad'] = novedadRows[i].Novedad_Cantidad;
                    row['Novedad_SKU'] = novedadRows[i].Novedad_SKU;
                    row['Novedad_Referencia'] = novedadRows[i].Novedad_Referencia;
                    row['Novedad_Descripcion'] = novedadRows[i].Novedad_Descripcion;
                    row['Novedad_Tipo_Problema'] = novedadRows[i].Novedad_Tipo_Problema;
                    row['Novedad_Responsable_Problema'] = novedadRows[i].Novedad_Responsable_Problema;
                } else {
                    row['Novedad_Cantidad'] = '';
                    row['Novedad_SKU'] = '';
                    row['Novedad_Referencia'] = '';
                    row['Novedad_Descripcion'] = '';
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
        XLSX.writeFile(workbook, `Base_Datos_MAC_${new Date().toISOString().slice(0,10)}.xlsx`);
    };

    const tabs = ['General MAC', 'Detalle MAC', 'Agentes MAC'];

    if (loading) {
        return <div className="flex h-screen items-center justify-center bg-gray-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand"></div></div>;
    }

    return (
        <div className="min-h-screen bg-[#f8f9fa] flex flex-col font-sans">
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
                                onClick={() => setActiveTab(idx)}
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
            {(filters.defectos.length > 0 || filters.productos.length > 0 || filters.ciudades.length > 0 || filters.responsables.length > 0 || filters.zonas.length > 0 || filters.clientes.length > 0 || filters.mesPresupuesto.length > 0) && (
                <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shadow-sm z-10">
                    <div className="flex flex-wrap items-center gap-2 flex-1">
                        <span className="text-xs font-bold text-gray-500 mr-2 flex items-center gap-1"><ListFilterIcon className="w-3.5 h-3.5" />Filtros cruzados:</span>
                        {[
                            { key: 'defectos', label: 'Defecto' },
                            { key: 'productos', label: 'Producto' },
                            { key: 'ciudades', label: 'Ciudad' },
                            { key: 'responsables', label: 'Responsable' },
                            { key: 'zonas', label: 'Zona' },
                            { key: 'clientes', label: 'Cliente' },
                            { key: 'mesPresupuesto', label: 'Mes SLA' },
                            { key: 'mesCreacion', label: 'Mes Ingreso' },
                        ].map(f => (filters[f.key as keyof FilterState] as string[]).map((val: string, idx: number) => (
                            <span key={`${f.key}-${idx}`} className="bg-brand text-white text-xs font-semibold px-2 py-1 rounded-md flex items-center gap-1.5 shadow-sm animate-fade-in">
                                {f.label}: {val}
                                <button onClick={() => setFilters(prev => ({ ...prev, [f.key]: (prev[f.key as keyof FilterState] as string[]).filter(v => v !== val) }))} className="hover:text-red-300 transition-colors">
                                    <XIcon className="w-3.5 h-3.5" />
                                </button>
                            </span>
                        )))}
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
                                ...prev, defectos: [], productos: [], ciudades: [], responsables: [], zonas: [], clientes: [], mesPresupuesto: [], mesCreacion: []
                            }))} 
                            className="text-xs font-bold text-gray-500 hover:text-red-500 transition-colors whitespace-nowrap"
                        >
                            Restablecer filtros cruzados
                        </button>
                    </div>
                </div>
            )}

            <main className="flex-1 p-6 overflow-auto">
                <Filters filters={filters} setFilters={setFilters} data={data} activeTab={activeTab} />
                
                <div className="mt-4 transition-opacity duration-300">
                    {activeTab === 0 && <GeneralMac data={filteredData} dataForDefectos={dataForDefectos} dataForResponsables={dataForResponsables} dataForCiudades={dataForCiudades} dataForZonas={dataForZonas} dataForClientes={dataForClientes} dataForProductos={dataForProductos} dataForMesCreacion={dataForMesCreacion} prevData={data} filters={filters} setFilters={setFilters} onFilterToggle={handleFilterToggle} razones={razones} defectosRef={defectosRef} responsablesRef={responsablesRef} />}
                    {activeTab === 1 && <DetalleMac data={filteredData} dataForMesPresupuesto={dataForMesPresupuesto} prevData={data} filters={filters} setFilters={setFilters} onFilterToggle={handleFilterToggle} />}
                    {activeTab === 2 && <AgentesMac data={filteredData} prevData={data} filters={filters} setFilters={setFilters} onFilterToggle={handleFilterToggle} />}
                </div>
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
