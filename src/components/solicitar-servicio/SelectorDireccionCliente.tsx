'use client';

// Al crear un servicio o radicado: escoger cuál dirección del cliente final aplica.
// Por defecto queda la principal. Si el cliente tiene una sola dirección, solo se muestra.
import { useEffect, useState } from 'react';
import { MapPin, Loader2 } from 'lucide-react';
import { cargarDireccionesCliente, DireccionCliente } from '@/lib/direccionesCliente';

interface Props {
    consumidorId: number | string | null | undefined;
    value: DireccionCliente | null;
    onChange: (dir: DireccionCliente | null) => void;
    /** Solo cuando la persona hace clic en una dirección (no al cargar). */
    onElegir?: (dir: DireccionCliente) => void;
    /** Dirección a dejar escogida al cargar (si existe y está activa); si no, la principal. */
    preferidaId?: number | null;
    className?: string;
}

export default function SelectorDireccionCliente({ consumidorId, value, onChange, onElegir, preferidaId, className = '' }: Props) {
    const [direcciones, setDirecciones] = useState<DireccionCliente[] | null>(null);
    const [cargando, setCargando] = useState(false);

    useEffect(() => {
        let cancelado = false;
        if (!consumidorId) {
            setDirecciones(null);
            if (value) onChange(null);
            return;
        }
        setCargando(true);
        cargarDireccionesCliente(consumidorId).then(lista => {
            if (cancelado) return;
            setCargando(false);
            setDirecciones(lista);
            if (!lista || lista.length === 0) {
                if (value) onChange(null);
                return;
            }
            const actual = value && lista.find(d => d.id === value.id);
            const preferida = preferidaId ? lista.find(d => d.id === preferidaId) : undefined;
            onChange(actual || preferida || lista.find(d => d.principal) || lista[0]);
        });
        return () => { cancelado = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [consumidorId, preferidaId]);

    if (!consumidorId) return null;
    if (cargando) {
        return <div className={`flex items-center gap-2 text-xs font-bold text-slate-400 ${className}`}><Loader2 className="w-3.5 h-3.5 animate-spin" /> Cargando direcciones...</div>;
    }
    // Tabla aún no creada o cliente sin direcciones: se usa la dirección del cliente como antes
    if (!direcciones || direcciones.length <= 1) return null;

    return (
        <div className={`space-y-1.5 ${className}`}>
            <label className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500">
                <MapPin className="w-3.5 h-3.5" /> Dirección del servicio ({direcciones.length})
            </label>
            <div className="space-y-1.5">
                {direcciones.map(d => {
                    const sel = value?.id === d.id;
                    return (
                        <button
                            key={d.id}
                            type="button"
                            onClick={() => { onChange(d); onElegir?.(d); }}
                            className={`w-full text-left p-2.5 rounded-xl border-2 transition-all ${sel ? 'border-emerald-500 bg-emerald-50' : 'border-slate-100 bg-white hover:border-slate-200'}`}
                        >
                            <span className="flex items-center gap-1.5">
                                <span className={`w-3 h-3 rounded-full border-2 shrink-0 ${sel ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300'}`} />
                                <span className="text-xs font-black text-slate-700 uppercase">{d.alias || 'Sin nombre'}</span>
                                {d.principal && <span className="text-[9px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-100 px-1.5 rounded">Principal</span>}
                            </span>
                            <span className="block text-xs font-medium text-slate-600 pl-[18px]">
                                {d.direccion || '---'}{d.ciudad ? ` - ${d.ciudad}` : ''}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
