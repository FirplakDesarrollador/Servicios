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
                const fechaCierre = r.cerrada ? new Date(r.created_at) : null;
                const diasHabilesAbierta = fechaCierre 
                    ? getBusinessDaysDifference(createdAt, fechaCierre) 
                    : getBusinessDaysDifference(createdAt, new Date());

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
        const rows = filteredData.map(d => {
            const row: Record<string, any> = {};
            
            // Loop through all properties of the record
            Object.entries(d).forEach(([key, val]) => {
                if (key.startsWith('_')) return; // Ignore frontend internal temporary properties
                
                if (val && typeof val === 'object') {
                    // Stringify arrays/objects (like productos_compra) to be spreadsheet friendly
                    if (Array.isArray(val) || (val.constructor && val.constructor.name === 'Object')) {
                        row[key] = JSON.stringify(val);
                    }
                    // Skip nested objects that represent Supabase relations (e.g. Usuarios, Ubicaciones, Consumidores)
                    return;
                }
                row[key] = val;
            });

            // Append helper calculated variables at the end
            row['_Agente_MAC_Calculado'] = d._agenteNombre || 'Sin Asignar';
            row['_Ciudad_Calculada'] = d._ciudad || 'No definida';
            row['_Zona_Calculada'] = d._zona || 'No definida';
            row['_Estado_Riesgo_Calculado'] = d._estadoRiesgo || 'Excelente';
            row['_Dias_Abierta_Calculado'] = d._diasHabilesAbierta || 0;
            if (d._fechaCierre) {
                row['_Fecha_Cierre_Calculada'] = new Date(d._fechaCierre).toLocaleDateString();
            }

            return row;
        });

        const worksheet = XLSX.utils.json_to_sheet(rows);
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
