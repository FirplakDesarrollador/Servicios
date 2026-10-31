// Motor de filtros de Indicadores MAC.
//
// Antes, cada cambio de filtro recorría todos los registros 13 veces (la vista filtrada y 12 vistas
// "excepto un filtro" para los filtros cruzados) y en cada pasada volvía a normalizar textos de cada
// registro. Ahora se hace UNA sola pasada: para cada registro se calcula qué filtros no cumple (una
// máscara de bits) y de ahí salen todas las vistas. Los textos normalizados de cada registro se
// calculan una sola vez y se guardan. La lógica de coincidencia es la misma de antes.
import type { FilterState, RegistroMAC } from '../types';

export const normalizeGrupo = (g: string): string => {
    if (!g || g === 'En Blanco' || g.toLowerCase() === 'en blanco') return 'En Blanco';
    const norm = String(g).trim().toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    if (['COCINA', 'COCINAS'].includes(norm)) return 'Cocinas';
    if (['BANO', 'BANOS'].includes(norm)) return 'Baño';
    if (['HIDROTERAPIA', 'HIDROMASAJE', 'HIDROMASAJES', 'SPA', 'TINA'].includes(norm)) return 'Hidroterapia';
    if (['LABOR', 'LABORES'].includes(norm)) return 'Labores';
    if (['GRIFERIA', 'GRIFERIAS'].includes(norm)) return 'Griferia';
    if (['PLOMERIA', 'PLOMERIAS'].includes(norm)) return 'Plomeria';
    if (['SERVICIO', 'SERVICIOS'].includes(norm)) return 'Servicios';
    if (['CUIDADO&MANTENIMIENTO', 'CUIDADO & MANTENIMIENTO'].includes(norm)) return 'Cuidado&Mantenimiento';
    return 'En Blanco';
};

export const normalizePlantaName = (planta: string): string => {
    if (!planta || !String(planta).trim() || String(planta).trim().toLowerCase().includes('seleccione')) return 'En Blanco';
    const p = String(planta).toUpperCase().trim().normalize('NFD').replace(/[̀-ͯ]/g, '');
    if (['MARMOL', 'MARMOLES', 'PC'].includes(p)) return 'Marmol';
    if (['MUEBLE', 'MUEBLES', 'MBL'].includes(p)) return 'Muebles';
    if (['FIBRA', 'FIBRAS', 'FV', 'FVHM', 'FVHMP'].includes(p)) return 'Fibra';
    if (['COMERCIALIZADO', 'COMERCIALIZADOS'].includes(p)) return 'Comercializado';
    if (['SERVICIO', 'SERVICIOS'].includes(p)) return 'Servicios';
    if (p === 'RTM') return 'RTM';
    if (['QUARZTONE', 'CUARZO'].includes(p)) return 'Quarztone';
    return 'En Blanco';
};

/** Filtros con vista cruzada ("todo menos este filtro"). El rango de fechas siempre se aplica. */
export const CROSS_KEYS = [
    'estado', 'mercado', 'canalVenta', 'tipoSolicitud', 'agenteMac', 'ciudades', 'zonas', 'clientes',
    'mesPresupuesto', 'mesCreacion', 'estadoRiesgo', 'defectos', 'responsables', 'productos', 'plantas',
] as const;
export type CrossKey = (typeof CROSS_KEYS)[number];

const BIT = Object.fromEntries(CROSS_KEYS.map((k, i) => [k, 1 << i])) as Record<CrossKey, number>;

const stripAccents = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
const upperTrim = (v: unknown) => String(v).toUpperCase().trim();

interface RowIndex {
    canal: string;
    tipo: string;
    defectos: Set<string>;
    responsables: Set<string>;
    productos: Set<string>;
    plantas: Set<string>;
    grupos: Set<string>;
}

// Índice por registro, calculado una sola vez (los registros no cambian después de cargarse).
const rowIndexCache = new WeakMap<object, RowIndex>();
function rowIndex(d: RegistroMAC): RowIndex {
    let idx = rowIndexCache.get(d);
    if (!idx) {
        const r = d as any;
        idx = {
            canal: stripAccents((d.canal_venta || '').toLowerCase()),
            tipo: d.tipo_solicitud ? stripAccents(d.tipo_solicitud).toLowerCase().trim() : '',
            defectos: new Set((d._defectosNombres || []).map(upperTrim)),
            responsables: new Set((d._responsablesNombres || []).map(upperTrim)),
            productos: new Set((d._productosNombres || []).map(upperTrim)),
            plantas: new Set((d._plantasNombres || []).map(upperTrim)),
            grupos: new Set(((r._gruposNombres as string[]) || []).map(upperTrim)),
        };
        rowIndexCache.set(d, idx);
    }
    return idx;
}

