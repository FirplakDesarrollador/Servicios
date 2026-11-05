const inicioDelDia = (fecha: Date) => new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()).getTime();
const UN_DIA = 24 * 60 * 60 * 1000;

/**
 * Fecha del último mensaje en la lista de chats, como en WhatsApp:
 * hoy la hora, luego "Ayer", el nombre del día durante la última semana y después la fecha.
 */
export function fechaChat(iso: string | null | undefined, ahora: Date = new Date()): string {
  if (!iso) return '';
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return '';

  const dias = Math.round((inicioDelDia(ahora) - inicioDelDia(fecha)) / UN_DIA);
  if (dias <= 0) return fecha.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (dias === 1) return 'Ayer';
  if (dias < 7) return fecha.toLocaleDateString('es-CO', { weekday: 'long' });
  return fecha.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
