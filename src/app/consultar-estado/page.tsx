'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

interface EstadoServicio {
  consecutivo: string;
  tipo_de_servicio: string;
  estado: string;
  sub_estado: string;
  fecha_hora_inicio: string | null;
  fecha_hora_fin: string | null;
  tecnico_nombre: string | null;
  motivo: string | null;
  numero_estado: number;
  orden_grupo: number;
  orden_evento: number;
  evento_ts: string | null;
  origen_tipo: string | null;
  origen_id: string | null;
  row_id: string;
}

type EstadoPaso = 'agendado' | 'proceso' | 'finalizado';

// ✅ Reglas: Bolita 1 incluye solo estos estados
const ESTADOS_PASO1 = new Set(['solicitud ingresada', 'fecha de agendamiento']);

const normalizar = (s: string | null | undefined) => (s ?? '').trim().toLowerCase();

export default function EstadosServicioPage() {
  const [consecutivo, setConsecutivo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<EstadoServicio[]>([]);
  const [vista, setVista] = useState<'buscador' | 'resultado'>('buscador');

  const limpiar = () => {
    setConsecutivo('');
    setRows([]);
    setError(null);
    setVista('buscador');
  };

  const formatearFechaHora = (fecha: string | null) => {
    if (!fecha) return '—';
    const d = new Date(fecha);
    return d.toLocaleString('es-CO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  // ✅ Paso actual según TUS REGLAS:
  // - Si existe "Finalizado" => finalizado
  // - Si existe cualquier estado distinto a (Solicitud ingresada, Fecha de agendamiento) => proceso
  // - Si no => agendado
  const getPasoActual = (): EstadoPaso => {
    if (!rows.length) return 'agendado';

    const estados = rows.map((r) => normalizar(r.estado));
    if (estados.includes('finalizado')) return 'finalizado';

    const hayProceso = estados.some((e) => e && !ESTADOS_PASO1.has(e) && e !== 'finalizado');
    if (hayProceso) return 'proceso';

    return 'agendado';
  };

  // ✅ Stepper (bolitas) MISMO ESTILO que tenías, pero con lógica nueva
  const StepperEstados = () => {
    const actual = getPasoActual();

    const pasos: { key: EstadoPaso; label: string }[] = [
      { key: 'agendado', label: 'Agendado' },
      { key: 'proceso', label: 'En proceso' },
      { key: 'finalizado', label: 'Finalizado' },
    ];

    const orden: Record<EstadoPaso, number> = {
      agendado: 0,
      proceso: 1,
      finalizado: 2,
    };

    const idxActual = orden[actual];

    const statusDePaso = (idx: number) => {
      if (idx < idxActual) return 'done';
      if (idx === idxActual) return 'current';
      return 'todo';
    };

    return (
      <div className="pt-6">
        <h3 className="text-center text-sm font-semibold text-slate-800">Estado del pedido</h3>

        <div className="mt-4">
          <div className="flex items-center justify-between">
            {pasos.map((p, i) => {
              const s = statusDePaso(i);
              const isDone = s === 'done';
              const isCurrent = s === 'current';

              return (
                <div key={p.key} className="flex flex-1 items-center">
                  {/* Línea izquierda (conector) */}
                  {i !== 0 && (
                    <div
                      className={`h-1 flex-1 rounded-full ${idxActual >= i ? 'bg-[#1f3a4a]' : 'bg-slate-200'
                        }`}
                    />
                  )}

                  {/* Bolita */}
                  <div className="flex flex-col items-center">
                    <div
                      className={[
                        'flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all',
                        isDone
                          ? 'border-[#1f3a4a] bg-[#1f3a4a] text-white'
                          : isCurrent
                            ? 'border-[#1f3a4a] bg-white text-[#1f3a4a] shadow-md scale-110'
                            : 'border-slate-300 bg-white text-slate-400',
                      ].join(' ')}
                      aria-label={p.label}
                    >
                      {isDone ? (
                        <span className="text-lg leading-none">✓</span>
                      ) : (
                        <span className="text-sm font-bold">{i + 1}</span>
                      )}
                    </div>

                    <span
                      className={[
                        'mt-2 text-[11px] font-semibold',
                        isDone || isCurrent ? 'text-[#1f3a4a]' : 'text-slate-400',
                      ].join(' ')}
                    >
                      {p.label}
                    </span>
                  </div>

                  {/* Línea derecha (relleno visual) */}
                  {i !== pasos.length - 1 && <div className="h-1 flex-1 rounded-full bg-transparent" />}
                </div>
              );
            })}
          </div>

          <p className="mt-3 text-center text-xs text-slate-500">
            * Bolita 1 = <b>Solicitud ingresada</b> + <b>Fecha de agendamiento</b>. <br />
            * Bolita 2 = cualquier otro estado (ej: Cancelado, Re-agendado, etc.). <br />
            * Bolita 3 = <b>Finalizado</b>.
          </p>
        </div>
      </div>
    );
  };

  const consultar = async (e: React.FormEvent) => {
    e.preventDefault();
    const cons = consecutivo.trim();

    if (!cons) {
      setError('Por favor ingrese un número de solicitud');
      return;
    }

    setLoading(true);
    setError(null);
    setRows([]);

    try {
      // ✅ RPC (debes tener creada: get_estados_servicio_public)
      const { data, error: qErr } = await supabase.rpc('get_estados_servicio_public', {
        p_consecutivo: cons,
      });

      if (qErr) throw qErr;

      if (!data || data.length === 0) {
        setError('Consecutivo no encontrado');
        setVista('buscador');
        return;
      }

      // Orden defensivo
      const ordered = [...(data as EstadoServicio[])].sort((a, b) => {
        const g = (a.orden_grupo ?? 0) - (b.orden_grupo ?? 0);
        if (g !== 0) return g;

        const ta = a.evento_ts ? new Date(a.evento_ts).getTime() : 0;
        const tb = b.evento_ts ? new Date(b.evento_ts).getTime() : 0;
        if (ta !== tb) return ta - tb;

        return (a.orden_evento ?? 0) - (b.orden_evento ?? 0);
      });

      setRows(ordered);
      setVista('resultado');
    } catch (err) {
      console.error('Error consultando:', err);
      setError('Error consultando en Supabase. Intente nuevamente.');
      setVista('buscador');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <header className="sticky top-0 z-10 bg-[#1f3a4a] text-white shadow">
        <div className="mx-auto flex h-14 max-w-6xl items-center px-4">
          <button
            type="button"
            className="mr-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 hover:bg-white/15 active:scale-[0.98]"
            aria-label="Volver"
            onClick={() => (vista === 'resultado' ? limpiar() : history.back())}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 18l-6-6 6-6" />
            </svg>
          </button>

          <h1 className="w-full text-center text-base font-semibold tracking-wide">Estados de Servicio</h1>

          <div className="ml-3 h-9 w-9" />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10">
        <section className="lg:mx-auto lg:w-2/3">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.10)]">
            {/* Card header */}
            <div className="relative bg-gradient-to-r from-slate-900 to-[#1f3a4a] px-6 py-8">
              <div className="pointer-events-none absolute inset-0 opacity-20">
                <div className="absolute -left-24 -top-24 h-64 w-64 rounded-full bg-white blur-3xl" />
                <div className="absolute -right-24 -bottom-24 h-64 w-64 rounded-full bg-white blur-3xl" />
              </div>

              <div className="relative text-center">
                <div className="mx-auto mb-3 inline-flex items-center justify-center rounded-xl bg-white/95 px-8 py-4 shadow">
                  <div className="text-4xl font-black tracking-[0.25em] text-slate-800">FIRPLAK</div>
                </div>
                <p className="text-xs font-medium tracking-[0.35em] text-white/80">inspirando hogares</p>
              </div>
            </div>

            {/* Body */}
            <div className="px-6 py-8 sm:px-10">
              {vista === 'buscador' && (
                <>
                  <div className="text-center">
                    <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
                      Consulta el estado de su solicitud
                    </h2>
                    <p className="mt-2 text-sm text-slate-500">
                      Ingrese su número de solicitud para conocer el estado actual.
                    </p>
                  </div>

                  <form onSubmit={consultar} className="mt-8 space-y-4">
                    <div>
                      <label className="text-sm font-semibold text-slate-700">Número de solicitud</label>

                      <div className="mt-2 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 focus-within:border-[#1f3a4a] focus-within:ring-4 focus-within:ring-[#1f3a4a]/10">
                        <svg viewBox="0 0 24 24" className="h-5 w-5 text-slate-500" fill="none" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                        </svg>

                        <input
                          value={consecutivo}
                          onChange={(e) => setConsecutivo(e.target.value)}
                          type="text"
                          placeholder="Ej: 123456"
                          className="w-full bg-transparent text-center text-base font-semibold tracking-wider text-slate-900 outline-none placeholder:text-slate-400 sm:text-lg"
                          disabled={loading}
                        />

                        {consecutivo.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setConsecutivo('')}
                            className="rounded-lg p-2 text-slate-500 hover:bg-slate-200/60 hover:text-slate-700"
                            aria-label="Limpiar"
                            disabled={loading}
                          >
                            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>

                      {error && (
                        <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                          {error}
                        </div>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={loading || !consecutivo.trim()}
                      className="group relative w-full overflow-hidden rounded-xl bg-[#1f3a4a] px-6 py-4 text-sm font-semibold text-white shadow-md transition hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 sm:text-base"
                    >
                      <span className="relative z-10 inline-flex items-center justify-center gap-2">
                        {loading ? (
                          <>
                            <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                            </svg>
                            Consultando...
                          </>
                        ) : (
                          <>
                            Consultar
                            <svg viewBox="0 0 24 24" className="h-5 w-5 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                          </>
                        )}
                      </span>
                      <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/15 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                    </button>
                  </form>
                </>
              )}

              {vista === 'resultado' && (
                <div className="space-y-5">
                  <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
                    <div>
                      <p className="text-sm text-slate-500">Solicitud</p>
                      <p className="text-2xl font-black tracking-widest text-[#1f3a4a]">{rows[0]?.consecutivo}</p>
                      <p className="mt-1 text-sm text-slate-600">
                        Tipo de servicio: <b>{rows[0]?.tipo_de_servicio ?? '—'}</b>
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={limpiar}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Nueva consulta
                    </button>
                  </div>

                  {/* Tabla resultados */}
                  <div className="overflow-hidden rounded-xl border border-slate-200">
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-700">
                          <tr>
                            <th className="px-4 py-3 font-semibold">#</th>
                            <th className="px-4 py-3 font-semibold">Sub-estado</th>
                            <th className="px-4 py-3 font-semibold">Estado</th>
                            <th className="px-4 py-3 font-semibold">Inicio</th>
                            <th className="px-4 py-3 font-semibold">Fin</th>
                            <th className="px-4 py-3 font-semibold">Técnico</th>
                            <th className="px-4 py-3 font-semibold">Motivo</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {rows.map((r) => (
                            <tr key={r.row_id} className="hover:bg-slate-50/60">
                              <td className="px-4 py-3 font-semibold text-slate-700">{r.numero_estado}</td>
                              <td className="px-4 py-3">
                                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                                  {r.sub_estado ?? '—'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-slate-800">{r.estado ?? '—'}</td>
                              <td className="px-4 py-3 text-slate-600">{formatearFechaHora(r.fecha_hora_inicio)}</td>
                              <td className="px-4 py-3 text-slate-600">{formatearFechaHora(r.fecha_hora_fin)}</td>
                              <td className="px-4 py-3 text-slate-700">{r.tecnico_nombre ?? '—'}</td>
                              <td className="px-4 py-3 text-slate-600">{r.motivo ?? '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* ✅ Bolitas (Agendado / En proceso / Finalizado) */}
                  <StepperEstados />
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-slate-100 bg-slate-50 px-6 py-4 text-center">
              <p className="text-xs text-slate-500">
                <span className="font-semibold text-slate-700">Firplak</span> · Inspirando hogares
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
