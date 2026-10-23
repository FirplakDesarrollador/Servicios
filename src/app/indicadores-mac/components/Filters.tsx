import React, { useMemo, useState, useEffect } from 'react';
import { FilterState, RegistroMAC } from '../types';
import { supabase } from '@/lib/supabase';

const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

interface FiltersProps {
    filters: FilterState;
    setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
    data: RegistroMAC[];
    activeTab: number;
    isVertical?: boolean;
}

export default function Filters({ filters, setFilters, data, activeTab, isVertical }: FiltersProps) {
    const [dbOpcionesTipo, setDbOpcionesTipo] = useState<string[]>([]);

    useEffect(() => {
        const fetchTipos = async () => {
            try {
                const { data: dbData } = await supabase.from('Tipo_Solicitud').select('TipoSolicitud').eq('activo', true);
                if (dbData) {
                    const fromTable = dbData.map(d => d.TipoSolicitud).filter((t): t is string => typeof t === 'string' && t.trim() !== '');
                    setDbOpcionesTipo(fromTable.sort());
                }
            } catch(e) {
                console.error("Error fetching tipos de solicitud:", e);
            }
        };
        fetchTipos();
    }, []);

    const dataDerivedTipos = useMemo(() => {
        const tipos = data.map(d => d.tipo_solicitud).filter(Boolean) as string[];
        return Array.from(new Set(tipos)).sort();
    }, [data]);

    const opcionesTipo = dbOpcionesTipo.length > 0 ? dbOpcionesTipo : dataDerivedTipos;
    const opcionesAgentes = useMemo(() => {
        const agentes = data.map(d => d._agenteNombre).filter(Boolean) as string[];
        return Array.from(new Set(agentes)).sort();
    }, [data]);

    const handleFilterChange = (key: keyof FilterState, value: any) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    // ── Selector de meses (pestaña Informe) ──────────────────────────────
    // Último mes vencido (el mes anterior al actual), clave YYYY-MM
    const ultimoMesVencido = useMemo(() => {
        const d = new Date();
        d.setDate(1);
        d.setMonth(d.getMonth() - 1);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }, []);

    // Meses disponibles (claves YYYY-MM): desde enero del año en curso, o desde el primer
    // radicado / último mes vencido si es anterior, hasta el mes actual
    const mesesDisponibles = useMemo(() => {
        const now = new Date();
        const fin = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const keys = data.map(d => d._mesCreacionKey).filter((k): k is string => !!k && k <= fin);
        const inicio = [...keys, ultimoMesVencido].reduce((a, b) => (a < b ? a : b), `${now.getFullYear()}-01`);
        const meses: string[] = [];
        let [y, m] = inicio.split('-').map(Number);
        while (`${y}-${String(m).padStart(2, '0')}` <= fin) {
            meses.push(`${y}-${String(m).padStart(2, '0')}`);
            m++;
            if (m > 12) { m = 1; y++; }
        }
        return meses;
    }, [data, ultimoMesVencido]);

    const aniosDisponibles = useMemo(
        () => Array.from(new Set(mesesDisponibles.map(k => k.slice(0, 4)))).sort().reverse(),
        [mesesDisponibles]
    );

    // Los meses viven en filters.mesCreacion; el rango fechaInicial/fechaFinal se ajusta para
    // cubrirlos (así la consulta de Ventas trae solo lo necesario)
    const setMeses = (meses: string[]) => {
        const sorted = [...meses].sort();
        setFilters(prev => {
            if (sorted.length === 0) {
                return { ...prev, mesCreacion: [], fechaInicial: `${mesesDisponibles[0]}-01`, fechaFinal: new Date().toISOString().split('T')[0] };
            }
            const [yFin, mFin] = sorted[sorted.length - 1].split('-').map(Number);
            const ultimoDia = new Date(yFin, mFin, 0).getDate();
            return { ...prev, mesCreacion: sorted, fechaInicial: `${sorted[0]}-01`, fechaFinal: `${sorted[sorted.length - 1]}-${String(ultimoDia).padStart(2, '0')}` };
        });
    };

    const toggleMes = (key: string) => {
        const actuales = filters.mesCreacion;
        setMeses(actuales.includes(key) ? actuales.filter(k => k !== key) : [...actuales, key]);
    };

    // Al entrar al Informe sin meses elegidos, preseleccionar el último mes vencido
    useEffect(() => {
        if (activeTab === 3 && filters.mesCreacion.length === 0) setMeses([ultimoMesVencido]);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab]);

    const formatFecha = (iso: string) => (iso ? iso.split('-').reverse().join('/') : '—');

    // Estilos generales
    const selectClass = "block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-brand sm:text-xs sm:leading-6";
    const labelClass = "block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1";

    return (
        <div className={`bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex ${isVertical ? 'flex-col gap-4' : 'flex-wrap gap-4 items-end mb-6'}`}>

            {activeTab === 3 ? (
                <div className={isVertical ? 'w-full' : 'flex-1 min-w-[260px]'}>
                    <div className="flex items-center justify-between mb-1">
                        <label className={`${labelClass} mb-0`}>Meses</label>
                        {filters.mesCreacion.length > 0 && (
                            <button
                                type="button"
                                onClick={() => setMeses([])}
                                className="text-[10px] font-semibold text-gray-400 hover:text-red-500 transition-colors"
                            >
                                Limpiar ✕
                            </button>
                        )}
                    </div>
                    <div className="space-y-2">
                        {aniosDisponibles.map(anio => (
                            <div key={anio}>
                                <div className="text-[10px] font-bold text-gray-400 mb-1">{anio}</div>
                                <div className="grid grid-cols-4 gap-1">
                                    {MESES_CORTOS.map((nombre, idx) => {
                                        const key = `${anio}-${String(idx + 1).padStart(2, '0')}`;
                                        const disponible = mesesDisponibles.includes(key);
                                        const activo = filters.mesCreacion.includes(key);
                                        return (
                                            <button
                                                key={key}
                                                type="button"
                                                disabled={!disponible}
                                                onClick={() => toggleMes(key)}
                                                className={`py-1 rounded-md text-[11px] font-semibold border transition-colors ${
                                                    activo
                                                        ? 'bg-brand text-white border-brand'
                                                        : disponible
                                                            ? 'bg-white text-gray-700 border-gray-200 hover:border-brand hover:text-brand'
                                                            : 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed'
                                                }`}
                                            >
                                                {nombre}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                    <p className="text-[10px] text-gray-400 mt-2">
                        {filters.mesCreacion.length === 0 ? 'Todos los meses · ' : `${filters.mesCreacion.length} ${filters.mesCreacion.length === 1 ? 'mes' : 'meses'} · `}
                        {formatFecha(filters.fechaInicial)} – {formatFecha(filters.fechaFinal)}
                    </p>
                </div>
            ) : (
                <>
                    <div className={isVertical ? 'w-full' : 'flex-1 min-w-[150px]'}>
                        <label className={labelClass}>Fecha Inicial</label>
                        <input
                            type="date"
                            className={selectClass}
                            value={filters.fechaInicial}
                            onChange={(e) => handleFilterChange('fechaInicial', e.target.value)}
                        />
                    </div>
                    <div className={isVertical ? 'w-full' : 'flex-1 min-w-[150px]'}>
                        <label className={labelClass}>Fecha Final</label>
                        <input
                            type="date"
                            className={selectClass}
                            value={filters.fechaFinal}
                            onChange={(e) => handleFilterChange('fechaFinal', e.target.value)}
                        />
                    </div>
                </>
            )}

            <div className={isVertical ? 'w-full' : 'flex-1 min-w-[150px]'}>
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

            <div className={isVertical ? 'w-full' : 'flex-1 min-w-[150px]'}>
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
                <div className={isVertical ? 'w-full' : 'flex-1 min-w-[150px]'}>
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
