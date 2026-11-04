// Panorama del Informe: qué está sobre la meta, qué lo explica, qué decisión tomar y con quién.
import type { AllAnalyses, DateRange, PriorityLevel, RegistroMAC } from '../types';
import { EN_BLANCO, grupoDeVenta, plantaDeVenta } from './filterEngine';
import { lineasDeProblema, resumirPor, totalProblemas, type LineaProblema } from './conteoProblemas';
import { resumirTemas, type LecturaRadicado, type TemaResumido } from './temasComentarios';

export const META_CALIDAD = 1.0;
export const META_ECONOMICA = 0.5;
/** Con menos ventas el porcentaje no dice nada (3 vendidas y 2 con novedad = 66 %): se muestra, pero no decide. */
export const VENTAS_MINIMAS_PARA_DECIDIR = 100;

/** Área con la que se habla cuando el responsable registrado es este y los comentarios no indican otra. */
const AREA_POR_RESPONSABLE: Record<string, string> = {
    TRANSPORTADORA: 'Logística (transportadora)',
    LOGISTICA: 'Logística',
    PROVEEDOR: 'Compras y Abastecimiento',
    ABASTECIMIENTO: 'Compras y Abastecimiento',
    COMPRAS: 'Compras y Abastecimiento',
    CALIDAD: 'Calidad',
    FIRPLAK: 'Calidad y Producción',
    PRODUCCION: 'Producción',
    'I+D': 'I+D',
    'SERVICIO TECNICO': 'Servicio Técnico',
    ATENCION: 'Líder de MAC',
    MAC: 'Líder de MAC',
    'SERVICIO AL CLIENTE': 'Líder de MAC',
    ASESOR: 'Comercial',
    'VENTAS - COMERCIAL': 'Comercial',
    'DIGITACIÓN': 'Comercial',
};
/** No hay nada que corregir internamente: se registra, no se escala. */
const SIN_ESCALAR = new Set(['FALSA QUEJA', 'CLIENTE']);

export const normalizeCanalName = (g: string): string => {
    if (!g) return 'No Definido';
    const norm = String(g).trim().toLowerCase();
    if (norm.includes('distribu') || norm.includes('exportad') || norm.includes('exportac')) return 'Distribución';
    if (norm.includes('constructor')) return 'Constructor';
    if (norm.includes('b2c') || norm.includes('propio') || norm.includes('ecommerce') || norm.includes('firplak')) return 'Canal Propio';
    if (norm.includes('especial')) return 'Ventas Especiales';
    return g;
};

export const getMercadoVenta = (tipoVenta: string | null | undefined): string => {
    const t = String(tipoVenta || '').trim().toLowerCase();
    if (t === 'nacional') return 'Nacional';
    if (t === 'exterior' || t === 'internacional') return 'Internacional';
    return 'Sin clasificar';
};

const normalNombre = (s: unknown) => String(s || '').toUpperCase().normalize('NFD').replace(/[^A-Z0-9]/g, '');
export const clienteDe = (r: RegistroMAC) => r.cliente_nombre || r.cliente_final_nombre || 'Sin cliente';

// ── Entidades: empresa, plantas, grupos, canales y mercados ───────────────
export type Dimension = 'empresa' | 'planta' | 'grupo' | 'canal' | 'mercado';
export const ETIQUETA_DIMENSION: Record<Dimension, string> = { empresa: 'Empresa', planta: 'Planta', grupo: 'Grupo', canal: 'Canal', mercado: 'Mercado' };

/** "Planta Muebles", "Canal Distribución"; sin repetir cuando el nombre ya la trae: "Canal Propio". */
export const etiquetaEntidad = (e: { dimension: Dimension; nombre: string }) =>
    e.nombre.toLowerCase().startsWith(ETIQUETA_DIMENSION[e.dimension].toLowerCase()) ? e.nombre : `${ETIQUETA_DIMENSION[e.dimension]} ${e.nombre}`;

export interface Indicadores {
    pctNovedad: number | null;
    pctCasos: number | null;
    pctInversion: number | null;
}

export interface Entidad extends Indicadores {
    id: string;
    dimension: Dimension;
    nombre: string;
    unidadesVendidas: number;
    unidadesNovedad: number;
    previo: Indicadores | null;
}

