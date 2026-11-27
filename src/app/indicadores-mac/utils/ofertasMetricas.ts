// Indicadores de ingreso de ofertas de venta (SAP, OQUT). Definición única para la hoja Ofertas.
import { getBusinessDaysDifference, isBusinessDay } from './businessDays';
import type { FilaOfertaCorreo } from './ofertasCorreos';

export interface OfertaIndicador {
    docEntry: number;
    docNum: number;
    fecha: string;
    creacion: string;
    modificacion: string | null;
    cliente: string;
    totalAntesIva: number;
    iva: number;
    moneda: string;
    estado: 'Confirmada' | 'Pendiente' | 'Otro';
    estadoSap: string;
    cancelada: boolean;
    cerrada: boolean;
    usuario: number | null;
}

export type Agrupacion = 'dia' | 'semana' | 'mes';

const DIA_MS = 86400000;
const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

/** 'AAAA-MM-DD' a fecha local (sin desfase de zona horaria). */
export const aFecha = (s: string) => {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d);
};
export const aClave = (f: Date) => `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(f.getDate()).padStart(2, '0')}`;

/** Días hábiles (lunes a viernes sin festivos de Colombia) entre dos fechas, ambas incluidas. */
export function diasHabilesEntre(desde: string, hasta: string): number {
    let n = 0;
    for (let f = aFecha(desde); f <= aFecha(hasta); f = new Date(f.getTime() + DIA_MS)) if (isBusinessDay(f)) n++;
    return n;
}

/** Lunes de la semana de la fecha. */
function lunes(s: string) {
    const f = aFecha(s);
    const dow = (f.getDay() + 6) % 7;
    return aClave(new Date(f.getFullYear(), f.getMonth(), f.getDate() - dow));
}

export function claveGrupo(fecha: string, g: Agrupacion) {
    if (g === 'dia') return fecha;
    if (g === 'semana') return lunes(fecha);
    return fecha.slice(0, 7);
}

export function etiquetaGrupo(clave: string, g: Agrupacion) {
    if (g === 'mes') {
        const [y, m] = clave.split('-');
        return `${MESES[Number(m) - 1]} ${y.slice(2)}`;
    }
    const [, m, d] = clave.split('-');
    return g === 'semana' ? `Sem ${d}/${m}` : `${d}/${m}`;
}

/** Solo cuentan las ofertas vigentes: las canceladas en SAP no son trabajo ingresado. */
export const vigentes = (xs: OfertaIndicador[]) => xs.filter((o) => !o.cancelada);

export function resumenOfertas(ofertas: OfertaIndicador[], desde: string, hasta: string) {
    const xs = vigentes(ofertas);
    const valor = xs.reduce((a, o) => a + o.totalAntesIva, 0);
    const confirmadas = xs.filter((o) => o.estado === 'Confirmada');
    const pendientes = xs.filter((o) => o.estado === 'Pendiente');
    const habiles = Math.max(1, diasHabilesEntre(desde, hasta));
    const semanas = new Set(xs.map((o) => claveGrupo(o.creacion, 'semana'))).size;
    const meses = new Set(xs.map((o) => claveGrupo(o.creacion, 'mes'))).size;
    // Aproximación: SAP no guarda la fecha en que se marcó "Confirmada"; se usa la última modificación.
    const diasConfirmar = confirmadas
        .filter((o) => o.modificacion)
        .map((o) => Math.max(0, Math.round((aFecha(o.modificacion as string).getTime() - aFecha(o.creacion).getTime()) / DIA_MS)));
    return {
        total: xs.length,
        canceladas: ofertas.length - xs.length,
        valor,
        ticket: xs.length ? valor / xs.length : 0,
        confirmadas: confirmadas.length,
        pendientes: pendientes.length,
        otras: xs.length - confirmadas.length - pendientes.length,
        valorPendiente: pendientes.reduce((a, o) => a + o.totalAntesIva, 0),
        porDiaHabil: xs.length / habiles,
        porSemana: semanas ? xs.length / semanas : 0,
        porMes: meses ? xs.length / meses : 0,
        valorPorSemana: semanas ? valor / semanas : 0,
        valorPorMes: meses ? valor / meses : 0,
        diasConfirmar: diasConfirmar.length ? diasConfirmar.reduce((a, b) => a + b, 0) / diasConfirmar.length : null,
    };
}

