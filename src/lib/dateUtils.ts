import { format, addDays, startOfWeek, isSameDay, getDay, isWithinInterval } from 'date-fns'
import { es } from 'date-fns/locale'

export interface Visita {
    id: number
    created_at: string
    tecnico_id: number
    servicio_id: number | null
    estado: boolean
    recurrente: boolean
    dia_recurrente: string[] | null
    nombre: string
    reagendado: boolean
    personal: boolean
    fecha_hora_inicio: string | null
    fecha_hora_fin: string | null
    fecha_hora_inicio_real: string | null
    fecha_hora_fin_real: string | null
    ocurriendo: boolean
    modified_by: number | null
    entrega_parcial: boolean
}

// Obtener los próximos N días desde una fecha
export function getNextDays(startDate: Date, days: number): Date[] {
    const dates: Date[] = []
    for (let i = 0; i < days; i++) {
        dates.push(addDays(startDate, i))
    }
    return dates
}

// Formatear fecha en español
export function formatDateES(date: Date, formatStr: string = 'EEEE, d MMMM yyyy'): string {
    return format(date, formatStr, { locale: es })
}

// Obtener día de la semana (0 = Domingo, 6 = Sábado)
export function getWeekday(date: Date): number {
    return getDay(date)
}

// Obtener nombre del día de la semana
export function getWeekdayName(weekday: number): string {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
    return days[weekday]
}

// Validar si una fecha está dentro de un rango
export function isDateInRange(start: Date, end: Date, target: Date): boolean {
    return isWithinInterval(target, { start, end })
}

// Parse a database timestamp string (without timezone, e.g. "2026-05-22 08:30:00")
// into a Date object representing the exact local time values in the current environment's local timezone.
export function parseLocalTimestamp(dateStr: string | null): Date | null {
    if (!dateStr) return null;
    const cleaned = dateStr.replace(' ', 'T').replace('Z', '');
    const parts = cleaned.split('T');
    const dateParts = parts[0].split('-').map(Number);
    const timeParts = parts[1] ? parts[1].split(':').map(Number) : [0, 0, 0];
    
    return new Date(
        dateParts[0],
        dateParts[1] - 1,
        dateParts[2],
        timeParts[0] || 0,
        timeParts[1] || 0,
        timeParts[2] || 0
    );
}

// Convert a database timestamp string to a datetime-local input string (YYYY-MM-DDTHH:mm)
export function formatToLocalInput(dateStr: string | null): string {
    if (!dateStr) return '';
    const cleaned = dateStr.replace(' ', 'T');
    return cleaned.slice(0, 16);
}

// Convert a datetime-local input string to a database timestamp string (YYYY-MM-DD HH:mm:ss)
export function formatFromLocalInput(localStr: string | null): string | null {
    if (!localStr) return null;
    const cleaned = localStr.replace('T', ' ');
    if (cleaned.length === 16) {
        return cleaned + ':00';
    }
    return cleaned;
}

// Filtrar visitas por fecha
export function filterVisitasByDate(visitas: Visita[], targetDate: Date): Visita[] {
    return visitas.filter(visita => {
        if (!visita.fecha_hora_inicio) return false

        const visitaStart = parseLocalTimestamp(visita.fecha_hora_inicio)
        const visitaEnd = visita.fecha_hora_fin ? parseLocalTimestamp(visita.fecha_hora_fin) : visitaStart

        if (!visitaStart || !visitaEnd) return false

        // Si no es recurrente, comparar fecha exacta
        if (!visita.recurrente) {
            return isSameDay(visitaStart, targetDate)
        }

        // Si es recurrente, verificar día de la semana y rango
        if (visita.recurrente && visita.dia_recurrente) {
            const targetWeekday = getWeekday(targetDate)
            const hasMatchingWeekday = visita.dia_recurrente.includes(targetWeekday.toString())
            const isInRange = isDateInRange(visitaStart, visitaEnd, targetDate)
            return hasMatchingWeekday && isInRange
        }

        return false
    })
}

// Contar visitas por fecha
export function countVisitasByDate(visitas: Visita[], targetDate: Date): number {
    return filterVisitasByDate(visitas, targetDate).length
}

// Formatear hora
export function formatTime(dateString: string): string {
    const date = parseLocalTimestamp(dateString)
    if (!date) return 'N/A'
    return format(date, 'HH:mm')
}

// Obtener inicio de semana
export function getStartOfWeek(date: Date): Date {
    return startOfWeek(date, { weekStartsOn: 1 }) // Lunes como inicio de semana
}

