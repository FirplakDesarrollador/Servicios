'use client';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Monitor, Moon, Palette, Sun, X } from 'lucide-react';

export type Tema = 'claro' | 'oscuro' | 'sistema';

const CLAVE_TEMA = 'firplak-tema';
const CLAVE_TRANSPARENCIA = 'firplak-transparencia';
export const TRANSPARENCIA_INICIAL = 40;

/**
 * Se ejecuta antes de pintar la página para que no parpadee el tema equivocado.
 * Debe coincidir con aplicarApariencia.
 */
export const SCRIPT_APARIENCIA = `(function(){try{var d=document.documentElement,t=localStorage.getItem('${CLAVE_TEMA}')||'sistema',o=t==='oscuro'||(t==='sistema'&&matchMedia('(prefers-color-scheme: dark)').matches);d.setAttribute('data-tema',o?'oscuro':'claro');var v=Number(localStorage.getItem('${CLAVE_TRANSPARENCIA}'));d.style.setProperty('--vidrio',String(1-(v>=5&&v<=70?v:${TRANSPARENCIA_INICIAL})/100));}catch(e){}})();`;

const leer = (clave: string) => {
    try {
        return localStorage.getItem(clave);
    } catch {
        return null;
    }
};

const guardar = (clave: string, valor: string) => {
    try {
        localStorage.setItem(clave, valor);
    } catch {
        /* Sin almacenamiento la preferencia dura hasta recargar */
    }
};

function aplicarApariencia(tema: Tema, transparencia: number) {
    const raiz = document.documentElement;
    const oscuro = tema === 'oscuro' || (tema === 'sistema' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    raiz.setAttribute('data-tema', oscuro ? 'oscuro' : 'claro');
    raiz.style.setProperty('--vidrio', String(1 - transparencia / 100));
}

const OPCIONES: Array<{ id: Tema; nombre: string; icono: React.ElementType }> = [
    { id: 'claro', nombre: 'Claro', icono: Sun },
    { id: 'oscuro', nombre: 'Oscuro', icono: Moon },
    { id: 'sistema', nombre: 'Sistema', icono: Monitor },
];

/** Controles de tema y transparencia. Los usan el botón flotante y la página de Configuración. */
export function PanelApariencia() {
    const [tema, setTema] = useState<Tema>('sistema');
    const [transparencia, setTransparencia] = useState(TRANSPARENCIA_INICIAL);

    useEffect(() => {
        const t = leer(CLAVE_TEMA);
        if (t === 'claro' || t === 'oscuro' || t === 'sistema') setTema(t);
        const v = Number(leer(CLAVE_TRANSPARENCIA));
        if (v >= 5 && v <= 70) setTransparencia(v);
    }, []);

    // Con "Sistema", la app sigue el cambio del equipo sin recargar
    useEffect(() => {
        if (tema !== 'sistema') return;
        const consulta = window.matchMedia('(prefers-color-scheme: dark)');
        const alCambiar = () => aplicarApariencia('sistema', transparencia);
        consulta.addEventListener('change', alCambiar);
        return () => consulta.removeEventListener('change', alCambiar);
    }, [tema, transparencia]);

    const elegirTema = (t: Tema) => {
        setTema(t);
        guardar(CLAVE_TEMA, t);
        aplicarApariencia(t, transparencia);
    };

    const cambiarTransparencia = (v: number) => {
        setTransparencia(v);
        guardar(CLAVE_TRANSPARENCIA, String(v));
        aplicarApariencia(tema, v);
    };

    return (
        <div className="space-y-4">
            <fieldset>
                <legend className="text-xs font-semibold text-slate-600 mb-2">Tema</legend>
                <div className="grid grid-cols-3 gap-1 p-1 rounded-xl border border-border">
                    {OPCIONES.map(({ id, nombre, icono: Icono }) => (
                        <button
                            key={id}
                            type="button"
                            onClick={() => elegirTema(id)}
                            aria-pressed={tema === id}
                            className={`flex flex-col items-center gap-1 min-h-[44px] py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${tema === id ? 'bg-brand text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                        >
                            <Icono className="w-4 h-4" aria-hidden />
                            {nombre}
                        </button>
                    ))}
                </div>
            </fieldset>
            <div>
                <div className="flex items-baseline justify-between mb-2">
                    <label htmlFor="apariencia-transparencia" className="text-xs font-semibold text-slate-600">Transparencia de las tarjetas</label>
                    <span className="text-xs font-bold tabular-nums text-slate-800">{transparencia} %</span>
                </div>
                <input
                    id="apariencia-transparencia"
                    type="range"
                    min={5}
                    max={70}
                    step={5}
                    value={transparencia}
                    onChange={(e) => cambiarTransparencia(Number(e.target.value))}
                    className="apariencia-rango"
                />
                <div className="flex justify-between text-[11px] text-slate-500 mt-1">
                    <span>Más sólido</span>
                    <span>Más transparente</span>
                </div>
            </div>
        </div>
    );
}

/** Botón discreto, disponible en todas las pantallas, que abre el panel. */
export default function AparienciaFlotante() {
    const [abierto, setAbierto] = useState(false);
    const contenedor = useRef<HTMLDivElement>(null);

    const cerrar = useCallback(() => setAbierto(false), []);

    // Respaldo del script inicial: si una página se recupera de un error en el cliente, el script no corre
    useEffect(() => {
        const t = leer(CLAVE_TEMA);
        const v = Number(leer(CLAVE_TRANSPARENCIA));
        aplicarApariencia(t === 'claro' || t === 'oscuro' ? t : 'sistema', v >= 5 && v <= 70 ? v : TRANSPARENCIA_INICIAL);
    }, []);

    useEffect(() => {
        if (!abierto) return;
        const alTeclear = (e: KeyboardEvent) => { if (e.key === 'Escape') cerrar(); };
        const alPulsar = (e: MouseEvent) => { if (!contenedor.current?.contains(e.target as Node)) cerrar(); };
        document.addEventListener('keydown', alTeclear);
        document.addEventListener('mousedown', alPulsar);
        return () => {
            document.removeEventListener('keydown', alTeclear);
            document.removeEventListener('mousedown', alPulsar);
        };
    }, [abierto, cerrar]);

    return (
        <div ref={contenedor} className="apariencia-flotante fixed left-4 bottom-4 z-40">
            {abierto && (
                <div role="dialog" aria-label="Apariencia" className="bg-white rounded-2xl border border-border w-72 p-4 mb-3">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-sm font-bold text-slate-900">Apariencia</h2>
                        <button type="button" onClick={cerrar} aria-label="Cerrar apariencia" className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer">
                            <X className="w-4 h-4" aria-hidden />
                        </button>
                    </div>
                    <PanelApariencia />
                </div>
            )}
            <button
                type="button"
                onClick={() => setAbierto((a) => !a)}
                aria-expanded={abierto}
                aria-label="Cambiar la apariencia: tema y transparencia"
                title="Apariencia"
                className="w-11 h-11 flex items-center justify-center rounded-full bg-brand text-white shadow-lg hover:bg-brand-hover transition-colors cursor-pointer"
            >
                <Palette className="w-5 h-5" aria-hidden />
            </button>
        </div>
    );
}
