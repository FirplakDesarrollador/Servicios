// Cómo se cuentan los problemas en todos los indicadores (regla de negocio):
//
// Un mismo defecto cuenta una vez por cada producto comprado que lo presenta, no por cada pieza.
// Defectos distintos siempre cuentan aparte, aunque sean del mismo producto.
//   · 1 mueble con 3 piezas despicadas ............................ 1 despique
//   · lavadero y lavamanos comprados, ambos con avería ............ 2 averías
//   · 1 hidromasaje con fuga y pulsador que no enciende ........... 2 defectos
//   · 2 muebles comprados con 2 piezas repetidas .................. 2 piezas repetidas
//   · 1 mueble con despique, faltante de kit y pieza repetida ..... 3 defectos
//
// Responsables, plantas y grupos suman esos mismos problemas: los 3 defectos del último caso le cuentan
// 3 a su responsable, a su planta y a su grupo. El total de radicados no cambia: sigue siendo un radicado.
//
// El radicado no liga cada pieza a su producto de compra, así que para cada defecto se toma el menor
// entre los productos con ese defecto y los productos comprados. Se cuentan productos distintos, no
// unidades: una compra de 240 unidades con un defecto es un problema, no 240.
import type { RegistroMAC } from '../types';
import { EN_BLANCO, normalizeGrupo, normalizePlantaName } from './filterEngine';

export interface ProblemaProducto {
    defecto: string;
    responsable: string;
}

export interface LineaProblema extends ProblemaProducto {
    r: RegistroMAC;
    /** Posición del producto con novedad dentro del radicado */
    indiceProducto: number;
    /** Un producto con varios defectos genera varias líneas; solo la primera aporta sus unidades a los totales */
    primera: boolean;
    planta: string;
    grupo: string;
    unidades: number;
    producto: string;
    /** Producto comprado, solo cuando el radicado tiene uno; con varios no se puede saber de cuál salió la pieza */
    compra: string;
    /** Parte de la inversión del radicado que le corresponde a esta línea */
    inversion: number;
}

export const nombreDeProducto = (p: any): string =>
    p?.descripcion || p?.nombre || p?.producto_descripcion || p?.sku || p?.referencia || p?.codigo || 'Sin nombre';

export const inversionDeRegistro = (r: RegistroMAC): number =>
    ((r as any).valor_servicio || 0) + ((r as any).valor_flete || 0) + ((r as any).valor_producto || 0);

export const productosComprados = (r: RegistroMAC): number => (Array.isArray(r.productos_compra) ? r.productos_compra.length : 0);

/** Defectos del producto con novedad, con nombres ya resueltos al cargar los datos. */
export function problemasDeProducto(p: any): ProblemaProducto[] {
    if (Array.isArray(p?._problemas) && p._problemas.length > 0) return p._problemas;
    return [{ defecto: p?.defecto || EN_BLANCO, responsable: p?.responsable || EN_BLANCO }];
}

const cacheLineas = new WeakMap<object, LineaProblema[]>();

/** Una línea por cada defecto de cada producto con novedad. Sin productos: una línea En Blanco. */
export function lineasDeProblema(r: RegistroMAC): LineaProblema[] {
    const enCache = cacheLineas.get(r);
    if (enCache) return enCache;

    const inversion = inversionDeRegistro(r);
    const novedad: any[] = Array.isArray(r.productos_novedad) ? r.productos_novedad : [];
    const compras: any[] = Array.isArray(r.productos_compra) ? r.productos_compra : [];
    const compra = compras.length === 1 ? nombreDeProducto(compras[0]) : compras.length > 1 ? 'Varios productos de compra' : 'Sin producto de compra';
    const lineas: LineaProblema[] = [];

    if (novedad.length === 0) {
        lineas.push({
            r, indiceProducto: 0, primera: true, defecto: EN_BLANCO, responsable: EN_BLANCO, planta: EN_BLANCO, grupo: EN_BLANCO,
            unidades: 1, producto: 'Sin producto con novedad', compra, inversion,
        });
    }
    novedad.forEach((p, indiceProducto) => {
        const problemas = problemasDeProducto(p);
        problemas.forEach((problema, i) => {
            lineas.push({
                r, indiceProducto, primera: i === 0, ...problema,
                planta: normalizePlantaName(p?.planta || ''),
                grupo: normalizeGrupo(p?.familia || ''),
                unidades: Number(p?.cantidad) || 1,
                producto: nombreDeProducto(p),
                compra,
                inversion: inversion / novedad.length / problemas.length,
            });
        });
    });

    cacheLineas.set(r, lineas);
    return lineas;
}

