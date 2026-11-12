import { isWeekend, addDays, isValid, startOfDay } from 'date-fns';

function calculateEaster(year: number): Date {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(year, month - 1, day);
}

function nextMonday(date: Date): Date {
    const day = date.getDay();
    if (day === 1) return new Date(date);
    const add = day === 0 ? 1 : 8 - day;
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + add);
}

function getColombianHolidaysForYear(year: number): Date[] {
    const holidays: Date[] = [];
    
    // Fijos
    holidays.push(new Date(year, 0, 1)); // Año Nuevo
    holidays.push(new Date(year, 4, 1)); // Día del Trabajo
    holidays.push(new Date(year, 6, 20)); // Independencia
    holidays.push(new Date(year, 7, 7)); // Batalla de Boyacá
    holidays.push(new Date(year, 11, 8)); // Inmaculada Concepción
    holidays.push(new Date(year, 11, 25)); // Navidad

    // Ley Emiliani (traslado al lunes)
    holidays.push(nextMonday(new Date(year, 0, 6))); // Reyes Magos
    holidays.push(nextMonday(new Date(year, 2, 19))); // San José
    holidays.push(nextMonday(new Date(year, 5, 29))); // San Pedro y San Pablo
    holidays.push(nextMonday(new Date(year, 7, 15))); // Asunción
    holidays.push(nextMonday(new Date(year, 9, 12))); // Día de la Raza
    holidays.push(nextMonday(new Date(year, 10, 1))); // Todos los Santos
    holidays.push(nextMonday(new Date(year, 10, 11))); // Independencia de Cartagena

    // Relativos a Pascua
    const easter = calculateEaster(year);
    holidays.push(new Date(easter.getFullYear(), easter.getMonth(), easter.getDate() - 3)); // Jueves Santo
    holidays.push(new Date(easter.getFullYear(), easter.getMonth(), easter.getDate() - 2)); // Viernes Santo
    holidays.push(nextMonday(new Date(easter.getFullYear(), easter.getMonth(), easter.getDate() + 39))); // Ascensión
    holidays.push(nextMonday(new Date(easter.getFullYear(), easter.getMonth(), easter.getDate() + 60))); // Corpus Christi
    holidays.push(nextMonday(new Date(easter.getFullYear(), easter.getMonth(), easter.getDate() + 68))); // Sagrado Corazón

    return holidays;
}

const holidaysCache: Record<number, Set<number>> = {};

function getHolidaysSetForYear(year: number): Set<number> {
    if (holidaysCache[year]) return holidaysCache[year];
    const h = getColombianHolidaysForYear(year);
    const set = new Set(h.map(d => startOfDay(d).getTime()));
    holidaysCache[year] = set;
    return set;
}

export function isHoliday(date: Date): boolean {
    const year = date.getFullYear();
    const set = getHolidaysSetForYear(year);
    return set.has(startOfDay(date).getTime());
}

export function isBusinessDay(date: Date): boolean {
    return !isWeekend(date) && !isHoliday(date);
}

/**
 * Cuenta los días hábiles colombianos entre dos fechas usando una fórmula
 * matemática O(1) por año calendario, en lugar de iterar día a día.
 * Para rangos de múltiples años, itera una vez por año (no por día).
 */
export function getBusinessDaysDifference(startDate: Date, endDate: Date): number {
    if (!isValid(startDate) || !isValid(endDate)) return 0;

    let start = startOfDay(startDate);
    let end = startOfDay(endDate);

    if (start >= end) return 0;

    /**
     * Cuenta los días hábiles desde el inicio del año hasta `date` (exclusivo).
     * Fórmula: (días_calendario - fines_de_semana - festivos) usando aritmética
     * de semanas completas + días parciales.
     */
    const countBusinessDaysFromYearStart = (date: Date): number => {
        const year = date.getFullYear();
        const dayOfYear = Math.floor((date.getTime() - new Date(year, 0, 1).getTime()) / 86400000);
        
        // Día de la semana del 1 de enero (0=Dom, 1=Lun, ..., 6=Sáb)
        const jan1DayOfWeek = new Date(year, 0, 1).getDay();
        
        // Días totales transcurridos
        const totalDays = dayOfYear;
        
        // Semanas completas + días sobrantes
        const fullWeeks = Math.floor((jan1DayOfWeek + totalDays) / 7);
        const remainder = (jan1DayOfWeek + totalDays) % 7;
        
        // Días de fin de semana: 2 por semana completa + los sobrantes que caigan en fin de semana
        let weekendDays = fullWeeks * 2;
        // Días sobrantes: 0=Dom... 5=Vie, 6=Sáb
        // Si el remainder incluye sábado (6) o domingo (0 si se contó)
        // Tabla: remainder 0→+0, 1→+0, 2→+0, 3→+0, 4→+0, 5→+0, 6→+1
        // Domingo ya fue contado en la semana anterior si jan1 es domingo
        if (remainder >= 6) weekendDays += 1; // sábado sobrante
        
        const workingDays = totalDays - weekendDays;
        
        // Restar festivos colombianos que caigan en días hábiles (dentro del rango)
        const holidaySet = getHolidaysSetForYear(year);
        let holidaysInRange = 0;
        for (const hts of holidaySet) {
            const hDate = new Date(hts);
            if (hDate < date && !isWeekend(hDate)) {
                holidaysInRange++;
            }
        }
        
        return Math.max(0, workingDays - holidaysInRange);
    };

    // Si el rango está dentro del mismo año → O(1) por el tamaño fijo de festivos
    if (start.getFullYear() === end.getFullYear()) {
        return countBusinessDaysFromYearStart(end) - countBusinessDaysFromYearStart(start);
    }

    // Rango de múltiples años: una iteración por año (no por día)
    let total = 0;

    // 1. Días desde `start` hasta fin del año de start
    const endOfStartYear = new Date(start.getFullYear() + 1, 0, 1);
    total += countBusinessDaysFromYearStart(endOfStartYear) - countBusinessDaysFromYearStart(start);

    // 2. Años completos intermedios
    for (let y = start.getFullYear() + 1; y < end.getFullYear(); y++) {
        const yearStart = new Date(y, 0, 1);
        const yearEnd = new Date(y + 1, 0, 1);
        total += countBusinessDaysFromYearStart(yearEnd) - countBusinessDaysFromYearStart(yearStart);
    }

    // 3. Días desde inicio del año de `end` hasta `end`
    total += countBusinessDaysFromYearStart(end);

    return Math.max(0, total);
}

export function addBusinessDays(startDate: Date, days: number): Date {
    if (!isValid(startDate)) return new Date();
    let current = startOfDay(startDate);
    let added = 0;
    
    while (added < days) {
        current = addDays(current, 1);
        if (isBusinessDay(current)) {
            added++;
        }
    }
    
    return current;
}
