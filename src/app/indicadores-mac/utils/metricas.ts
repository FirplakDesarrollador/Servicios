// Definición única de los indicadores de servicio: todas las hojas los calculan desde aquí.
import type { RegistroMAC } from '../types';

export const SLA_DIAS_HABILES = 15;

/** Días hábiles del caso: hasta la verificación si está cerrado; hasta hoy si sigue abierto. */
const diasDelCaso = (d: RegistroMAC) => (d._tiempoCierre != null ? d._tiempoCierre : d._diasHabilesAbierta ?? 0);

/** El caso superó el SLA: cerrado tarde o abierto que ya pasó el plazo. */
export const estaFueraDeSla = (d: RegistroMAC) => diasDelCaso(d) > SLA_DIAS_HABILES;

/**
 * % de cumplimiento oficial: casos (cerrados y abiertos) que no han superado el SLA sobre el total.
 * Decisión de negocio: un abierto vencido también descuenta, aunque aún no se haya resuelto.
 */
export function porcentajeCumplimiento(data: RegistroMAC[]): number {
    if (data.length === 0) return 0;
    return ((data.length - data.filter(estaFueraDeSla).length) / data.length) * 100;
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
