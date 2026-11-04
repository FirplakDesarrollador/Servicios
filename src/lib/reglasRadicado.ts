// Reglas de negocio para cerrar un radicado (Mesa de Atención al Cliente).

// Se cuentan productos distintos (líneas), no unidades: un cliente puede comprar 240 unidades de un
// producto y reportar novedad en una sola; ese radicado es válido.
const totalProductos = (productos: unknown): number => (Array.isArray(productos) ? productos.length : 0);

/**
 * Un radicado no se puede cerrar sin producto de compra, ni con menos productos con novedad que
 * productos comprados (cada producto comprado debe tener al menos un producto con novedad; una
 * compra puede tener varias piezas afectadas). Devuelve los incumplimientos, vacío si cumple.
 */
export function incumplimientosProductos(productosCompra: unknown, productosNovedad: unknown): string[] {
    const compra = totalProductos(productosCompra);
    const novedad = totalProductos(productosNovedad);
    if (compra === 0) return ['Producto de compra (todo radicado debe tener al menos uno)'];
    if (novedad < compra) {
        return [`Productos con novedad: hay ${compra} de compra y solo ${novedad} con novedad. Deben ser igual o más que los comprados`];
    }
    return [];
}

// ── Categorización: la Planta y la Familia las define cada agente ──────────────────────────────────
// El catálogo de productos trae planta (en mayúsculas: MARMOL, FIBRA, MUEBLES). Ese dato no es una
// categorización: un producto con novedad nace vacío hasta que el agente lo clasifique y guarde.
const PLANTAS_DEL_CLASIFICADOR = ['Marmol', 'Muebles', 'Fibra', 'Comercializado', 'Servicios', 'RTM', 'Quarztone'];

/** Producto con novedad recién agregado: sin planta ni familia, a la espera del agente. */
export function sinCategorizar<T extends Record<string, any>>(producto: T): Omit<T, 'planta' | 'familia'> {
    const { planta: _planta, familia: _familia, ...resto } = producto;
    return resto;
}

/**
 * Radicados ya creados: si nunca se clasificó (no tiene familia) y su planta no es una opción del
 * clasificador, esa planta vino del catálogo y se trata como vacía.
 */
export function sinPlantaDeCatalogo<T extends Record<string, any>>(producto: T): T {
    if (!producto?.familia && producto?.planta && !PLANTAS_DEL_CLASIFICADOR.includes(producto.planta)) {
        return { ...producto, planta: '' };
    }
    return producto;
}
