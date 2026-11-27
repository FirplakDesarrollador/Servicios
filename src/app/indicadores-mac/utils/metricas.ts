// Definición única de los indicadores de servicio: todas las hojas los calculan desde aquí.
import type { RegistroMAC } from '../types';

export const SLA_DIAS_HABILES = 15;

/** Días hábiles del caso: hasta la verificación si está cerrado; hasta hoy si sigue abierto. */
const diasDelCaso = (d: RegistroMAC) => (d._tiempoCierre != null ? d._tiempoCierre : d._diasHabilesAbierta ?? 0);

// ── Mercado ────────────────────────────────────────────────────────────────────
// El SLA de 15 días hábiles es solo del mercado nacional: reponer en Panamá o Ecuador tarda
// mucho más, así que el internacional no tiene meta; solo se mide su tiempo promedio de cierre.
// "Sin clasificar" se toma como nacional (la gran mayoría de clientes son locales).
export const esInternacional = (d: RegistroMAC) => d._mercado === 'Internacional';

/** Casos que se miden contra el SLA (mercado nacional). */
export const casosConSla = (data: RegistroMAC[]) => data.filter((d) => !esInternacional(d));

/** El caso superó el SLA: cerrado tarde o abierto que ya pasó el plazo. Un internacional nunca, porque no tiene meta. */
export const estaFueraDeSla = (d: RegistroMAC) => !esInternacional(d) && diasDelCaso(d) > SLA_DIAS_HABILES;

/**
 * % de cumplimiento oficial, solo mercado nacional: casos (cerrados y abiertos) que no han superado el SLA sobre el total.
 * Decisión de negocio: un abierto vencido también descuenta, aunque aún no se haya resuelto.
 * Devuelve 0 si no hay casos nacionales.
 */
export function porcentajeCumplimiento(data: RegistroMAC[]): number {
    const nacional = casosConSla(data);
    if (nacional.length === 0) return 0;
    return ((nacional.length - nacional.filter(estaFueraDeSla).length) / nacional.length) * 100;
}

export const promedio = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

export function mediana(xs: number[]): number | null {
    if (xs.length === 0) return null;
    const s = [...xs].sort((a, b) => a - b);
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** Días hábiles reales de solución (creación → fecha de verificación) de los casos cerrados. */
export const tiemposDeSolucion = (data: RegistroMAC[]) =>
    data.filter((d) => d.estado === 'Cerrado' && typeof d._tiempoCierre === 'number').map((d) => d._tiempoCierre as number);

/** Mercado internacional (sin meta): días hábiles promedio de cierre y cuántos casos hay. */
export function cierreInternacional(data: RegistroMAC[]) {
    const internacional = data.filter(esInternacional);
    const tiempos = tiemposDeSolucion(internacional);
    return {
        total: internacional.length,
        cerrados: tiempos.length,
        abiertos: internacional.filter((d) => d.estado !== 'Cerrado').length,
        promedio: promedio(tiempos),
        mediana: mediana(tiempos),
    };
}

// ── Problemas repetidos ────────────────────────────────────────────────────────
// Un distribuidor tiene muchos radicados por volumen; lo que afecta la experiencia es que
// el MISMO problema se le repita al mismo cliente.
export const VENTANA_REPETIDOS_DIAS = 90;
const DIA_MS = 86400000;

export interface ProblemaRepetido {
    key: string;
    cliente: string;
    problema: string;
    veces: number;
    menorIntervalo: number;
    ultimo: number;
}

export function calcularProblemasRepetidos(data: RegistroMAC[]) {
    const pares = new Map<string, { cliente: string; problema: string; fechas: number[] }>();
    let radicadosConCliente = 0;
    for (const d of data) {
        const cliente = d._clientePrincipalFinal;
        const fecha = new Date(d.created_at).getTime();
        if (!cliente || cliente === 'Desconocido' || Number.isNaN(fecha)) continue;
        radicadosConCliente++;
        for (const problema of new Set(d._defectosNombres || [])) {
            const key = `${cliente}\u0000${problema}`;
            const e = pares.get(key) || { cliente, problema, fechas: [] };
            e.fechas.push(fecha);
            pares.set(key, e);
        }
    }
    const lista: ProblemaRepetido[] = [];
    let repeticiones = 0;
    for (const [key, e] of pares) {
        if (e.fechas.length < 2) continue;
        const f = e.fechas.sort((a, b) => a - b);
        let menor = Infinity;
        for (let i = 1; i < f.length; i++) menor = Math.min(menor, (f[i] - f[i - 1]) / DIA_MS);
        if (menor > VENTANA_REPETIDOS_DIAS) continue;
        repeticiones += f.length - 1;
        lista.push({ key, cliente: e.cliente, problema: e.problema, veces: f.length, menorIntervalo: menor, ultimo: f[f.length - 1] });
    }
    return {
        lista: lista.sort((a, b) => b.veces - a.veces || a.menorIntervalo - b.menorIntervalo),
        tasa: radicadosConCliente ? repeticiones / radicadosConCliente : 0,
        clientes: new Set(lista.map((l) => l.cliente)).size,
    };
}