const matchesCanal = (dCanal: string, f: string) =>
    dCanal === f || dCanal.includes(f) || f.includes(dCanal) ||
    (f.includes('distribucion') && (dCanal.includes('distribuid') || dCanal.includes('ditribuid') || dCanal.includes('export'))) ||
    (f.includes('constructor') && dCanal.includes('construct')) ||
    ((f.includes('propio') || f.includes('b2c')) && (dCanal.includes('propio') || dCanal.includes('firplakhome') || dCanal.includes('ecommerce') || dCanal.includes('b2c'))) ||
    (f.includes('especial') && dCanal.includes('especial'));

export interface FilterViews {
    /** Registros que cumplen todos los filtros. */
    all: RegistroMAC[];
    /** Registros que cumplen todos los filtros excepto el indicado (para los filtros cruzados). */
    except: Record<CrossKey, RegistroMAC[]>;
}

export function computeFilterViews(data: RegistroMAC[], filters: FilterState): FilterViews {
    const fechaInicialTs = filters.fechaInicial ? new Date(filters.fechaInicial).getTime() : null;
    const fechaFinalTs = filters.fechaFinal ? new Date(filters.fechaFinal).getTime() + 86400000 : null;

    // Valores de filtro normalizados una sola vez por cambio de filtros
    const canalF = filters.canalVenta.map((f) => stripAccents(f.toLowerCase()));
    const tipoF = filters.tipoSolicitud.map((f) => stripAccents(f).toLowerCase().trim());
    const defectosF = filters.defectos.map(upperTrim);
    const responsablesF = filters.responsables.map(upperTrim);
    const plantasF = filters.plantas.map(upperTrim);
    const productosF = filters.productos.map((f) => {
        const s = String(f);
        if (s.toUpperCase().startsWith('PL:')) return { set: 'plantas' as const, value: normalizePlantaName(s.substring(3)).toUpperCase().trim() };
        if (s.toUpperCase().startsWith('GF:')) return { set: 'grupos' as const, value: normalizeGrupo(s.substring(3)).toUpperCase().trim() };
        return { set: 'productos' as const, value: upperTrim(s) };
    });
    const mercadoF = filters.mercado || [];

    const all: RegistroMAC[] = [];
    const except = Object.fromEntries(CROSS_KEYS.map((k) => [k, [] as RegistroMAC[]])) as Record<CrossKey, RegistroMAC[]>;

    for (const d of data) {
        const ts = (d as any)._createdAtTs as number;
        if (fechaInicialTs !== null && ts < fechaInicialTs) continue;
        if (fechaFinalTs !== null && ts > fechaFinalTs) continue;

        let fails = 0;
        if (filters.estado.length > 0 && !filters.estado.includes(d.estado)) fails |= BIT.estado;
        if (mercadoF.length > 0 && !mercadoF.includes((d as any)._mercado || 'Sin clasificar')) fails |= BIT.mercado;
        if (filters.agenteMac.length > 0 && !filters.agenteMac.includes(d._agenteNombre || '')) fails |= BIT.agenteMac;
        if (filters.ciudades.length > 0 && !filters.ciudades.includes(d._ciudad || '')) fails |= BIT.ciudades;
        if (filters.zonas.length > 0 && !filters.zonas.includes(d._zona || '')) fails |= BIT.zonas;
        if (filters.clientes.length > 0 && !filters.clientes.includes(d._clientePrincipalFinal || '')) fails |= BIT.clientes;
        if (filters.mesPresupuesto.length > 0 && !filters.mesPresupuesto.includes(d._mesPresupuestoKey || '')) fails |= BIT.mesPresupuesto;
        if (filters.mesCreacion.length > 0 && !filters.mesCreacion.includes(d._mesCreacionKey || '')) fails |= BIT.mesCreacion;
        if (filters.estadoRiesgo.length > 0 && !filters.estadoRiesgo.includes(d._estadoRiesgo || '')) fails |= BIT.estadoRiesgo;

        if (canalF.length > 0 || tipoF.length > 0 || defectosF.length > 0 || responsablesF.length > 0 || productosF.length > 0 || plantasF.length > 0) {
            const idx = rowIndex(d);
            if (canalF.length > 0 && !canalF.some((f) => matchesCanal(idx.canal, f))) fails |= BIT.canalVenta;
            if (tipoF.length > 0 && !tipoF.some((f) => idx.tipo === f || idx.tipo.includes(f) || f.includes(idx.tipo))) fails |= BIT.tipoSolicitud;
            if (defectosF.length > 0 && !defectosF.some((f) => idx.defectos.has(f))) fails |= BIT.defectos;
            if (responsablesF.length > 0 && !responsablesF.some((f) => idx.responsables.has(f))) fails |= BIT.responsables;
            if (productosF.length > 0 && !productosF.some((f) => idx[f.set].has(f.value))) fails |= BIT.productos;
            if (plantasF.length > 0 && !plantasF.some((f) => idx.plantas.has(f))) fails |= BIT.plantas;
        }

        if (fails === 0) {
            all.push(d);
            for (const k of CROSS_KEYS) except[k].push(d);
        } else if ((fails & (fails - 1)) === 0) {
            // Falla exactamente un filtro: solo entra en la vista que excluye ese filtro
            except[CROSS_KEYS[Math.log2(fails)]].push(d);
        }
    }

    return { all, except };
}
