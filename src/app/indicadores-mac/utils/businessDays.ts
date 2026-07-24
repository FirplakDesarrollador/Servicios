import { parseISO, isWeekend, addDays, isValid, startOfDay } from 'date-fns';

// Festivos de Colombia 2024 - 2026
const holidaysStr = [
    // 2024
    '2024-01-01', '2024-01-08', '2024-03-25', '2024-03-28', '2024-03-29', '2024-05-01', '2024-05-13', '2024-06-03', '2024-06-10', '2024-07-01', '2024-07-20', '2024-08-07', '2024-08-19', '2024-10-14', '2024-11-04', '2024-11-11', '2024-12-08', '2024-12-25',
    // 2025
    '2025-01-01', '2025-01-06', '2025-03-24', '2025-04-17', '2025-04-18', '2025-05-01', '2025-06-02', '2025-06-23', '2025-06-30', '2025-07-20', '2025-08-07', '2025-08-18', '2025-10-13', '2025-11-03', '2025-11-17', '2025-12-08', '2025-12-25',
    // 2026
    '2026-01-01', '2026-01-12', '2026-03-23', '2026-04-02', '2026-04-03', '2026-05-01', '2026-05-18', '2026-06-08', '2026-06-15', '2026-06-29', '2026-07-20', '2026-08-07', '2026-08-17', '2026-10-12', '2026-11-02', '2026-11-16', '2026-12-08', '2026-12-25',
];

const holidays = new Set(holidaysStr.map(h => startOfDay(parseISO(h)).getTime()));

export function isHoliday(date: Date): boolean {
    return holidays.has(startOfDay(date).getTime());
}

export function isBusinessDay(date: Date): boolean {
    return !isWeekend(date) && !isHoliday(date);
}

export function getBusinessDaysDifference(startDate: Date, endDate: Date): number {
    if (!isValid(startDate) || !isValid(endDate)) return 0;
    
    let start = startOfDay(startDate);
    let end = startOfDay(endDate);
    
    // Si la fecha inicial es igual o mayor a la final, 0 días transcurridos
    if (start >= end) {
        return 0;
    }
    
    let days = 0;
    let current = start;
    
    while (current < end) {
        if (isBusinessDay(current)) {
            days++;
        }
        current = addDays(current, 1);
    }
    
    return days;
}

export function addBusinessDays(startDate: Date, days: number): Date {
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
