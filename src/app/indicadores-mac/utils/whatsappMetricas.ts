import { isWeekend, startOfWeek } from 'date-fns';
import { isHoliday } from './businessDays';
import { mediana } from './metricas';
import { apodoAsesor } from '@/lib/apodoAsesor';

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
  vencido: boolean;
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
/** Meta: responder máximo en 2 horas laborales. */
export const META_MINUTOS = 120;
const HORA_ENTRADA = 8;
const HORA_MAXIMA_SIN_RESPONDER = 10;

/** Hora de salida: lunes a jueves 5 p. m., viernes 4 p. m. Fin de semana y festivos no se trabaja. */
function horaSalida(dia: Date): number | null {
  if (isWeekend(dia) || isHoliday(dia)) return null;
  return dia.getDay() === 5 ? 16 : 17;
}

const enHora = (dia: Date, hora: number) => new Date(dia.getFullYear(), dia.getMonth(), dia.getDate(), hora);

function siguienteDiaLaboral(fecha: Date): Date {
  const dia = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate() + 1);
  while (horaSalida(dia) === null) dia.setDate(dia.getDate() + 1);
  return dia;
}

/**
 * Desde cuándo corre el tiempo de un mensaje y hasta cuándo se debe responder.
 * Lo que entra hasta una hora antes de la salida se responde ese día, aunque queden menos de 2 horas.
 * Lo que entra antes de las 8 a. m. corre desde las 8; lo que entra después del corte, o en día no
 * laboral, corre desde las 8 del siguiente día laboral. En ambos casos el máximo es a las 10 a. m.
 */
export function plazoDeRespuesta(entrada: Date): { inicio: Date; limite: Date } {
  const salida = horaSalida(entrada);
  if (salida === null || entrada.getTime() >= enHora(entrada, salida - 1).getTime()) {
    const dia = siguienteDiaLaboral(entrada);
    return { inicio: enHora(dia, HORA_ENTRADA), limite: enHora(dia, HORA_MAXIMA_SIN_RESPONDER) };
  }
  if (entrada.getTime() < enHora(entrada, HORA_ENTRADA).getTime()) {
    return { inicio: enHora(entrada, HORA_ENTRADA), limite: enHora(entrada, HORA_MAXIMA_SIN_RESPONDER) };
  }
  const limite = Math.min(entrada.getTime() + META_MINUTOS * 60000, enHora(entrada, salida).getTime());
  return { inicio: entrada, limite: new Date(limite) };
}

/** Minutos laborales entre dos momentos. */
export function minutosLaborales(desde: Date, hasta: Date): number {
  if (hasta <= desde) return 0;
  let total = 0;
  const dia = new Date(desde.getFullYear(), desde.getMonth(), desde.getDate());
  while (dia <= hasta) {
    const salida = horaSalida(dia);
    if (salida !== null) {
      const tramo = Math.min(enHora(dia, salida).getTime(), hasta.getTime()) - Math.max(enHora(dia, HORA_ENTRADA).getTime(), desde.getTime());
      if (tramo > 0) total += tramo / 60000;
    }
    dia.setDate(dia.getDate() + 1);
  }
  return Math.round(total);
}

const porcentaje = (cumplidas: number, total: number): number | null => (total === 0 ? null : (cumplidas / total) * 100);

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
  ahora: Date = new Date(),
): ResumenWhatsapp {
  const chatPorId = new Map(chats.map((c) => [c.id, c]));
  const agenteDe = (chatId: string) => apodoAsesor(chatPorId.get(chatId)?.responsable) || SIN_ASIGNAR;

  const acumulado = new Map<string, { chats: Set<string>; enviados: number; recibidos: number; fallidos: number; tiempos: number[]; aTiempo: number; sinResponder: number }>();
  const del = (agente: string) => {
    let a = acumulado.get(agente);
    if (!a) {
      a = { chats: new Set<string>(), enviados: 0, recibidos: 0, fallidos: 0, tiempos: [], aTiempo: 0, sinResponder: 0 };
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
          const plazo = plazoDeRespuesta(inicio);
          const minutos = minutosLaborales(plazo.inicio, fecha);
          const fila = del(agente);
          fila.tiempos.push(minutos);
          if (fecha <= plazo.limite) fila.aTiempo++;
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
      esperaMin: minutosLaborales(plazoDeRespuesta(inicio).inicio, ahora),
      vencido: ahora > plazoDeRespuesta(inicio).limite,
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
      dentroDeMeta: porcentaje(a.aTiempo, a.tiempos.length),
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
    dentroDeMeta: porcentaje([...acumulado.values()].reduce((t, a) => t + a.aTiempo, 0), todosLosTiempos.length),
    agentes,
    pendientes,
    semanas,
  };
}
