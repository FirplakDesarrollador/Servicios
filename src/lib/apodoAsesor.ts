// Una persona, un nombre: en WhatsApp cada asesor se identifica por su apodo.
const APODOS: [RegExp, string][] = [
  [/^xime/i, 'Xime'],
  [/^tati/i, 'Tati'],
  [/^(andrey|andrew|adrew)\b/i, 'Andrey'],
];

/** Convierte cualquier variante del nombre de un asesor en su apodo; los demás nombres quedan igual. */
export function apodoAsesor(nombre: string): string;
export function apodoAsesor(nombre: string | null | undefined): string | null;
export function apodoAsesor(nombre: string | null | undefined): string | null {
  const limpio = nombre?.trim();
  if (!limpio) return null;
  return APODOS.find(([patron]) => patron.test(limpio))?.[1] ?? limpio;
}
