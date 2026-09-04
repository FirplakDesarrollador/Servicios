import { supabase } from '@/lib/supabase';

const DEFAULT_ASESORES = ['Xime', 'Tati', 'Andrew'];

/**
 * Calculates the next asesor to be assigned using a strict, sequential Round-Robin algorithm.
 * Uses a persistent counter (`whatsapp_assignment_state`) to guarantee strict 1-by-1 order:
 * Asesor 1 -> Asesor 2 -> Asesor 3 -> Asesor 1 -> Asesor 2...
 */
export async function getNextAssignedAsesor(): Promise<string> {
  try {
    // 1. Fetch active asesores ordered by creation time / name
    let asesorNames: string[] = [];
    const { data: asesores } = await supabase
      .from('whatsapp_asesores')
      .select('nombre')
      .eq('activo', true)
      .order('created_at', { ascending: true });

    if (asesores && asesores.length > 0) {
      asesorNames = asesores.map(a => a.nombre.trim()).filter(Boolean);
    }

    if (asesorNames.length === 0) {
      asesorNames = DEFAULT_ASESORES;
    }

    // 2. Fetch current Round-Robin index pointer from whatsapp_assignment_state
    const { data: stateRows } = await supabase
      .from('whatsapp_assignment_state')
      .select('last_index')
      .eq('id', 1)
      .single();

    let lastIndex = stateRows?.last_index ?? -1;

    // 3. Compute next index in strict sequential order
    const nextIndex = (lastIndex + 1) % asesorNames.length;
    const selectedAsesor = asesorNames[nextIndex];

    // 4. Update the state pointer in database for the next assignment
    await supabase
      .from('whatsapp_assignment_state')
      .upsert({ id: 1, last_index: nextIndex, updated_at: new Date().toISOString() });

    console.log(`[StrictRoundRobin] Last Index: ${lastIndex} -> Next Index: ${nextIndex} -> Assigned: "${selectedAsesor}"`);
    return selectedAsesor;
  } catch (error) {
    console.error('[StrictRoundRobin] Exception:', error);
    return DEFAULT_ASESORES[0];
  }
}