export function serieOfertas(ofertas: OfertaIndicador[], g: Agrupacion, desde: string, hasta: string) {
    const grupos = new Map<string, { Ofertas: number; Confirmadas: number; Pendientes: number; Valor: number }>();
    // Los días sin ofertas también se muestran (solo hábiles en la vista diaria)
    for (let f = aFecha(desde); f <= aFecha(hasta); f = new Date(f.getTime() + DIA_MS)) {
        if (g === 'dia' && !isBusinessDay(f)) continue;
        const k = claveGrupo(aClave(f), g);
        if (!grupos.has(k)) grupos.set(k, { Ofertas: 0, Confirmadas: 0, Pendientes: 0, Valor: 0 });
    }
    for (const o of vigentes(ofertas)) {
        const k = claveGrupo(o.creacion, g);
        const e = grupos.get(k) || { Ofertas: 0, Confirmadas: 0, Pendientes: 0, Valor: 0 };
        e.Ofertas++;
        if (o.estado === 'Confirmada') e.Confirmadas++;
        else if (o.estado === 'Pendiente') e.Pendientes++;
        e.Valor += o.totalAntesIva;
        grupos.set(k, e);
    }
    return [...grupos.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([clave, v]) => ({ clave, etiqueta: etiquetaGrupo(clave, g), ...v }));
}

export function porUsuario(ofertas: OfertaIndicador[], nombres: Record<number, string>, desde: string, hasta: string) {
    const grupos = new Map<string, OfertaIndicador[]>();
    for (const o of vigentes(ofertas)) {
        const k = o.usuario === null ? 'Sin usuario' : nombres[o.usuario] || `Usuario ${o.usuario}`;
        const l = grupos.get(k);
        if (l) l.push(o);
        else grupos.set(k, [o]);
    }
    const habiles = Math.max(1, diasHabilesEntre(desde, hasta));
    return [...grupos.entries()]
        .map(([nombre, xs]) => ({
            nombre,
            ofertas: xs.length,
            valor: xs.reduce((a, o) => a + o.totalAntesIva, 0),
            confirmadas: xs.filter((o) => o.estado === 'Confirmada').length,
            pendientes: xs.filter((o) => o.estado === 'Pendiente').length,
            porDia: xs.length / habiles,
        }))
        .sort((a, b) => b.ofertas - a.ofertas);
}

// ── Tiempos desde el correo del asesor (buzón cotizaciones@) ───────────────────
const HORA_MS = 3600000;

/** Fecha 'AAAA-MM-DD' en hora de Colombia (UTC-5) de un instante ISO. */
const fechaColombia = (iso: string) => new Date(new Date(iso).getTime() - 5 * HORA_MS).toISOString().slice(0, 10);

/**
 * Cruza cada oferta con la primera respuesta "Oferta de venta n° ####" de cotizaciones@.
 * - Respuesta: horas calendario desde que el asesor envió el correo hasta la respuesta.
 * - Ingreso a SAP: días hábiles desde el día del correo hasta el día de creación de la oferta.
 */
export function tiemposDesdeCorreo(ofertas: OfertaIndicador[], correos: FilaOfertaCorreo[]) {
    const primera = new Map<number, FilaOfertaCorreo>();
    for (const c of correos) {
        const previa = primera.get(c.numero_oferta);
        if (!previa || c.fecha_respuesta < previa.fecha_respuesta) primera.set(c.numero_oferta, c);
    }
    const horasRespuesta: number[] = [];
    const diasSap: number[] = [];
    let conCorreo = 0;
    for (const o of vigentes(ofertas)) {
        const c = primera.get(o.docNum);
        if (!c) continue;
        conCorreo++;
        if (!c.fecha_correo_asesor) continue;
        const horas = (new Date(c.fecha_respuesta).getTime() - new Date(c.fecha_correo_asesor).getTime()) / HORA_MS;
        if (horas >= 0 && horas < 24 * 60) horasRespuesta.push(horas); // fuera de rango = fecha mal leída
        const desde = aFecha(fechaColombia(c.fecha_correo_asesor));
        const hasta = aFecha(o.creacion);
        if (hasta >= desde) diasSap.push(getBusinessDaysDifference(desde, hasta));
    }
    const prom = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
    return {
        conCorreo,
        sinCorreo: vigentes(ofertas).length - conCorreo,
        horasRespuesta: prom(horasRespuesta),
        diasSap: prom(diasSap),
        medidas: horasRespuesta.length,
    };
}
