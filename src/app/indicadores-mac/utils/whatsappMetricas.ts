import { isWeekend, startOfWeek } from 'date-fns';
import { isHoliday } from './businessDays';
import { mediana } from './metricas';

// Rendimiento por agente en WhatsApp. Los mensajes no guardan quién los envió:
// todo se le cuenta al responsable actual del chat.

export interface ChatWhatsapp {
  id: string;
  responsable: string | null;
  contact_name: string | null;
  nombre_guardado: string | null;
  phone_number: string | null;
}

export interface MensajeWhatsapp {
  chat_id: string;
  sender: string;
  status: string | null;
  created_at: string;
}

export interface FilaAgente {
  agente: string;
  chats: number;
  enviados: number;
  recibidos: number;
  fallidos: number;
  respuestas: number;
  medianaMin: number | null;
  dentroDeMeta: number | null;
  sinResponder: number;
}

export interface ChatSinResponder {
  chatId: string;
  cliente: string;
  agente: string;
  esperaMin: number;
}

export interface ResumenWhatsapp {
  chats: number;
  enviados: number;
  fallidos: number;
  respuestas: number;
  medianaMin: number | null;
  dentroDeMeta: number | null;
  agentes: FilaAgente[];
  pendientes: ChatSinResponder[];
  semanas: Array<Record<string, number | string>>;
}

export const SIN_ASIGNAR = 'Sin asignar';
/** Horario laboral en que corre el tiempo de respuesta: lunes a viernes, sin festivos. */
export const HORA_INICIO = 7;
export const HORA_FIN = 17;

/** Minutos laborales entre dos momentos. */
export function minutosLaborales(desde: Date, hasta: Date): number {
  if (hasta <= desde) return 0;
  let total = 0;
  const dia = new Date(desde.getFullYear(), desde.getMonth(), desde.getDate());
  while (dia <= hasta) {
    if (!isWeekend(dia) && !isHoliday(dia)) {
      const inicio = new Date(dia.getFullYear(), dia.getMonth(), dia.getDate(), HORA_INICIO).getTime();
      const fin = new Date(dia.getFullYear(), dia.getMonth(), dia.getDate(), HORA_FIN).getTime();
      const tramo = Math.min(fin, hasta.getTime()) - Math.max(inicio, desde.getTime());
      if (tramo > 0) total += tramo / 60000;
    }
    dia.setDate(dia.getDate() + 1);
  }
  return Math.round(total);
}

const porcentaje = (tiempos: number[], metaMin: number): number | null =>
  tiempos.length === 0 ? null : (tiempos.filter((t) => t <= metaMin).length / tiempos.length) * 100;


const claveSemana = (fecha: Date) => {
  const lunes = startOfWeek(fecha, { weekStartsOn: 1 });
  return `${String(lunes.getDate()).padStart(2, '0')}/${String(lunes.getMonth() + 1).padStart(2, '0')}`;
};

/**
 * @param desde inicio del periodo; null = todo. "Sin responder" es el estado de hoy, sin importar el periodo.
 */
export function calcularResumen(
  chats: ChatWhatsapp[],
  mensajes: MensajeWhatsapp[],
  desde: Date | null,
  metaMin: number,
  ahora: Date = new Date(),
): ResumenWhatsapp {
  const chatPorId = new Map(chats.map((c) => [c.id, c]));
  const agenteDe = (chatId: string) => chatPorId.get(chatId)?.responsable?.trim() || SIN_ASIGNAR;

  const acumulado = new Map<string, { chats: Set<string>; enviados: number; recibidos: number; fallidos: number; tiempos: number[]; sinResponder: number }>();
  const del = (agente: string) => {
    let a = acumulado.get(agente);
    if (!a) {
      a = { chats: new Set<string>(), enviados: 0, recibidos: 0, fallidos: 0, tiempos: [], sinResponder: 0 };
      acumulado.set(agente, a);
    }
    return a;
  };

  // Tiempos de cada agente por semana, para la tendencia
  const porSemana = new Map<string, { orden: number; tiempos: Map<string, number[]> }>();
  const esperaDesde = new Map<string, Date>();
  const ordenados = [...mensajes].sort((a, b) => a.created_at.localeCompare(b.created_at));

  for (const m of ordenados) {
    const agente = agenteDe(m.chat_id);
    const fecha = new Date(m.created_at);
    const enPeriodo = !desde || fecha >= desde;
    const fallido = m.status === 'failed';
    if (enPeriodo) {
      const a = del(agente);
      a.chats.add(m.chat_id);
      if (m.sender === 'them') a.recibidos++;
      else if (fallido) a.fallidos++;
      else a.enviados++;
    }
    if (m.sender === 'them') {
      if (!esperaDesde.has(m.chat_id)) esperaDesde.set(m.chat_id, fecha);
    } else if (!fallido) {
      // Un mensaje fallido no le llegó al cliente: no cuenta como respuesta
      const inicio = esperaDesde.get(m.chat_id);
      if (inicio) {
        esperaDesde.delete(m.chat_id);
        if (enPeriodo) {
          const minutos = minutosLaborales(inicio, fecha);
          del(agente).tiempos.push(minutos);
          const clave = claveSemana(fecha);
          let semana = porSemana.get(clave);
          if (!semana) {
            semana = { orden: startOfWeek(fecha, { weekStartsOn: 1 }).getTime(), tiempos: new Map<string, number[]>() };
            porSemana.set(clave, semana);
          }
          semana.tiempos.set(agente, [...(semana.tiempos.get(agente) || []), minutos]);
        }
      }
    }
  }

  const pendientes: ChatSinResponder[] = [];
  esperaDesde.forEach((inicio, chatId) => {
    const chat = chatPorId.get(chatId);
    if (!chat) return;
    const agente = agenteDe(chatId);
    del(agente).sinResponder++;
    pendientes.push({
      chatId,
      cliente: chat.nombre_guardado?.trim() || chat.contact_name?.trim() || chat.phone_number || 'Sin nombre',
      agente,
      esperaMin: minutosLaborales(inicio, ahora),
    });
  });
  pendientes.sort((a, b) => b.esperaMin - a.esperaMin);

  const agentes: FilaAgente[] = [...acumulado.entries()]
    .map(([agente, a]) => ({
      agente,
      chats: a.chats.size,
      enviados: a.enviados,
      recibidos: a.recibidos,
      fallidos: a.fallidos,
      respuestas: a.tiempos.length,
      medianaMin: mediana(a.tiempos),
      dentroDeMeta: porcentaje(a.tiempos, metaMin),
      sinResponder: a.sinResponder,
    }))
    .sort((a, b) => a.agente.localeCompare(b.agente, 'es'));

  const todosLosTiempos = [...acumulado.values()].flatMap((a) => a.tiempos);
  const semanas = [...porSemana.entries()]
    .sort((a, b) => a[1].orden - b[1].orden)
    .map(([clave, s]) => {
      const fila: Record<string, number | string> = { semana: clave };
      s.tiempos.forEach((tiempos, agente) => {
        fila[agente] = mediana(tiempos) ?? 0;
      });
      return fila;
    });

  return {
    chats: agentes.reduce((t, a) => t + a.chats, 0),
    enviados: agentes.reduce((t, a) => t + a.enviados, 0),
    fallidos: agentes.reduce((t, a) => t + a.fallidos, 0),
    respuestas: todosLosTiempos.length,
    medianaMin: mediana(todosLosTiempos),
    dentroDeMeta: porcentaje(todosLosTiempos, metaMin),
    agentes,
    pendientes,
    semanas,
  };
}