export interface Resumen {
    /** Problemas según la regla de negocio */
    problemas: number;
    unidades: number;
    inversion: number;
    radicados: Set<number>;
}

/**
 * Agrupa por la clave pedida (defecto, responsable, planta, grupo, cliente...) aplicando la regla de conteo.
 * `filtro` deja por fuera las líneas que no aplican, por ejemplo las de otra planta.
 */
export function resumirPor(
    data: RegistroMAC[],
    claveDe: (l: LineaProblema) => string,
    filtro?: (l: LineaProblema) => boolean,
): Map<string, Resumen> {
    const salida = new Map<string, Resumen>();
    for (const r of data) {
        const comprados = productosComprados(r);
        const productosPorDefecto = new Map<string, number>();
        const unidadesContadas = new Set<string>();
        for (const l of lineasDeProblema(r)) {
            if (filtro && !filtro(l)) continue;
            const clave = claveDe(l);
            let resumen = salida.get(clave);
            if (!resumen) {
                resumen = { problemas: 0, unidades: 0, inversion: 0, radicados: new Set() };
                salida.set(clave, resumen);
            }
            resumen.radicados.add(r.id);
            resumen.inversion += l.inversion;
            const idProducto = `${clave}\u0000${l.indiceProducto}`;
            if (!unidadesContadas.has(idProducto)) {
                unidadesContadas.add(idProducto);
                resumen.unidades += l.unidades;
            }
            const idDefecto = `${clave}\u0000${l.defecto}`;
            productosPorDefecto.set(idDefecto, (productosPorDefecto.get(idDefecto) || 0) + 1);
        }
        productosPorDefecto.forEach((productos, idDefecto) => {
            const clave = idDefecto.slice(0, idDefecto.indexOf('\u0000'));
            salida.get(clave)!.problemas += comprados > 0 ? Math.min(productos, comprados) : productos;
        });
    }
    return salida;
}

/** Total de problemas de un conjunto de radicados. */
export function totalProblemas(data: RegistroMAC[], filtro?: (l: LineaProblema) => boolean): number {
    return resumirPor(data, () => 'total', filtro).get('total')?.problemas || 0;
}

// ── Para las tablas que van sumando producto por producto respetando sus filtros cruzados ─────────
export interface ConteoIncremental {
    /** id de radicado + defecto → productos con ese defecto */
    productos: Map<string, { productos: number; comprados: number }>;
    /** Radicados sin productos con novedad */
    sinProductos: Set<number>;
    productosAfectados: number;
}

export const nuevoConteo = (): ConteoIncremental => ({ productos: new Map(), sinProductos: new Set(), productosAfectados: 0 });

export function sumarProblema(conteo: ConteoIncremental, r: RegistroMAC, defecto: string) {
    const id = `${r.id}\u0000${defecto}`;
    const actual = conteo.productos.get(id);
    if (actual) actual.productos += 1;
    else conteo.productos.set(id, { productos: 1, comprados: productosComprados(r) });
}

export const totalConteo = (conteo: ConteoIncremental): number => {
    let total = conteo.sinProductos.size;
    conteo.productos.forEach(({ productos, comprados }) => {
        total += comprados > 0 ? Math.min(productos, comprados) : productos;
    });
    return total;
};
