'use client';

// Ficha del cliente final: sus direcciones (agregar, editar, marcar principal, desactivar).
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { MapPin, Plus, Pencil, Star, EyeOff, Eye, Loader2, X, Check, Home } from 'lucide-react';
import { cargarDireccionesCliente, DireccionCliente } from '@/lib/direccionesCliente';

interface Props {
    consumidorId: number | string;
    /** Se llama cuando cambia la principal (para refrescar la dirección del formulario). */
    onPrincipalCambiada?: (dir: DireccionCliente) => void;
}

interface Ciudad { id: number; ciudad: string; departamento?: string | null }

interface FormDireccion {
    id: number | null;
    alias: string;
    direccion: string;
    descripcion_direccion: string;
    ciudad_id: string;
    principal: boolean;
}

const VACIA: FormDireccion = { id: null, alias: '', direccion: '', descripcion_direccion: '', ciudad_id: '', principal: false };

export default function DireccionesClienteFinal({ consumidorId, onPrincipalCambiada }: Props) {
    const [direcciones, setDirecciones] = useState<DireccionCliente[]>([]);
    const [disponible, setDisponible] = useState(true);
    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [form, setForm] = useState<FormDireccion | null>(null);
    const [ciudades, setCiudades] = useState<Ciudad[]>([]);
    const [filtroCiudad, setFiltroCiudad] = useState('');

    const cargar = async () => {
        setCargando(true);
        const lista = await cargarDireccionesCliente(consumidorId, true);
        if (lista === null) {
            setDisponible(false);
        } else {
            setDisponible(true);
            setDirecciones(lista);
        }
        setCargando(false);
    };

    useEffect(() => {
        cargar();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [consumidorId]);

    useEffect(() => {
        if (!form || ciudades.length > 0) return;
        supabase.from('query_ciudades').select('id, ciudad, departamento').order('ciudad')
            .then(({ data }) => setCiudades((data || []) as Ciudad[]));
    }, [form, ciudades.length]);

    const ciudadesFiltradas = useMemo(() => {
        const q = filtroCiudad.trim().toLowerCase();
        const base = q ? ciudades.filter(c => (c.ciudad || '').toLowerCase().includes(q)) : ciudades;
        // Mantener visible la ciudad escogida aunque no coincida con el filtro
        const sel = form?.ciudad_id ? ciudades.find(c => String(c.id) === form.ciudad_id) : undefined;
        return sel && !base.includes(sel) ? [sel, ...base] : base;
    }, [ciudades, filtroCiudad, form?.ciudad_id]);

    const notificarPrincipal = async () => {
        if (!onPrincipalCambiada) return;
        const lista = await cargarDireccionesCliente(consumidorId);
        const principal = lista?.find(d => d.principal);
        if (principal) onPrincipalCambiada(principal);
    };

    const guardar = async () => {
        if (!form) return;
        if (!form.direccion.trim() || !form.ciudad_id) {
            setError('La dirección y la ciudad son obligatorias.');
            return;
        }
        setGuardando(true);
        setError(null);
        const datos = {
            alias: form.alias.trim().toUpperCase() || null,
            direccion: form.direccion.trim().toUpperCase(),
            descripcion_direccion: form.descripcion_direccion.trim().toUpperCase() || null,
            ciudad_id: parseInt(form.ciudad_id),
        };
        const eraPrincipal = form.id ? direcciones.find(d => d.id === form.id)?.principal : false;
        const { error: err } = form.id
            ? await supabase.from('clientes_direcciones').update({ ...datos, ...(form.principal ? { principal: true } : {}) }).eq('id', form.id)
            : await supabase.from('clientes_direcciones').insert({ ...datos, consumidor_id: Number(consumidorId), principal: form.principal, activa: true });
        setGuardando(false);
        if (err) {
            setError(err.message || 'No se pudo guardar la dirección.');
            return;
        }
        setForm(null);
        await cargar();
        if (form.principal || eraPrincipal || direcciones.length === 0) await notificarPrincipal();
    };

    const marcarPrincipal = async (d: DireccionCliente) => {
        setGuardando(true);
        setError(null);
        const { error: err } = await supabase.from('clientes_direcciones').update({ principal: true, activa: true }).eq('id', d.id);
        setGuardando(false);
        if (err) { setError(err.message); return; }
        await cargar();
        await notificarPrincipal();
    };

    const cambiarActiva = async (d: DireccionCliente) => {
        if (d.principal && d.activa) {
            setError('Marque otra dirección como principal antes de desactivar esta.');
            return;
        }
        setGuardando(true);
        setError(null);
        const { error: err } = await supabase.from('clientes_direcciones').update({ activa: !d.activa }).eq('id', d.id);
        setGuardando(false);
        if (err) { setError(err.message); return; }
        await cargar();
    };

    if (!disponible) {
        return (
            <div className="p-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-xs font-bold text-slate-500">
                Para manejar varias direcciones por cliente falta ejecutar <code>supabase/create_clientes_direcciones.sql</code> en Supabase.
            </div>
        );
    }

    const inputCls = 'w-full h-11 bg-slate-50 border-2 border-slate-100 rounded-xl px-3 text-sm font-bold text-slate-700 focus:outline-none focus:border-sky-300 focus:bg-white transition-all';

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 flex items-center gap-1.5">
                    <Home className="w-3.5 h-3.5" /> Direcciones del cliente ({direcciones.filter(d => d.activa).length})
                </h3>
                {!form && (
                    <button
                        type="button"
                        onClick={() => { setForm({ ...VACIA }); setError(null); setFiltroCiudad(''); }}
                        className="text-[10px] font-black uppercase tracking-widest text-sky-600 hover:underline flex items-center gap-1"
                    >
                        <Plus className="w-3.5 h-3.5" /> Agregar dirección
                    </button>
                )}
            </div>

            {error && <p className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">{error}</p>}

            {cargando ? (
                <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-sky-500" /></div>
            ) : direcciones.length === 0 && !form ? (
                <p className="text-xs font-bold text-slate-400 italic ml-1">Este cliente aún no tiene direcciones.</p>
            ) : (
                <ul className="space-y-2">
                    {direcciones.map(d => (
                        <li
                            key={d.id}
                            className={`p-3 rounded-2xl border-2 flex items-start gap-3 ${d.principal ? 'border-sky-200 bg-sky-50/60' : 'border-slate-100 bg-white'} ${d.activa ? '' : 'opacity-50'}`}
                        >
                            <MapPin className={`w-4 h-4 mt-0.5 shrink-0 ${d.principal ? 'text-sky-500' : 'text-slate-400'}`} />
                            <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="text-xs font-black text-slate-700 uppercase">{d.alias || 'Sin nombre'}</span>
                                    {d.principal && <span className="text-[9px] font-black uppercase tracking-wider bg-sky-500 text-white px-1.5 py-0.5 rounded-md">Principal</span>}
                                    {!d.activa && <span className="text-[9px] font-black uppercase tracking-wider bg-slate-300 text-white px-1.5 py-0.5 rounded-md">Inactiva</span>}
                                </div>
                                <p className="text-xs font-bold text-slate-600 break-words">{d.direccion || '---'}</p>
                                <p className="text-[11px] font-medium text-slate-400">
                                    {[d.ciudad, d.departamento, d.zona ? `Zona ${d.zona}` : null].filter(Boolean).join(' · ') || 'Sin ciudad'}
                                    {d.descripcion_direccion ? ` — ${d.descripcion_direccion}` : ''}
                                </p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                                {!d.principal && d.activa && (
                                    <button type="button" disabled={guardando} onClick={() => marcarPrincipal(d)} title="Marcar como principal" className="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-amber-50 disabled:opacity-40">
                                        <Star className="w-4 h-4" />
                                    </button>
                                )}
                                <button
                                    type="button"
                                    disabled={guardando}
                                    title="Editar"
                                    onClick={() => {
                                        setError(null);
                                        setFiltroCiudad('');
                                        setForm({ id: d.id, alias: d.alias || '', direccion: d.direccion || '', descripcion_direccion: d.descripcion_direccion || '', ciudad_id: d.ciudad_id ? String(d.ciudad_id) : '', principal: d.principal });
                                    }}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 disabled:opacity-40"
                                >
                                    <Pencil className="w-4 h-4" />
                                </button>
                                {!d.principal && (
                                    <button type="button" disabled={guardando} onClick={() => cambiarActiva(d)} title={d.activa ? 'Desactivar' : 'Reactivar'} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 disabled:opacity-40">
                                        {d.activa ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            {form && (
                <div className="p-4 rounded-2xl border-2 border-sky-100 bg-white space-y-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-sky-600">{form.id ? 'Editar dirección' : 'Nueva dirección'}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <input className={inputCls} placeholder='Nombre (ej: "Casa campestre")' value={form.alias} onChange={e => setForm({ ...form, alias: e.target.value })} />
                        <div className="space-y-1.5">
                            <input className={inputCls} placeholder="Buscar ciudad..." value={filtroCiudad} onChange={e => setFiltroCiudad(e.target.value)} />
                            <select className={inputCls} value={form.ciudad_id} onChange={e => setForm({ ...form, ciudad_id: e.target.value })}>
                                <option value="">Seleccione ciudad *</option>
                                {ciudadesFiltradas.map(c => (
                                    <option key={c.id} value={String(c.id)}>{c.ciudad}{c.departamento ? ` (${c.departamento})` : ''}</option>
                                ))}
                            </select>
                        </div>
                        <input className={`${inputCls} md:col-span-2`} placeholder="Dirección * (Calle, Carrera, Barrio...)" value={form.direccion} onChange={e => setForm({ ...form, direccion: e.target.value })} />
                        <input className={`${inputCls} md:col-span-2`} placeholder="Punto de referencia" value={form.descripcion_direccion} onChange={e => setForm({ ...form, descripcion_direccion: e.target.value })} />
                    </div>
                    {!(form.id && direcciones.find(d => d.id === form.id)?.principal) && (
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer w-max">
                            <input type="checkbox" checked={form.principal} onChange={e => setForm({ ...form, principal: e.target.checked })} className="w-4 h-4 rounded border-slate-300" />
                            Usar como dirección principal
                        </label>
                    )}
                    <div className="flex gap-2 justify-end">
                        <button type="button" onClick={() => { setForm(null); setError(null); }} className="h-10 px-4 rounded-xl bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                            <X className="w-3.5 h-3.5" /> Cancelar
                        </button>
                        <button type="button" disabled={guardando} onClick={guardar} className="h-10 px-4 rounded-xl bg-sky-500 text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 disabled:opacity-50">
                            {guardando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Guardar dirección
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
