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

export function getBusinessDaysDifference(startDate: Date, endDate: Date): number {
    if (!isValid(startDate) || !isValid(endDate)) return 0;
    
    let start = startOfDay(startDate);
    let end = startOfDay(endDate);
    
    if (start >= end) return 0;
    
    let days = 0;
    let current = start;
    
    while (current < end) {
        if (isBusinessDay(current)) days++;
        current = addDays(current, 1);
    }
    
    return days;
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