export interface VentaPanorama {
    cantidad: number;
    valor_total: number;
    familia: string;
    planta?: string;
    grupo_cliente?: string;
    tipo_venta: string;
    nombre_cliente?: string;
    grupo_articulo?: string;
}

export const ventaEnEntidad = (e: Pick<Entidad, 'dimension' | 'nombre'>, v: VentaPanorama): boolean => {
    switch (e.dimension) {
        case 'planta': return plantaDeVenta(v) === e.nombre;
        case 'grupo': return grupoDeVenta(v) === e.nombre;
        case 'canal': return normalizeCanalName(v.grupo_cliente || '') === e.nombre;
        case 'mercado': return getMercadoVenta(v.tipo_venta) === e.nombre;
        default: return true;
    }
};
export const lineaEnEntidad = (e: Pick<Entidad, 'dimension' | 'nombre'>, l: LineaProblema): boolean => {
    switch (e.dimension) {
        case 'planta': return l.planta === e.nombre;
        case 'grupo': return l.grupo === e.nombre;
        case 'canal': return normalizeCanalName(l.r.canal_venta) === e.nombre;
        case 'mercado': return (l.r._mercado || 'Sin clasificar') === e.nombre;
        default: return true;
    }
};

/** Mismos cálculos de las tarjetas, para el periodo con el que se compara. */
export function indicadoresDe(e: Pick<Entidad, 'dimension' | 'nombre'>, data: RegistroMAC[], ventas: VentaPanorama[]): Indicadores {
    let vendidas = 0;
    let vendido = 0;
    ventas.forEach((v) => {
        if (!ventaEnEntidad(e, v)) return;
        vendidas += v.cantidad || 0;
        vendido += v.valor_total || 0;
    });
    const filtro = (l: LineaProblema) => lineaEnEntidad(e, l);
    let unidades = 0;
    let inversion = 0;
    const radicados = new Set<number>();
    data.forEach((r) => lineasDeProblema(r).forEach((l) => {
        if (!filtro(l)) return;
        radicados.add(r.id);
        inversion += l.inversion;
        if (l.primera) unidades += l.unidades;
    }));
    // Plantas y grupos cuentan problemas; empresa, canales y mercados cuentan radicados
    const casos = e.dimension === 'planta' || e.dimension === 'grupo' ? totalProblemas(data, filtro) : radicados.size;
    return {
        pctNovedad: vendidas > 0 ? (unidades / vendidas) * 100 : null,
        pctCasos: vendidas > 0 ? (casos / vendidas) * 100 : null,
        pctInversion: vendido > 0 ? (inversion / vendido) * 100 : null,
    };
}

/** Productos con novedad que sobran para que la entidad entre en la meta de calidad. */
const productosSobreMeta = (e: Entidad) => Math.max(0, (((e.pctNovedad ?? 0) - META_CALIDAD) / 100) * e.unidadesVendidas);
/** Casos que hay de más frente a la meta, un indicador distinto al de productos. */
const casosSobreMeta = (e: Entidad) => Math.max(0, (((e.pctCasos ?? 0) - META_CALIDAD) / 100) * e.unidadesVendidas);
const decide = (e: Entidad) => e.unidadesVendidas >= VENTAS_MINIMAS_PARA_DECIDIR && (e.pctNovedad ?? 0) > META_CALIDAD;
const fueraDeMeta = (e: Entidad) => e.unidadesVendidas >= VENTAS_MINIMAS_PARA_DECIDIR && ((e.pctNovedad ?? 0) > META_CALIDAD || (e.pctCasos ?? 0) > META_CALIDAD);

export const excesoDeMeta = (e: Indicadores) => Math.max(
    (e.pctNovedad ?? 0) - META_CALIDAD,
    (e.pctCasos ?? 0) - META_CALIDAD,
    (e.pctInversion ?? 0) - META_ECONOMICA,
);

