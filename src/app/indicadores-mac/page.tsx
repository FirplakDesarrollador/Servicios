'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { RegistroMAC, FilterState } from './types';
import Filters from './components/Filters';
import GeneralMac from './tabs/GeneralMac';
import DetalleMac from './tabs/DetalleMac';
import AgentesMac from './tabs/AgentesMac';
import { getBusinessDaysDifference, isBusinessDay } from './utils/businessDays';
import * as XLSX from 'xlsx';
import { DownloadIcon } from 'lucide-react';

export default function IndicadoresMacPage() {
    const [data, setData] = useState<RegistroMAC[]>([]);
    const [razones, setRazones] = useState<any[]>([]);
    const [defectosRef, setDefectosRef] = useState<any[]>([]);
    const [responsablesRef, setResponsablesRef] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState(0);

    const [filters, setFilters] = useState<FilterState>({
        fechaInicial: '2026-07-03',
        fechaFinal: new Date().toISOString().split('T')[0],
        estado: [],
        canalVenta: [],
        tipoSolicitud: ['Garantía'],
        agenteMac: [],
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
                const createdAt = new Date(r.created_at);
                // Fecha de cierre: usar fecha_verificacion si existe, si no la fecha actual
                const fechaCierre = r.fecha_verificacion 
                    ? new Date(r.fecha_verificacion) 
                    : (r.cerrada ? new Date() : null);
                // Días hábiles: desde fecha de creación hasta fecha_verificacion (o fecha actual si vacío)
                const fechaReferencia = r.fecha_verificacion ? new Date(r.fecha_verificacion) : new Date();
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

                return {
                    ...r,
                    _fechaCierre: fechaCierre,
                    _diasHabilesAbierta: diasHabilesAbierta,
                    _tiempoCierre: fechaCierre ? diasHabilesAbierta : null,
                    _estadoRiesgo: estadoRiesgo,
                    _valorInvertido: r.valor_total || 0, // Tomado de la base de datos
                    _ciudad: ciudad,
                    _zona: zona,
                    _agenteNombre: agenteNombre
                } as RegistroMAC;
            });

            setData(processed);
        } catch (error) {
            console.error('Error fetching MAC indicators data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Aplicar filtros en cascada
    const filteredData = useMemo(() => {
        return data.filter(d => {
            if (filters.fechaInicial && new Date(d.created_at) < new Date(filters.fechaInicial)) return false;
            // Para fecha final sumamos 1 día para incluir el día completo
            if (filters.fechaFinal && new Date(d.created_at) > new Date(new Date(filters.fechaFinal).getTime() + 86400000)) return false;
            if (filters.estado.length > 0 && !filters.estado.includes(d.estado)) return false;
            if (filters.canalVenta.length > 0 && !filters.canalVenta.includes(d.canal_venta)) return false;
            if (filters.tipoSolicitud.length > 0 && !filters.tipoSolicitud.includes(d.tipo_solicitud)) return false;
            if (filters.agenteMac.length > 0 && !filters.agenteMac.includes(d._agenteNombre || '')) return false;
            return true;
        });
    }, [data, filters]);

    const exportToExcel = () => {
        const allRows: Record<string, any>[] = [];

        // Crear mapas de lookup para resolver IDs a nombres
        const razonesMap = new Map(razones.map(r => [String(r.id), r.razon]));
        const responsablesMap = new Map(responsablesRef.map(r => [String(r.id), r.responsable]));

        filteredData.forEach(d => {
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
                        onClick={exportToExcel}
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

            <main className="flex-1 p-6 overflow-auto">
                <Filters filters={filters} setFilters={setFilters} data={data} activeTab={activeTab} />
                
                <div className="mt-4 transition-opacity duration-300">
                    {activeTab === 0 && <GeneralMac data={filteredData} prevData={filteredData} filters={filters} razones={razones} defectosRef={defectosRef} responsablesRef={responsablesRef} />}
                    {activeTab === 1 && <DetalleMac data={filteredData} prevData={data} filters={filters} />}
                    {activeTab === 2 && <AgentesMac data={filteredData} prevData={data} filters={filters} />}
                </div>
            </main>
        </div>
    );
}
