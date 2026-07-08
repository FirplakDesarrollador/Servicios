import React, { useMemo } from 'react';
import { FilterState, RegistroMAC } from '../types';

interface FiltersProps {
    filters: FilterState;
    setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
    data: RegistroMAC[];
    activeTab: number;
}

export default function Filters({ filters, setFilters, data, activeTab }: FiltersProps) {
    // Opciones estáticas para los canales para que siempre aparezcan todos
    const opcionesCanal = useMemo(() => [
        'Canal Distribuidor',
        'Canal Exportador',
        'Canal Constructor',
        'Canal Propio Firplakhome',
        'Canal Propio eCommerce'
    ], []);
    const opcionesTipo = useMemo(() => [
        'Garantía',
        'Documento Sagrilaft',
        'Reclamo',
        'Atención',
        'Venta'
    ], []);
    const opcionesAgentes = useMemo(() => {
        const agentes = data.map(d => d._agenteNombre).filter(Boolean) as string[];
        return Array.from(new Set(agentes)).sort();
    }, [data]);

    const handleFilterChange = (key: keyof FilterState, value: any) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const toggleArrayFilter = (key: keyof FilterState, option: string) => {
        setFilters(prev => {
            const arr = prev[key] as string[];
            if (arr.includes(option)) {
                return { ...prev, [key]: arr.filter(item => item !== option) };
            } else {
                return { ...prev, [key]: [...arr, option] };
            }
        });
    };

    // Estilos generales
    const selectClass = "block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-brand sm:text-xs sm:leading-6";
    const labelClass = "block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1";

    return (
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap gap-4 items-end mb-6">
            <div className="flex-1 min-w-[150px]">
                <label className={labelClass}>Fecha Inicial</label>
                <input 
                    type="date" 
                    className={selectClass}
                    value={filters.fechaInicial}
                    onChange={(e) => handleFilterChange('fechaInicial', e.target.value)}
                />
            </div>
            <div className="flex-1 min-w-[150px]">
                <label className={labelClass}>Fecha Final</label>
                <input 
                    type="date" 
                    className={selectClass}
                    value={filters.fechaFinal}
                    onChange={(e) => handleFilterChange('fechaFinal', e.target.value)}
                />
            </div>

            <div className="flex-1 min-w-[150px]">
                <label className={labelClass}>Estado</label>
                <select 
                    className={selectClass}
                    value={filters.estado.length === 0 ? '' : filters.estado[0] || ''}
                    onChange={(e) => handleFilterChange('estado', e.target.value ? [e.target.value] : [])}
                >
                    <option value="">Todos</option>
                    <option value="Abierto">Abierto</option>
                    <option value="Cerrado">Cerrado</option>
                </select>
            </div>

            <div className="flex-1 min-w-[150px]">
                <label className={labelClass}>Canal de Venta</label>
                <select 
                    className={selectClass}
                    value={filters.canalVenta.length === 0 ? '' : filters.canalVenta[0] || ''}
                    onChange={(e) => handleFilterChange('canalVenta', e.target.value ? [e.target.value] : [])}
                >
                    <option value="">Todos</option>
                    {opcionesCanal.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
            </div>

            <div className="flex-1 min-w-[150px]">
                <label className={labelClass}>Tipo de Solicitud</label>
                <select 
                    className={selectClass}
                    value={filters.tipoSolicitud.length === 0 ? '' : filters.tipoSolicitud[0] || ''}
                    onChange={(e) => handleFilterChange('tipoSolicitud', e.target.value ? [e.target.value] : [])}
                >
                    <option value="">Todos</option>
                    {opcionesTipo.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
            </div>

            {(activeTab === 1 || activeTab === 2) && (
                <div className="flex-1 min-w-[150px]">
                    <label className={labelClass}>Agente MAC</label>
                    <select 
                        className={selectClass}
                        value={filters.agenteMac.length === 0 ? '' : filters.agenteMac[0] || ''}
                        onChange={(e) => handleFilterChange('agenteMac', e.target.value ? [e.target.value] : [])}
                    >
                        <option value="">Todos</option>
                        {opcionesAgentes.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                </div>
            )}
        </div>
    );
}
