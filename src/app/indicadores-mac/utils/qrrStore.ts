// Persistencia de los QRR en Supabase (tabla mac_qrr, ver supabase/create_mac_qrr.sql).
// localStorage queda solo como copia de respaldo y para subir los QRR que existían antes de la tabla.
import { supabase } from '@/lib/supabase';
import type { QRRRecord } from '../types';

const LOCAL_KEY = 'mac_qrr_records';
const MIGRATED_KEY = 'mac_qrr_migrado';

export type QrrSource = 'db' | 'local';

export function readLocalQrr(): QRRRecord[] {
    try {
        const stored = localStorage.getItem(LOCAL_KEY);
        return stored ? (JSON.parse(stored) as QRRRecord[]) : [];
    } catch {
        return [];
    }
}

export function writeLocalQrr(records: QRRRecord[]) {
    try {
        localStorage.setItem(LOCAL_KEY, JSON.stringify(records));
    } catch {
        /* sin almacenamiento local */
    }
}

/**
 * Carga los QRR compartidos. Si la tabla aún no existe, usa los del navegador (source 'local').
 * Si la tabla existe y le faltan QRR que este navegador tenía guardados, los sube (migración única).
 */
export async function loadQrr(): Promise<{ records: QRRRecord[]; source: QrrSource; error?: string }> {
    const local = readLocalQrr();
    const { data, error } = await supabase.from('mac_qrr').select('id, data').order('created_at', { ascending: true });

    if (error) {
        // Tabla inexistente u otro error: seguir funcionando con la copia local
        return { records: local, source: 'local', error: error.message };
    }

    const remote = (data || []).map((row: any) => ({ ...(row.data as QRRRecord), id: row.id as string }));

    // Subida única por navegador: después, una copia local vieja no debe revivir QRR que otro borró.
    let migrated = false;
    try { migrated = localStorage.getItem(MIGRATED_KEY) === '1'; } catch { /* sin almacenamiento local */ }
    if (!migrated) {
        const remoteIds = new Set(remote.map((r) => r.id));
        const pending = local.filter((r) => r && r.id && !remoteIds.has(r.id));
        let ok = true;
        if (pending.length > 0) {
            const { error: upErr } = await supabase
                .from('mac_qrr')
                .upsert(pending.map((r) => ({ id: r.id, data: r })), { onConflict: 'id' });
            if (upErr) ok = false;
            else remote.push(...pending);
        }
        if (ok) {
            try { localStorage.setItem(MIGRATED_KEY, '1'); } catch { /* sin almacenamiento local */ }
        }
    }

    writeLocalQrr(remote);
    return { records: remote, source: 'db' };
}

/** Guarda en Supabase solo lo que cambió entre dos versiones de la lista (altas, cambios y bajas). */
export async function persistQrrChanges(prev: QRRRecord[], next: QRRRecord[]): Promise<void> {
    const prevById = new Map(prev.map((r) => [r.id, r]));
    const nextIds = new Set(next.map((r) => r.id));

    const changed = next.filter((r) => prevById.get(r.id) !== r);
    const removed = prev.filter((r) => !nextIds.has(r.id)).map((r) => r.id);

    if (changed.length > 0) {
        const { error } = await supabase
            .from('mac_qrr')
            .upsert(changed.map((r) => ({ id: r.id, data: r })), { onConflict: 'id' });
        if (error) throw new Error(error.message);
    }
    if (removed.length > 0) {
        const { error } = await supabase.from('mac_qrr').delete().in('id', removed);
        if (error) throw new Error(error.message);
    }
}
