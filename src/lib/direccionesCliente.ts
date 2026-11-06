// Direcciones de un cliente final (tabla clientes_direcciones, ver supabase/create_clientes_direcciones.sql).
// Un cliente puede tener varias casas; la principal se replica en "Consumidores".
// Servicios y radicados guardan la dirección escogida en direccion_cliente_id
// (NULL en los registros anteriores = dirección del cliente, como siempre).
import { supabase } from '@/lib/supabase';

export interface DireccionCliente {
    id: number;
    consumidor_id: number;
    alias: string | null;
    direccion: string | null;
    descripcion_direccion: string | null;
    ciudad_id: number | null;
    principal: boolean;
    activa: boolean;
    ciudad?: string | null;
    departamento?: string | null;
    pais?: string | null;
    zona?: string | null;
    zona_id?: number | null;
    coordinador_id?: number | null;
}

// La tabla, la vista o la columna todavía no existen (SQL sin ejecutar)
export const esFaltaDeEsquema = (error: { code?: string; message?: string } | null | undefined): boolean => {
    if (!error) return false;
    const code = error.code || '';
    return code === '42P01' || code === 'PGRST205' || code === '42703' || code === 'PGRST204'
        || /does not exist|could not find/i.test(error.message || '');
};

/** Direcciones del cliente, la principal primero. `null` si la tabla aún no existe. */
export async function cargarDireccionesCliente(consumidorId: number | string, incluirInactivas = false): Promise<DireccionCliente[] | null> {
    let query = supabase
        .from('query_clientes_direcciones')
        .select('*')
        .eq('consumidor_id', consumidorId)
        .order('principal', { ascending: false })
        .order('id', { ascending: true });
    if (!incluirInactivas) query = query.eq('activa', true);
    const { data, error } = await query;
    if (error) {
        if (!esFaltaDeEsquema(error)) console.error('Error cargando direcciones del cliente:', error);
        return null;
    }
    return (data || []) as DireccionCliente[];
}

export async function cargarDireccionPorId(id: number | string | null | undefined): Promise<DireccionCliente | null> {
    if (id === null || id === undefined || id === '') return null;
    const { data, error } = await supabase
        .from('query_clientes_direcciones')
        .select('*')
        .eq('id', id)
        .maybeSingle();
    if (error) {
        if (!esFaltaDeEsquema(error)) console.error('Error cargando la dirección:', error);
        return null;
    }
    return (data as DireccionCliente) || null;
}

/** Texto corto para mostrar: "CASA CAMPESTRE · CRA 1 # 2-3 · RIONEGRO" */
export const textoDireccion = (d: Pick<DireccionCliente, 'alias' | 'direccion' | 'ciudad'>): string =>
    [d.alias, d.direccion, d.ciudad].filter((v): v is string => !!v && v.trim() !== '').join(' · ');

/**
 * Pone la dirección escogida en los campos consumidor_* de una fila de query_servicios
 * (la vista solo trae la dirección principal del cliente).
 */
export function aplicarDireccionAServicio<T extends Record<string, any>>(servicio: T, dir: DireccionCliente | null | undefined): T {
    if (!dir) return servicio;
    return {
        ...servicio,
        consumidor_direccion: dir.direccion,
        consumidor_descripcion_direccion: dir.descripcion_direccion,
        consumidor_ciudad: dir.ciudad ?? servicio.consumidor_ciudad,
        consumidor_departamento: dir.departamento ?? servicio.consumidor_departamento,
        consumidor_zona: dir.zona ?? servicio.consumidor_zona,
        consumidor_pais: dir.pais ?? servicio.consumidor_pais,
        direccion_cliente_id: dir.id,
        direccion_cliente_alias: dir.alias,
    };
}

/**
 * Para filas de query_servicios: busca qué servicios tienen una dirección escogida
 * (Servicios.direccion_cliente_id) y la aplica. Si el SQL no se ha ejecutado, devuelve las filas igual.
 */
export async function aplicarDireccionesAServicios<T extends Record<string, any>>(servicios: T[]): Promise<T[]> {
    const ids = servicios.filter(s => s && s.consumidor_id && s.id).map(s => s.id);
    if (ids.length === 0) return servicios;

    const porServicio = new Map<string, number>();
    const TAMANO = 200;
    for (let i = 0; i < ids.length; i += TAMANO) {
        const { data, error } = await supabase
            .from('Servicios')
            .select('id, direccion_cliente_id')
            .in('id', ids.slice(i, i + TAMANO))
            .not('direccion_cliente_id', 'is', null);
        if (error) {
            if (!esFaltaDeEsquema(error)) console.error('Error leyendo direcciones de servicios:', error);
            return servicios;
        }
        (data || []).forEach((r: { id: number; direccion_cliente_id: number | null }) => {
            if (r.direccion_cliente_id) porServicio.set(String(r.id), r.direccion_cliente_id);
        });
    }
    if (porServicio.size === 0) return servicios;

    const dirIds = Array.from(new Set(porServicio.values()));
    const direcciones = new Map<number, DireccionCliente>();
    for (let i = 0; i < dirIds.length; i += TAMANO) {
        const { data, error } = await supabase
            .from('query_clientes_direcciones')
            .select('*')
            .in('id', dirIds.slice(i, i + TAMANO));
        if (error) {
            if (!esFaltaDeEsquema(error)) console.error('Error leyendo direcciones:', error);
            return servicios;
        }
        (data || []).forEach((d: DireccionCliente) => direcciones.set(d.id, d));
    }

    return servicios.map(s => {
        const dirId = porServicio.get(String(s.id));
        return dirId ? aplicarDireccionAServicio(s, direcciones.get(dirId)) : s;
    });
}

/** Guarda la dirección escogida en un servicio ya creado. No falla si la columna aún no existe. */
export async function guardarDireccionEnServicio(filtro: { id?: number | string | null; consecutivo?: string | null }, direccionId: number | null | undefined): Promise<void> {
    if (!direccionId) return;
    let query = supabase.from('Servicios').update({ direccion_cliente_id: direccionId });
    if (filtro.id) query = query.eq('id', filtro.id);
    else if (filtro.consecutivo) query = query.eq('consecutivo', filtro.consecutivo);
    else return;
    const { error } = await query;
    if (error && !esFaltaDeEsquema(error)) console.error('Error guardando la dirección del servicio:', error);
}
