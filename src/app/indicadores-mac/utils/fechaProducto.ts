// Fecha de compra / fabricación de un radicado y su clasificación (antigüedad y mes), compartida por la
// gráfica de General y el motor de filtros cruzados para que ambos clasifiquen exactamente igual.
import type { RegistroMAC } from '../types';

export type CampoFecha = 'fecha_compra' | 'fecha_fabricacion';

export const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export const TRAMOS_ANTIGUEDAD: Array<{ label: string; hasta: number }> = [
    { label: '0 a 3 meses', hasta: 3 },
    { label: '3 a 6 meses', hasta: 6 },
    { label: '6 a 12 meses', hasta: 12 },
    { label: '1 a 2 años', hasta: 24 },
    { label: 'Más de 2 años', hasta: Infinity },
];

/** Interpreta YYYY-MM-DD, DD/MM/YYYY, YYYY/MM/DD u otros formatos que entienda Date. */
export function parseFecha(raw: unknown): Date | null {
    if (!raw || typeof raw !== 'string' || !raw.trim()) return null;
    const s = raw.trim();
    let d: Date | null = null;
    if (s.includes('-')) {
        const [y, m, dd] = s.split('T')[0].split('-').map((p) => parseInt(p, 10));
        if (!isNaN(y) && !isNaN(m)) d = new Date(y, m - 1, dd || 1);
    } else if (s.includes('/')) {
        const parts = s.split('/');
        if (parts.length === 3) {
            d = parts[0].length === 4
                ? new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10))
                : new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
        }
    }
    if (!d || isNaN(d.getTime())) d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
}

/** Fecha del radicado; si no está en el registro, la del primer producto (compra o novedad) que la tenga. */
export function fechaDelRegistro(d: RegistroMAC, campo: CampoFecha): Date | null {
    const directa = parseFecha((d as any)[campo]);
    if (directa) return directa;
    const enCompra = Array.isArray(d.productos_compra) ? d.productos_compra.find((p: any) => p?.[campo]) : null;
    if (enCompra) return parseFecha(enCompra[campo]);
    const enNovedad = Array.isArray(d.productos_novedad) ? d.productos_novedad.find((p: any) => p?.[campo]) : null;
    return enNovedad ? parseFecha(enNovedad[campo]) : null;
}

export const mesesEntre = (desde: Date, hasta: Date) =>
    (hasta.getFullYear() - desde.getFullYear()) * 12 + (hasta.getMonth() - desde.getMonth()) + (hasta.getDate() - desde.getDate()) / 31;

export const claveMesNum = (dt: Date) => dt.getFullYear() * 12 + dt.getMonth();
export const claveMesTexto = (num: number) => `${Math.floor(num / 12)}-${String((num % 12) + 1).padStart(2, '0')}`;
const numDeClaveTexto = (k: string) => {
    const [y, m] = k.split('-').map(Number);
    return y * 12 + (m - 1);
};

export interface ClasificacionFecha {
    /** null si no hay fecha */
    mesNum: number | null;
    /** Tramo de antigüedad; null si no hay fecha o es posterior a la solicitud */
    tramo: string | null;
    edadMeses: number | null;
}

export function clasificarFecha(d: RegistroMAC, campo: CampoFecha): ClasificacionFecha {
    const fecha = fechaDelRegistro(d, campo);
    if (!fecha) return { mesNum: null, tramo: null, edadMeses: null };
    const creado = new Date(d.created_at);
    let edad: number | null = null;
    if (!isNaN(creado.getTime())) {
        const e = mesesEntre(fecha, creado);
        edad = e >= -1 ? Math.max(0, e) : null;
    }
    const tramo = edad === null ? null : TRAMOS_ANTIGUEDAD.find((t) => edad! < t.hasta)!.label;
    return { mesNum: claveMesNum(fecha), tramo, edadMeses: edad };
}

// ── Valores de filtro ──────────────────────────────────────────────────────────
//   'T:<tramo>'   antigüedad      'M:YYYY-MM'  mes exacto
//   'A:YYYY-MM'   meses anteriores a ese mes ("Anteriores")      'SIN'  sin fecha
export const valorTramo = (tramo: string) => `T:${tramo}`;
export const valorMes = (mesNum: number) => `M:${claveMesTexto(mesNum)}`;
export const valorAnteriores = (primerMesVisible: number) => `A:${claveMesTexto(primerMesVisible)}`;
export const VALOR_SIN_FECHA = 'SIN';

export function cumpleValorFecha(c: ClasificacionFecha, valor: string): boolean {
    if (valor === VALOR_SIN_FECHA) return c.mesNum === null;
    if (valor.startsWith('T:')) return c.tramo === valor.slice(2);
    if (c.mesNum === null) return false;
    if (valor.startsWith('M:')) return c.mesNum === numDeClaveTexto(valor.slice(2));
    if (valor.startsWith('A:')) return c.mesNum < numDeClaveTexto(valor.slice(2));
    return false;
}

/** Texto legible de un valor de filtro, para las etiquetas de filtros activos. */
export function etiquetaValorFecha(valor: string): string {
    if (valor === VALOR_SIN_FECHA) return 'Sin fecha';
    if (valor.startsWith('T:')) return valor.slice(2);
    const [y, m] = valor.slice(2).split('-').map(Number);
    const mes = `${MESES_CORTOS[m - 1]} ${y}`;
    return valor.startsWith('A:') ? `Antes de ${mes}` : mes;
}