// ── ¿Qué explica el número? ───────────────────────────────────────────────
export interface FilaAporte {
    nombre: string;
    problemas: number;
    unidades: number;
    radicados: number;
    /** Puntos porcentuales que aporta al % de producto con novedad de la entidad */
    aporte: number | null;
    /** Cómo quedaría la entidad sin este aporte */
    quedaria: number | null;
    entraEnMeta: boolean;
    /** Solo clientes: lo que compró y su propio % */
    vendidas?: number;
    pctPropio?: number | null;
}

export type TipoFoco = 'defecto' | 'cliente' | 'responsable' | 'compra';
export interface Foco { tipo: TipoFoco; valor: string }

export interface Explicacion {
    problemas: number;
    unidades: number;
    radicados: number;
    /** Unidades con novedad que sobran para entrar en la meta de 1 % */
    unidadesSobreMeta: number;
    defectos: FilaAporte[];
    clientes: FilaAporte[];
    responsables: FilaAporte[];
    compras: FilaAporte[];
    piezas: FilaAporte[];
    temas: TemaResumido[];
}

const claveFoco: Record<TipoFoco, (l: LineaProblema) => string> = {
    defecto: (l) => l.defecto,
    cliente: (l) => clienteDe(l.r),
    responsable: (l) => l.responsable,
    compra: (l) => l.compra,
};

export function explicar(e: Entidad, foco: Foco[], data: RegistroMAC[], ventas: VentaPanorama[], lecturas: Map<number, LecturaRadicado>): Explicacion {
    const filtro = (l: LineaProblema) => lineaEnEntidad(e, l) && foco.every((f) => claveFoco[f.tipo](l) === f.valor);
    const vendidasPorCliente = new Map<string, number>();
    ventas.forEach((v) => {
        if (!ventaEnEntidad(e, v)) return;
        const clave = normalNombre(v.nombre_cliente);
        vendidasPorCliente.set(clave, (vendidasPorCliente.get(clave) || 0) + (v.cantidad || 0));
    });

    const filas = (claveDe: (l: LineaProblema) => string, conCliente = false): FilaAporte[] =>
        [...resumirPor(data, claveDe, filtro).entries()]
            .map(([nombre, s]) => {
                const aporte = e.unidadesVendidas > 0 ? (s.unidades / e.unidadesVendidas) * 100 : null;
                const quedaria = aporte !== null && e.pctNovedad !== null ? e.pctNovedad - aporte : null;
                const vendidas = conCliente ? vendidasPorCliente.get(normalNombre(nombre)) : undefined;
                return {
                    nombre,
                    problemas: s.problemas,
                    unidades: s.unidades,
                    radicados: s.radicados.size,
                    aporte,
                    quedaria,
                    entraEnMeta: (e.pctNovedad ?? 0) > META_CALIDAD && quedaria !== null && quedaria <= META_CALIDAD,
                    vendidas,
                    pctPropio: vendidas ? (s.unidades / vendidas) * 100 : null,
                };
            })
            .sort((a, b) => b.unidades - a.unidades || b.problemas - a.problemas);

    const total = resumirPor(data, () => 'total', filtro).get('total');
    const sobra = e.pctNovedad !== null && e.pctNovedad > META_CALIDAD ? ((e.pctNovedad - META_CALIDAD) / 100) * e.unidadesVendidas : 0;

    return {
        problemas: total?.problemas || 0,
        unidades: total?.unidades || 0,
        radicados: total?.radicados.size || 0,
        unidadesSobreMeta: Math.ceil(sobra),
        defectos: filas((l) => l.defecto),
        clientes: filas((l) => clienteDe(l.r), true),
        responsables: filas((l) => l.responsable),
        compras: filas((l) => l.compra),
        piezas: filas((l) => l.producto),
        temas: total ? resumirTemas(total.radicados, lecturas) : [],
    };
}

// ── Decisiones recomendadas ───────────────────────────────────────────────
export interface Decision {
    prioridad: PriorityLevel;
    accion: string;
    problema: string;
    motivo: string;
    responsable: string;
    hablarCon: string;
    problemas: number;
    unidades: number;
    radicadosIds: number[];
    fotos: string[];
    inversion: number;
    variacion: number | null;
    meses: number;
    /** Dónde empuja: ['Planta Muebles (+0,40 pp)'] */
    empuja: string[];
    topCompra: string;
    topPieza: string;
    topCliente: string;
    temas: TemaResumido[];
    evidencia: string;
}

