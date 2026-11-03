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
