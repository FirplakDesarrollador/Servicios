'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircleIcon, Loader2Icon } from 'lucide-react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { supabase } from '@/lib/supabase';
import {
  calcularResumen, SIN_ASIGNAR,
  type ChatWhatsapp, type MensajeWhatsapp,
} from '../utils/whatsappMetricas';
import { apodoAsesor } from '@/lib/apodoAsesor';

const PERIODOS = [
  { id: '7', nombre: '7 días', dias: 7 },
  { id: '30', nombre: '30 días', dias: 30 },
  { id: '90', nombre: '90 días', dias: 90 },
  { id: 'todo', nombre: 'Todo', dias: null },
];
const POCOS_DATOS = 5;
const SERIES = ['var(--serie-navy)', 'var(--serie-oliva)', 'var(--serie-arena)', 'var(--serie-petroleo)'];
const tarjeta = 'bg-white rounded-xl border border-border';

function formatoTiempo(minutos: number | null): string {
  if (minutos === null) return '—';
  const m = Math.round(minutos);
  if (m < 60) return `${m} min`;
  const resto = m % 60;
  return resto ? `${Math.floor(m / 60)} h ${resto} min` : `${m / 60} h`;
}

const formatoPorcentaje = (v: number | null) => (v === null ? '—' : `${Math.round(v)}%`);

async function leerTodo<T>(tabla: string, columnas: string, orden: string): Promise<T[]> {
  const filas: T[] = [];
  const pagina = 1000;
  for (let desde = 0; ; desde += pagina) {
    const { data, error } = await supabase.from(tabla).select(columnas).order(orden, { ascending: true }).range(desde, desde + pagina - 1);
    if (error) throw error;
    filas.push(...((data || []) as unknown as T[]));
    if (!data || data.length < pagina) return filas;
  }
}