const pp = (v: number) => `${v.toFixed(2).replace('.', ',')} pp`;
export const fmtPorcentaje = (v: number | null | undefined) => (v === null || v === undefined ? '—' : `${v.toFixed(2).replace('.', ',')} %`);
const util = (nombre: string): boolean => !!nombre && nombre !== 'Varios productos de compra' && nombre !== 'Sin producto de compra';

export function generarDecisiones(analysis: AllAnalyses, entidades: Entidad[], data: RegistroMAC[], lecturas: Map<number, LecturaRadicado>): Decision[] {
    // Dónde empuja cada defecto: los 3 que más aportan en cada planta, grupo, canal o mercado sobre la meta
    const empuja = new Map<string, Array<{ texto: string; aporte: number }>>();
    entidades
        .filter(decide)
        .forEach((e) => {
            [...resumirPor(data, (l) => l.defecto, (l) => lineaEnEntidad(e, l)).entries()]
                .filter(([nombre]) => nombre !== EN_BLANCO)
                .sort((a, b) => b[1].unidades - a[1].unidades)
                .slice(0, 3)
                .forEach(([nombre, s]) => {
                    const aporte = e.unidadesVendidas > 0 ? (s.unidades / e.unidadesVendidas) * 100 : 0;
                    const lista = empuja.get(nombre) || [];
                    lista.push({ texto: `${etiquetaEntidad(e)} (${pp(aporte)})`, aporte });
                    empuja.set(nombre, lista);
                });
        });

    return analysis.defects
        .filter((d) => d.recordsCurr > 0)
        .map<Decision>((d) => {
            const filtro = (l: LineaProblema) => l.defecto === d.name;
            const top = (claveDe: (l: LineaProblema) => string, valida: (n: string) => boolean = () => true) =>
                [...resumirPor(data, claveDe, filtro).entries()].filter(([n]) => valida(n)).sort((a, b) => b[1].unidades - a[1].unidades)[0]?.[0] || '';
            const responsable = top((l) => l.responsable) || 'Sin responsable';
            const resumen = resumirPor(data, () => d.name, filtro).get(d.name);
            const ids = resumen ? [...resumen.radicados] : [];
            const temas = resumirTemas(ids, lecturas);
            const fotos = ids.flatMap((id) => lecturas.get(id)?.fotos || []);
            const empujaLista = (empuja.get(d.name) || []).sort((a, b) => b.aporte - a.aporte);

            // El tema solo cambia el interlocutor cuando aparece en al menos un tercio de los radicados
            const temaFuerte = temas.find((t) => t.radicados >= Math.max(2, ids.length / 3) && t.tema.id === 'empaque');
            const hablarConArea = temaFuerte?.tema.area || AREA_POR_RESPONSABLE[responsable.toUpperCase().trim()] || temas[0]?.tema.area || responsable;

            const sinEscalar = SIN_ESCALAR.has(responsable.toUpperCase().trim()) || SIN_ESCALAR.has(d.name.toUpperCase().trim());
            const noBaja = d.variationRecords === null || d.variationRecords >= 0;
            let prioridad: PriorityLevel;
            let accion: string;
            let motivo: string;
            if (sinEscalar) {
                prioridad = 'estable';
                accion = 'No escalar';
                motivo = `La causa registrada es ${responsable}; no hay un proceso interno que corregir.`;
            } else if (empujaLista.length > 0 && d.recurrence >= 2 && noBaja) {
                prioridad = 'inmediato';
                accion = 'Abrir QRR';
                motivo = `Empuja sobre la meta a ${empujaLista[0].texto}, lleva ${d.recurrence} meses y no baja.`;
            } else if (empujaLista.length > 0) {
                prioridad = 'seguimiento';
                accion = 'Hacer seguimiento';
                motivo = d.recurrence < 2
                    ? `Empuja sobre la meta a ${empujaLista[0].texto}, pero es su primer mes.`
                    : `Empuja sobre la meta a ${empujaLista[0].texto}, aunque viene bajando.`;
            } else if (d.variationRecords === null || d.variationRecords > 0) {
                prioridad = 'seguimiento';
                accion = 'Hacer seguimiento';
                motivo = d.variationRecords === null ? 'Es nuevo en este periodo.' : `Subió ${d.variationRecords.toFixed(0)} % frente al periodo anterior.`;
            } else {
                prioridad = 'vigilar';
                accion = 'Vigilar';
                motivo = d.variationRecords === 0 ? 'Se mantiene igual y no empuja ninguna meta.' : 'Va bajando y no empuja ninguna meta.';
            }

            const topCompra = top((l) => l.compra, util);
            const topPieza = top((l) => l.producto);
            const topCliente = top((l) => clienteDe(l.r));
            const partes = [
                `${d.recordsCurr} problemas en ${ids.length} radicados, ${d.unitsCurr} productos afectados`,
                fotos.length ? `${fotos.length} fotos adjuntas` : 'sin fotos adjuntas',
                topCompra ? `más afectado: ${topCompra}${topPieza && topPieza !== topCompra ? ` (pieza ${topPieza})` : ''}` : topPieza ? `más afectado: ${topPieza}` : '',
                topCliente ? `cliente principal: ${topCliente}` : '',
            ].filter(Boolean);

            return {
                prioridad, accion, motivo, responsable,
                hablarCon: hablarConArea,
                problema: d.name,
                problemas: d.recordsCurr,
                unidades: d.unitsCurr,
                radicadosIds: ids,
                fotos,
                inversion: d.valueCurr,
                variacion: d.variationRecords,
                meses: d.recurrence,
                empuja: empujaLista.map((x) => x.texto),
                topCompra, topPieza, topCliente, temas,
                evidencia: partes.join(' · '),
            };
        })
        .sort((a, b) => ordenPrioridad[a.prioridad] - ordenPrioridad[b.prioridad] || b.unidades - a.unidades);
}
const ordenPrioridad: Record<PriorityLevel, number> = { inmediato: 0, seguimiento: 1, vigilar: 2, estable: 3 };

// ── Resumen ejecutivo ─────────────────────────────────────────────────────
export interface SeccionResumen { titulo: string; lineas: string[] }

const tendencia = (actual: number | null, previo: number | null | undefined) => {
    if (actual === null || previo === null || previo === undefined) return 'sin periodo para comparar';
    const d = actual - previo;
    if (Math.abs(d) < 0.005) return 'igual que el periodo anterior';
    return `${d > 0 ? 'sube' : 'baja'} ${pp(Math.abs(d))} (venía en ${fmtPorcentaje(previo)})`;
};
const frenteAMeta = (v: number | null, meta: number) => (v === null ? 'sin ventas para calcular' : v > meta ? `${pp(v - meta)} sobre la meta` : 'dentro de la meta');

export function generarResumen(
    empresa: Entidad, entidades: Entidad[], analysis: AllAnalyses, decisiones: Decision[], data: RegistroMAC[],
    ventas: VentaPanorama[], lecturas: Map<number, LecturaRadicado>, anterior: DateRange,
): SeccionResumen[] {
    const secciones: SeccionResumen[] = [];
    const prev = empresa.previo;
    secciones.push({
        titulo: 'Cómo estamos',
        lineas: [
            `Producto con novedad: ${fmtPorcentaje(empresa.pctNovedad)}, ${frenteAMeta(empresa.pctNovedad, META_CALIDAD)}; ${tendencia(empresa.pctNovedad, prev?.pctNovedad)}.`,
            `Casos: ${fmtPorcentaje(empresa.pctCasos)}, ${frenteAMeta(empresa.pctCasos, META_CALIDAD)}; ${tendencia(empresa.pctCasos, prev?.pctCasos)}.`,
            `Inversión sobre venta: ${fmtPorcentaje(empresa.pctInversion)}, ${frenteAMeta(empresa.pctInversion, META_ECONOMICA)}; ${tendencia(empresa.pctInversion, prev?.pctInversion)}.`,
        ],
    });

    // Mejoras y retrocesos, en problemas frente al periodo anterior
    const conCambio = analysis.defects.filter((d) => d.recordsPrev > 0 && d.recordsCurr !== d.recordsPrev && d.name !== EN_BLANCO);
    const texto = (d: AllAnalyses['defects'][number]) => `${d.name} (${d.recordsPrev} → ${d.recordsCurr})`;
    const suben = [...conCambio].filter((d) => d.recordsCurr > d.recordsPrev).sort((a, b) => (b.recordsCurr - b.recordsPrev) - (a.recordsCurr - a.recordsPrev)).slice(0, 4);
    const bajan = [...conCambio].filter((d) => d.recordsCurr < d.recordsPrev).sort((a, b) => (a.recordsCurr - a.recordsPrev) - (b.recordsCurr - b.recordsPrev)).slice(0, 4);
    const nuevos = analysis.defects.filter((d) => d.recordsPrev === 0 && d.recordsCurr > 0).sort((a, b) => b.recordsCurr - a.recordsCurr).slice(0, 3);
    const movimiento = [
        ...(bajan.length ? [`Mejorando frente a ${anterior.label}: ${bajan.map(texto).join(', ')}.`] : []),
        ...(suben.length ? [`Empeorando: ${suben.map(texto).join(', ')}.`] : []),
        ...(nuevos.length ? [`Nuevos este periodo: ${nuevos.map((d) => `${d.name} (${d.recordsCurr})`).join(', ')}.`] : []),
    ];
    if (movimiento.length) secciones.push({ titulo: 'Qué mejora y qué empeora', lineas: movimiento });

    // Lo que saca de meta a cada planta, grupo o canal
    const sobreMeta = entidades
        .filter((e) => e.dimension !== 'empresa' && e.dimension !== 'mercado' && fueraDeMeta(e))
        .sort((a, b) => (productosSobreMeta(b) + casosSobreMeta(b)) - (productosSobreMeta(a) + casosSobreMeta(a)))
        .slice(0, 5);
    const lineasMeta = sobreMeta.map((e) => {
        const x = explicar(e, [], data, ventas, lecturas);
        const defecto = x.defectos.find((f) => f.nombre !== EN_BLANCO);
        const cliente = x.clientes[0];
        const responsable = x.responsables.find((f) => f.nombre !== EN_BLANCO);
        const partes = [
            defecto && `el defecto que más pesa es ${defecto.nombre} (${pp(defecto.aporte ?? 0)})`,
            responsable && `responsable principal ${responsable.nombre}`,
            cliente && `el cliente que más aporta es ${cliente.nombre} (${pp(cliente.aporte ?? 0)})`,
        ].filter(Boolean);
        const frente = (valor: number | null, exceso: number, unidad: string) =>
            `${fmtPorcentaje(valor)} (${exceso > 0 ? `${Math.ceil(exceso)} ${unidad} por encima de la meta` : 'dentro de la meta'})`;
        return `${etiquetaEntidad(e)}. Productos con novedad: ${frente(e.pctNovedad, productosSobreMeta(e), 'productos')}. Casos: ${frente(e.pctCasos, casosSobreMeta(e), 'casos')}. ${partes.join('; ')}.`.replace(/\. el /, '. El ');
    });
    if (lineasMeta.length) secciones.push({ titulo: 'Qué nos saca de la meta', lineas: lineasMeta });

    const temas = resumirTemas(data.map((r) => r.id), lecturas).slice(0, 4);
    if (temas.length) {
        secciones.push({
            titulo: 'Lo que cuentan los comentarios de MAC',
            lineas: temas.map((t) => `${t.tema.nombre}: ${t.radicados} radicados${t.fotos ? `, ${t.fotos} fotos` : ''}. Tema para hablar con ${t.tema.area}.`),
        });
    }

    const qrr = decisiones.filter((d) => d.prioridad === 'inmediato').slice(0, 4);
    const seguimiento = decisiones.filter((d) => d.prioridad === 'seguimiento').slice(0, 3);
    secciones.push({
        titulo: 'Qué atacar primero',
        lineas: [
            ...(qrr.length
                ? qrr.map((d) => `${d.problema}: abrir QRR con ${d.hablarCon}. ${d.motivo}`)
                : ['Ningún problema cumple hoy las condiciones para abrir QRR.']),
            ...(seguimiento.length ? [`En seguimiento: ${seguimiento.map((d) => d.problema).join(', ')}.`] : []),
        ],
    });

    return secciones;
}