function Indicador({ titulo, valor, nota, tono }: { titulo: string; valor: string; nota?: string; tono?: 'alerta' | 'peligro' }) {
  const color = tono === 'peligro' ? 'text-red-700' : tono === 'alerta' ? 'text-[var(--c-alerta)]' : 'text-brand-dark';
  return (
    <div className={`${tarjeta} p-4`}>
      <p className="text-xs text-stone-500">{titulo}</p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${color}`}>{valor}</p>
      {nota && <p className="mt-0.5 text-[11px] text-stone-500">{nota}</p>}
    </div>
  );
}

/** Hoja WhatsApp: rendimiento de cada agente según los chats que tiene asignados. */
export default function WhatsappMac() {
  const [chats, setChats] = useState<ChatWhatsapp[] | null>(null);
  const [mensajes, setMensajes] = useState<MensajeWhatsapp[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [periodo, setPeriodo] = useState('30');

  useEffect(() => {
    let vigente = true;
    Promise.all([
      leerTodo<ChatWhatsapp>('whatsapp_chats', 'id,responsable,contact_name,nombre_guardado,phone_number', 'created_at'),
      leerTodo<MensajeWhatsapp>('whatsapp_messages', 'chat_id,sender,status,created_at', 'created_at'),
    ])
      .then(([c, m]) => {
        if (!vigente) return;
        setChats(c);
        setMensajes(m);
      })
      .catch(() => { if (vigente) setError('No se pudieron cargar los datos de WhatsApp. Intenta de nuevo.'); });
    return () => { vigente = false; };
  }, []);

  const resumen = useMemo(() => {
    if (!chats) return null;
    const dias = PERIODOS.find((p) => p.id === periodo)?.dias ?? null;
    const desde = dias === null ? null : new Date(Date.now() - dias * 86400000);
    return calcularResumen(chats, mensajes, desde);
  }, [chats, mensajes, periodo]);

  // El color sigue a la persona: no cambia al filtrar el periodo
  const colorDe = useMemo(() => {
    const nombres = [...new Set((chats || []).map((c) => apodoAsesor(c.responsable) || SIN_ASIGNAR))].sort((a, b) => a.localeCompare(b, 'es'));
    return new Map(nombres.map((n, i) => [n, SERIES[i % SERIES.length]]));
  }, [chats]);

  if (error) {
    return (
      <div role="alert" className={`${tarjeta} flex items-center justify-center gap-2 p-12 text-sm text-stone-600`}>
        <AlertCircleIcon className="w-4 h-4" aria-hidden /> {error}
      </div>
    );
  }
  if (!resumen) {
    return (
      <div className={`${tarjeta} flex items-center justify-center gap-2 p-12 text-sm text-stone-500`}>
        <Loader2Icon className="w-4 h-4 animate-spin" aria-hidden /> Cargando datos de WhatsApp…
      </div>
    );
  }

  const agentesEnGrafico = resumen.agentes.filter((a) => a.respuestas > 0).map((a) => a.agente);
  const totalMensajes = resumen.enviados + resumen.fallidos;

  return (
    <div className="space-y-4">
      <div className={`${tarjeta} flex flex-wrap items-center justify-between gap-3 p-3`}>
        <div role="group" aria-label="Periodo" className="flex flex-wrap gap-1">
          {PERIODOS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPeriodo(p.id)}
              aria-pressed={periodo === p.id}
              className={`min-h-[36px] px-3 rounded-lg text-xs font-medium cursor-pointer transition-colors ${periodo === p.id ? 'bg-brand text-white' : 'text-stone-600 hover:bg-cream-light'}`}
            >
              {p.nombre}
            </button>
          ))}
        </div>
        <p className="text-xs text-stone-600">Meta: responder máximo en 2 horas laborales</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <Indicador titulo="Chats con mensajes" valor={String(resumen.chats)} />
        <Indicador titulo="Respuestas" valor={String(resumen.respuestas)} />
        <Indicador titulo="Tiempo de respuesta" valor={formatoTiempo(resumen.medianaMin)} nota="La mitad responde en menos" />
        <Indicador titulo="Dentro de la meta" valor={formatoPorcentaje(resumen.dentroDeMeta)} nota="Respondidos dentro del plazo" />
        <Indicador titulo="Chats sin responder" valor={String(resumen.pendientes.length)} nota="Hoy" tono={resumen.pendientes.length ? 'alerta' : undefined} />
        <Indicador titulo="Mensajes fallidos" valor={`${resumen.fallidos} de ${totalMensajes}`} tono={resumen.fallidos ? 'peligro' : undefined} />
      </div>

      <section className={`${tarjeta} p-4`}>
        <h2 className="text-sm font-semibold text-brand-dark">Rendimiento por agente</h2>
        <div className="overflow-x-auto mt-2">
          <table className="w-full text-sm text-right whitespace-nowrap">
            <thead>
              <tr className="text-xs text-stone-500 border-b border-border">
                <th scope="col" className="py-2 pr-4 font-medium text-left">Agente</th>
                <th scope="col" className="py-2 px-3 font-medium">Chats</th>
                <th scope="col" className="py-2 px-3 font-medium">Enviados</th>
                <th scope="col" className="py-2 px-3 font-medium">Recibidos</th>
                <th scope="col" className="py-2 px-3 font-medium">Respuestas</th>
                <th scope="col" className="py-2 px-3 font-medium">Tiempo de respuesta</th>
                <th scope="col" className="py-2 px-3 font-medium">Dentro de la meta</th>
                <th scope="col" className="py-2 px-3 font-medium">Sin responder</th>
                <th scope="col" className="py-2 pl-3 font-medium">Fallidos</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {resumen.agentes.length === 0 && (
                <tr><td colSpan={9} className="py-8 text-center text-stone-500">No hay mensajes en este periodo.</td></tr>
              )}
              {resumen.agentes.map((a) => {
                const pocos = a.respuestas < POCOS_DATOS;
                return (
                  <tr key={a.agente} className="border-b border-border last:border-0">
                    <th scope="row" className="py-2.5 pr-4 text-left font-semibold text-brand-dark">{a.agente}</th>
                    <td className="py-2.5 px-3">{a.chats}</td>
                    <td className="py-2.5 px-3">{a.enviados}</td>
                    <td className="py-2.5 px-3">{a.recibidos}</td>
                    <td className="py-2.5 px-3">{a.respuestas}</td>
                    <td className={`py-2.5 px-3 ${pocos ? 'text-stone-500' : ''}`} title={pocos ? `Con ${a.respuestas} respuesta(s) todavía no es comparable` : undefined}>
                      {pocos && a.medianaMin !== null ? `${formatoTiempo(a.medianaMin)} · pocos datos` : formatoTiempo(a.medianaMin)}
                    </td>
                    <td className={`py-2.5 px-3 ${pocos ? 'text-stone-500' : ''}`}>{formatoPorcentaje(a.dentroDeMeta)}</td>
                    <td className={`py-2.5 px-3 ${a.sinResponder ? 'font-semibold text-[var(--c-alerta)]' : ''}`}>{a.sinResponder}</td>
                    <td className={`py-2.5 pl-3 ${a.fallidos ? 'text-red-700' : ''}`}>{a.fallidos}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[11px] text-stone-500">
          Todo se cuenta al responsable actual del chat, porque los mensajes no guardan quién los envió. El tiempo es la mediana y corre de 8 a. m. a 5 p. m. de lunes a jueves y hasta las 4 p. m. los viernes, sin festivos. Lo que entra hasta una hora antes de la salida se responde ese día; lo que entra después, máximo a las 10 a. m. del siguiente día laboral.
        </p>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <section className={`${tarjeta} p-4`}>
          <h2 className="text-sm font-semibold text-brand-dark">Tiempo de respuesta por semana</h2>
          {resumen.semanas.length === 0 ? (
            <p className="py-12 text-center text-sm text-stone-500">No hay respuestas en este periodo.</p>
          ) : (
            <div className="h-64 mt-3">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={resumen.semanas} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--c-linea)" />
                  <XAxis dataKey="semana" tick={{ fontSize: 11, fill: 'currentColor' }} tickLine={false} axisLine={false} />
                  <YAxis width={80} tick={{ fontSize: 11, fill: 'currentColor' }} tickLine={false} axisLine={false} tickFormatter={(v) => formatoTiempo(Number(v))} />
                  <Tooltip formatter={(v) => formatoTiempo(Number(v))} labelFormatter={(l) => `Semana del ${l}`} contentStyle={{ background: "var(--c-navy-hondo)", border: "none", borderRadius: 8, fontSize: 12 }} labelStyle={{ color: "var(--c-crema)" }} itemStyle={{ color: "var(--c-crema)" }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  {agentesEnGrafico.map((agente) => (
                    <Line key={agente} type="monotone" dataKey={agente} stroke={colorDe.get(agente)} fill={colorDe.get(agente)} strokeWidth={2} dot={{ r: 4 }} connectNulls />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        <section className={`${tarjeta} p-4`}>
          <h2 className="text-sm font-semibold text-brand-dark">Chats sin responder</h2>
          {resumen.pendientes.length === 0 ? (
            <p className="py-12 text-center text-sm text-stone-500">Todos los chats tienen respuesta.</p>
          ) : (
            <div className="overflow-auto max-h-64 mt-2">
              <table className="w-full text-sm text-left">
                <thead className="sticky top-0 bg-white">
                  <tr className="text-xs text-stone-500 border-b border-border">
                    <th scope="col" className="py-2 pr-3 font-medium">Cliente</th>
                    <th scope="col" className="py-2 px-3 font-medium">Agente</th>
                    <th scope="col" className="py-2 pl-3 font-medium text-right">Esperando</th>
                  </tr>
                </thead>
                <tbody>
                  {resumen.pendientes.map((p) => (
                    <tr key={p.chatId} className="border-b border-border last:border-0">
                      <td className="py-2 pr-3 text-brand-dark">{p.cliente}</td>
                      <td className="py-2 px-3 text-stone-600">{p.agente}</td>
                      <td className={`py-2 pl-3 text-right tabular-nums whitespace-nowrap ${p.vencido ? 'font-semibold text-red-700' : ''}`}>{formatoTiempo(p.esperaMin)}{p.vencido ? ' · vencido' : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-3 text-[11px] text-stone-500">Chats cuyo último mensaje es del cliente, aunque solo diga &quot;gracias&quot;: el sistema no registra chats cerrados.</p>
        </section>
      </div>
    </div>
  );
}
