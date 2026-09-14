/**
 * Motor de análisis para el módulo Indicadores MAC.
 * Funciones puras que comparan períodos y calculan prioridades.
 * No contiene estado React — se invoca desde AnalisisMac.tsx.
 */
import {
    RegistroMAC, DateRange, PriorityLevel,
    DefectAnalysis, ResponsableAnalysis, ReferenceAnalysis,
    GeoAnalysis, ClientAnalysis, EconomicAnalysis,
    Recommendation, AllAnalyses,
} from '../types';

// ── Constantes del motor de priorización ────────────────────────────────────
const WEIGHTS = {
    growth: 0.15,
    volume: 0.20,
    units: 0.15,
    economic: 0.20,
    recurrence: 0.10,
    concentration: 0.10,
    trend: 0.10,
};

const PRIORITY_THRESHOLDS = {
    inmediato: 70,
    seguimiento: 45,
    vigilar: 20,
};

const MONTH_NAMES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Determina el último mes completo (vencido) y el anterior a éste. */
export function getDefaultPeriods(now: Date = new Date()): { current: DateRange; previous: DateRange } {
    // Último mes vencido
    const currMonth = now.getMonth(); // 0-indexed
    const currYear = now.getFullYear();

    let lastMonth = currMonth - 1;
    let lastYear = currYear;
    if (lastMonth < 0) { lastMonth = 11; lastYear -= 1; }

    let prevMonth = lastMonth - 1;
    let prevYear = lastYear;
    if (prevMonth < 0) { prevMonth = 11; prevYear -= 1; }

    const current = buildMonthRange(lastYear, lastMonth);
    const previous = buildMonthRange(prevYear, prevMonth);

    return { current, previous };
}

function buildMonthRange(year: number, month: number): DateRange {
    const start = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month + 1, 0).getDate();
    const end = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    return { start, end, label: `${MONTH_NAMES[month]} ${year}`, key: `${year}-${String(month + 1).padStart(2, '0')}` };
}

export function buildMonthRangeFromKey(key: string): DateRange {
    const [y, m] = key.split('-').map(Number);
    return buildMonthRange(y, m - 1);
}

/** Filtra registros cuya created_at caiga dentro del rango (inclusive). */
export function filterByPeriod(data: RegistroMAC[], period: DateRange): RegistroMAC[] {
    const startTs = new Date(period.start + 'T00:00:00').getTime();
    const endTs = new Date(period.end + 'T23:59:59').getTime();
    return data.filter(d => {
        const ts = (d as any)._createdAtTs as number;
        return ts >= startTs && ts <= endTs;
    });
}

/** Variación porcentual segura: devuelve null cuando el anterior = 0. */
export function calculateVariation(current: number, previous: number): number | null {
    if (previous === 0) return current > 0 ? null : 0; // null = "Nuevo"
    return ((current - previous) / previous) * 100;
}

/** Formato de variación para display. */
export function formatVariation(v: number | null): string {
    if (v === null) return 'Nuevo';
    if (v === 0) return '0%';
    return `${v > 0 ? '+' : ''}${v.toFixed(1)}%`;
}

/** Extrae el total de unidades (productos_novedad) de un set de registros. */
export function getTotalUnits(records: RegistroMAC[]): number {
    return records.reduce((acc, r) => {
        if (!Array.isArray(r.productos_novedad)) return acc;
        return acc + r.productos_novedad.reduce((s: number, p: any) => s + (p.cantidad || 1), 0);
    }, 0);
}

/** Extrae el total de $$ invertido. */
export function getTotalValue(records: RegistroMAC[]): number {
    return records.reduce((acc, r) => acc + (r._valorInvertido || 0), 0);
}

/** Obtiene todos los meses disponibles en el dataset ordenados. */
export function getAvailableMonths(data: RegistroMAC[]): DateRange[] {
    const months = new Set<string>();
    data.forEach(d => {
        const key = d._mesCreacionKey;
        if (key) months.add(key);
    });
    return Array.from(months)
        .sort()
        .map(k => buildMonthRangeFromKey(k));
}

// ── Helpers internos de agregación ──────────────────────────────────────────

interface AggBucket {
    recordsSet: Set<number>;
    units: number;
    value: number;
    defectsMap: Map<string, number>;
    responsablesMap: Map<string, number>;
    referenciasMap: Map<string, number>;
    clientesMap: Map<string, number>;
    zonasMap: Map<string, number>;
    ciudadesMap: Map<string, number>;
    recordIds: number[];
}

function emptyBucket(): AggBucket {
    return {
        recordsSet: new Set(), units: 0, value: 0,
        defectsMap: new Map(), responsablesMap: new Map(),
        referenciasMap: new Map(), clientesMap: new Map(),
        zonasMap: new Map(), ciudadesMap: new Map(),
        recordIds: [],
    };
}

function topFromMap(m: Map<string, number>): string {
    let top = 'Sin información registrada';
    let max = 0;
    m.forEach((v, k) => { if (v > max) { max = v; top = k; } });
    return top;
}

function addToBucket(bucket: AggBucket, r: RegistroMAC) {
    bucket.recordsSet.add(r.id);
    bucket.recordIds.push(r.id);
    bucket.value += (r._valorInvertido || 0);

    if (Array.isArray(r.productos_novedad)) {
        r.productos_novedad.forEach((p: any) => {
            bucket.units += (p.cantidad || 1);
            const ref = p.descripcion || p.nombre || p.sku || p.referencia || '';
            if (ref) bucket.referenciasMap.set(ref, (bucket.referenciasMap.get(ref) || 0) + 1);
        });
    }

    const cliente = r._clientePrincipalFinal || '';
    if (cliente) bucket.clientesMap.set(cliente, (bucket.clientesMap.get(cliente) || 0) + 1);
    const zona = r._zona || '';
    if (zona && zona !== 'No definida') bucket.zonasMap.set(zona, (bucket.zonasMap.get(zona) || 0) + 1);
    const ciudad = r._ciudad || '';
    if (ciudad && ciudad !== 'No definida') bucket.ciudadesMap.set(ciudad, (bucket.ciudadesMap.get(ciudad) || 0) + 1);

    (r._defectosNombres || []).forEach(d => bucket.defectsMap.set(d, (bucket.defectsMap.get(d) || 0) + 1));
    (r._responsablesNombres || []).forEach(re => bucket.responsablesMap.set(re, (bucket.responsablesMap.get(re) || 0) + 1));
}

// ── Motor de priorización multicriterio ─────────────────────────────────────

function normalizeScore(value: number, max: number): number {
    if (max <= 0) return 0;
    return Math.min(value / max, 1) * 100;
}

export function calculatePriorityScore(
    growthPct: number | null,
    volumeCurr: number,
    maxVolume: number,
    unitsCurr: number,
    maxUnits: number,
    valueCurr: number,
    maxValue: number,
    recurrenceMonths: number,
    maxRecurrence: number,
    concentrationScore: number, // 0-100
    trendScore: number,        // 0-100
): { score: number; level: PriorityLevel } {
    // Growth: cap at 200% for normalization, handle "Nuevo"
    const growthNorm = growthPct === null
        ? 50 // "Nuevo" gets medium growth score
        : normalizeScore(Math.min(Math.abs(growthPct), 200), 200) * (growthPct >= 0 ? 1 : 0);

    const volumeNorm = normalizeScore(volumeCurr, maxVolume);
    const unitsNorm = normalizeScore(unitsCurr, maxUnits);
    const economicNorm = normalizeScore(valueCurr, maxValue);
    const recurrenceNorm = normalizeScore(recurrenceMonths, maxRecurrence || 1);
    const concentrationNorm = Math.min(concentrationScore, 100);
    const trendNorm = Math.min(trendScore, 100);

    const score =
        growthNorm * WEIGHTS.growth +
        volumeNorm * WEIGHTS.volume +
        unitsNorm * WEIGHTS.units +
        economicNorm * WEIGHTS.economic +
        recurrenceNorm * WEIGHTS.recurrence +
        concentrationNorm * WEIGHTS.concentration +
        trendNorm * WEIGHTS.trend;

    let level: PriorityLevel = 'estable';
    if (score >= PRIORITY_THRESHOLDS.inmediato) level = 'inmediato';
    else if (score >= PRIORITY_THRESHOLDS.seguimiento) level = 'seguimiento';
    else if (score >= PRIORITY_THRESHOLDS.vigilar) level = 'vigilar';

    return { score: Math.round(score), level };
}

// ── Funciones de análisis ───────────────────────────────────────────────────

/** Agrupa registros por defecto y calcula métricas para curr vs prev */
function aggregateByKey(
    records: RegistroMAC[],
    keyExtractor: (r: RegistroMAC) => string[],
): Map<string, AggBucket> {
    const map = new Map<string, AggBucket>();
    records.forEach(r => {
        const keys = keyExtractor(r);
        if (keys.length === 0) keys.push('Sin información registrada');
        keys.forEach(k => {
            if (!map.has(k)) map.set(k, emptyBucket());
            addToBucket(map.get(k)!, r);
        });
    });
    return map;
}

/** Calcula la concentración (qué tan concentrado está un grupo en un solo valor) */
function getConcentration(m: Map<string, number>): number {
    if (m.size === 0) return 0;
    const total = Array.from(m.values()).reduce((a, b) => a + b, 0);
    if (total === 0) return 0;
    const topVal = Math.max(...Array.from(m.values()));
    return (topVal / total) * 100; // Si 100% = todo concentrado en 1
}

/** Cuenta en cuántos meses distintos aparece un defecto */
function countRecurrenceMonths(records: RegistroMAC[]): number {
    const months = new Set<string>();
    records.forEach(r => { if (r._mesCreacionKey) months.add(r._mesCreacionKey); });
    return months.size;
}

/** Calcula si hay tendencia creciente en múltiples meses */
function getTrendScore(allData: RegistroMAC[], keyFilter: (r: RegistroMAC) => boolean): number {
    // Agrupar por mes los que matchean
    const monthCounts = new Map<string, number>();
    allData.forEach(r => {
        if (keyFilter(r) && r._mesCreacionKey) {
            monthCounts.set(r._mesCreacionKey, (monthCounts.get(r._mesCreacionKey) || 0) + 1);
        }
    });
    const sorted = Array.from(monthCounts.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    if (sorted.length < 2) return 0;

    // Contar cuántos meses consecutivos al final muestran crecimiento
    let consecutiveGrowth = 0;
    for (let i = sorted.length - 1; i > 0; i--) {
        if (sorted[i][1] > sorted[i - 1][1]) consecutiveGrowth++;
        else break;
    }
    return normalizeScore(consecutiveGrowth, sorted.length - 1);
}

// ── Análisis principal ──────────────────────────────────────────────────────

export function runFullAnalysis(
    allData: RegistroMAC[],
    currentPeriod: DateRange,
    previousPeriod: DateRange,
): AllAnalyses {
    const currData = filterByPeriod(allData, currentPeriod);
    const prevData = filterByPeriod(allData, previousPeriod);

    const totalRecordsCurr = currData.length;
    const totalRecordsPrev = prevData.length;
    const totalValueCurr = getTotalValue(currData);
    const totalValuePrev = getTotalValue(prevData);
    const totalUnitsCurr = getTotalUnits(currData);
    const totalUnitsPrev = getTotalUnits(prevData);

    // ─── 1. Defectos ────────────────────────────────────────────────────────
    const defectsCurrMap = aggregateByKey(currData, r => r._defectosNombres || []);
    const defectsPrevMap = aggregateByKey(prevData, r => r._defectosNombres || []);

    const allDefectKeys = new Set([...defectsCurrMap.keys(), ...defectsPrevMap.keys()]);
    const maxVolDef = Math.max(...Array.from(defectsCurrMap.values()).map(b => b.recordsSet.size), 1);
    const maxUnitsDef = Math.max(...Array.from(defectsCurrMap.values()).map(b => b.units), 1);
    const maxValueDef = Math.max(...Array.from(defectsCurrMap.values()).map(b => b.value), 1);

    const defects: DefectAnalysis[] = Array.from(allDefectKeys).map(name => {
        const curr = defectsCurrMap.get(name);
        const prev = defectsPrevMap.get(name);
        const rc = curr ? curr.recordsSet.size : 0;
        const rp = prev ? prev.recordsSet.size : 0;
        const uc = curr ? curr.units : 0;
        const up = prev ? prev.units : 0;
        const vc = curr ? curr.value : 0;
        const vp = prev ? prev.value : 0;

        const recurrence = countRecurrenceMonths(allData.filter(r => (r._defectosNombres || []).includes(name)));
        const concentrationVal = curr ? Math.max(
            getConcentration(curr.clientesMap),
            getConcentration(curr.referenciasMap),
            getConcentration(curr.zonasMap),
        ) : 0;
        const trend = getTrendScore(allData, r => (r._defectosNombres || []).includes(name));

        const { score, level } = calculatePriorityScore(
            calculateVariation(rc, rp), rc, maxVolDef, uc, maxUnitsDef, vc, maxValueDef,
            recurrence, 6, concentrationVal, trend,
        );

        return {
            name, recordsPrev: rp, recordsCurr: rc,
            variationRecords: calculateVariation(rc, rp),
            unitsPrev: up, unitsCurr: uc,
            variationUnits: calculateVariation(uc, up),
            valuePrev: vp, valueCurr: vc,
            variationValue: calculateVariation(vc, vp),
            priority: level, priorityScore: score,
            recurrence,
            concentration: curr ? getConcentrationDescription(curr) : '',
            topCliente: curr ? topFromMap(curr.clientesMap) : '',
            topReferencia: curr ? topFromMap(curr.referenciasMap) : '',
            topZona: curr ? topFromMap(curr.zonasMap) : '',
            topCiudad: curr ? topFromMap(curr.ciudadesMap) : '',
            topResponsable: curr ? topFromMap(curr.responsablesMap) : '',
        };
    }).filter(d => d.recordsCurr > 0 || d.recordsPrev > 0)
        .sort((a, b) => {
            const pOrd = priorityOrd(a.priority) - priorityOrd(b.priority);
            if (pOrd !== 0) return pOrd;
            return b.priorityScore - a.priorityScore;
        });

    // ─── 2. Responsables ────────────────────────────────────────────────────
    const respCurrMap = aggregateByKey(currData, r => r._responsablesNombres || []);
    const respPrevMap = aggregateByKey(prevData, r => r._responsablesNombres || []);
    const allRespKeys = new Set([...respCurrMap.keys(), ...respPrevMap.keys()]);
    const maxVolResp = Math.max(...Array.from(respCurrMap.values()).map(b => b.recordsSet.size), 1);
    const maxUnitsResp = Math.max(...Array.from(respCurrMap.values()).map(b => b.units), 1);
    const maxValueResp = Math.max(...Array.from(respCurrMap.values()).map(b => b.value), 1);

    const responsables: ResponsableAnalysis[] = Array.from(allRespKeys).map(name => {
        const curr = respCurrMap.get(name);
        const prev = respPrevMap.get(name);
        const rc = curr ? curr.recordsSet.size : 0;
        const rp = prev ? prev.recordsSet.size : 0;
        const uc = curr ? curr.units : 0;
        const up = prev ? prev.units : 0;
        const vc = curr ? curr.value : 0;
        const vp = prev ? prev.value : 0;

        const recurrence = countRecurrenceMonths(allData.filter(r => (r._responsablesNombres || []).includes(name)));
        const trend = getTrendScore(allData, r => (r._responsablesNombres || []).includes(name));

        const { score, level } = calculatePriorityScore(
            calculateVariation(rc, rp), rc, maxVolResp, uc, maxUnitsResp, vc, maxValueResp,
            recurrence, 6, 0, trend,
        );

        return {
            name, recordsPrev: rp, recordsCurr: rc,
            variationRecords: calculateVariation(rc, rp),
            unitsPrev: up, unitsCurr: uc,
            variationUnits: calculateVariation(uc, up),
            valuePrev: vp, valueCurr: vc,
            variationValue: calculateVariation(vc, vp),
            priority: level, priorityScore: score,
            principalProblema: curr ? topFromMap(curr.defectsMap) : 'Sin información registrada',
            principalReferencia: curr ? topFromMap(curr.referenciasMap) : 'Sin información registrada',
            topCliente: curr ? topFromMap(curr.clientesMap) : '',
            topReferencia: curr ? topFromMap(curr.referenciasMap) : '',
            topZona: curr ? topFromMap(curr.zonasMap) : '',
            topCiudad: curr ? topFromMap(curr.ciudadesMap) : '',
            topResponsable: name,
        };
    }).filter(d => d.recordsCurr > 0 || d.recordsPrev > 0)
        .sort((a, b) => {
            const pOrd = priorityOrd(a.priority) - priorityOrd(b.priority);
            if (pOrd !== 0) return pOrd;
            return b.priorityScore - a.priorityScore;
        });

    // ─── 3. Referencias ─────────────────────────────────────────────────────
    const refExtractor = (r: RegistroMAC): string[] => {
        const refs: string[] = [];
        if (Array.isArray(r.productos_novedad)) {
            r.productos_novedad.forEach((p: any) => {
                const ref = p.descripcion || p.nombre || p.sku || p.referencia || '';
                if (ref) refs.push(ref);
            });
        }
        return refs;
    };
    const refCurrMap = aggregateByKey(currData, refExtractor);
    const refPrevMap = aggregateByKey(prevData, refExtractor);
    const allRefKeys = new Set([...refCurrMap.keys(), ...refPrevMap.keys()]);
    const maxVolRef = Math.max(...Array.from(refCurrMap.values()).map(b => b.recordsSet.size), 1);
    const maxUnitsRef = Math.max(...Array.from(refCurrMap.values()).map(b => b.units), 1);
    const maxValueRef = Math.max(...Array.from(refCurrMap.values()).map(b => b.value), 1);

    const references: ReferenceAnalysis[] = Array.from(allRefKeys).map(name => {
        const curr = refCurrMap.get(name);
        const prev = refPrevMap.get(name);
        const rc = curr ? curr.recordsSet.size : 0;
        const rp = prev ? prev.recordsSet.size : 0;
        const uc = curr ? curr.units : 0;
        const up = prev ? prev.units : 0;
        const vc = curr ? curr.value : 0;
        const vp = prev ? prev.value : 0;

        const recurrence = countRecurrenceMonths(allData.filter(r => {
            if (!Array.isArray(r.productos_novedad)) return false;
            return r.productos_novedad.some((p: any) => (p.descripcion || p.nombre || p.sku || p.referencia || '') === name);
        }));
        const trend = getTrendScore(allData, r => {
            if (!Array.isArray(r.productos_novedad)) return false;
            return r.productos_novedad.some((p: any) => (p.descripcion || p.nombre || p.sku || p.referencia || '') === name);
        });

        const { score, level } = calculatePriorityScore(
            calculateVariation(rc, rp), rc, maxVolRef, uc, maxUnitsRef, vc, maxValueRef,
            recurrence, 6, 0, trend,
        );

        // Find matching compra reference
        let refCompra = 'Sin información registrada';
        currData.forEach(r => {
            if (Array.isArray(r.productos_novedad) && r.productos_novedad.some((p: any) => (p.descripcion || p.nombre || p.sku || p.referencia || '') === name)) {
                if (Array.isArray(r.productos_compra) && r.productos_compra.length > 0) {
                    const pc = r.productos_compra[0];
                    refCompra = pc.descripcion || pc.nombre || pc.sku || pc.referencia || refCompra;
                }
            }
        });

        return {
            name, recordsPrev: rp, recordsCurr: rc,
            variationRecords: calculateVariation(rc, rp),
            unitsPrev: up, unitsCurr: uc,
            variationUnits: calculateVariation(uc, up),
            valuePrev: vp, valueCurr: vc,
            variationValue: calculateVariation(vc, vp),
            priority: level, priorityScore: score,
            refCompra,
            refNovedad: name,
            principalNovedad: curr ? topFromMap(curr.defectsMap) : 'Sin información registrada',
            responsable: curr ? topFromMap(curr.responsablesMap) : 'Sin información registrada',
            multipleDefects: curr ? curr.defectsMap.size > 1 : false,
            topCliente: curr ? topFromMap(curr.clientesMap) : '',
            topReferencia: name,
            topZona: curr ? topFromMap(curr.zonasMap) : '',
            topCiudad: curr ? topFromMap(curr.ciudadesMap) : '',
            topResponsable: curr ? topFromMap(curr.responsablesMap) : '',
        };
    }).filter(d => d.recordsCurr > 0 || d.recordsPrev > 0)
        .sort((a, b) => {
            const pOrd = priorityOrd(a.priority) - priorityOrd(b.priority);
            if (pOrd !== 0) return pOrd;
            return b.priorityScore - a.priorityScore;
        })
        .slice(0, 50); // top 50 references

    // ─── 4. Geográfico ──────────────────────────────────────────────────────
    const geoExtractor = (r: RegistroMAC): string[] => {
        const z = r._zona || 'No definida';
        const c = r._ciudad || 'No definida';
        return [`${z}|||${c}`];
    };
    const geoCurrMap = aggregateByKey(currData, geoExtractor);
    const geoPrevMap = aggregateByKey(prevData, geoExtractor);
    const allGeoKeys = new Set([...geoCurrMap.keys(), ...geoPrevMap.keys()]);
    const maxVolGeo = Math.max(...Array.from(geoCurrMap.values()).map(b => b.recordsSet.size), 1);
    const maxUnitsGeo = Math.max(...Array.from(geoCurrMap.values()).map(b => b.units), 1);
    const maxValueGeo = Math.max(...Array.from(geoCurrMap.values()).map(b => b.value), 1);

    const geographic: GeoAnalysis[] = Array.from(allGeoKeys).map(name => {
        const [zona, ciudad] = name.split('|||');
        const curr = geoCurrMap.get(name);
        const prev = geoPrevMap.get(name);
        const rc = curr ? curr.recordsSet.size : 0;
        const rp = prev ? prev.recordsSet.size : 0;
        const uc = curr ? curr.units : 0;
        const up = prev ? prev.units : 0;
        const vc = curr ? curr.value : 0;
        const vp = prev ? prev.value : 0;

        const { score, level } = calculatePriorityScore(
            calculateVariation(rc, rp), rc, maxVolGeo, uc, maxUnitsGeo, vc, maxValueGeo,
            0, 1, 0, 0,
        );

        return {
            name: `${zona} — ${ciudad}`, recordsPrev: rp, recordsCurr: rc,
            variationRecords: calculateVariation(rc, rp),
            unitsPrev: up, unitsCurr: uc,
            variationUnits: calculateVariation(uc, up),
            valuePrev: vp, valueCurr: vc,
            variationValue: calculateVariation(vc, vp),
            priority: level, priorityScore: score,
            zona, ciudad,
            principalNovedad: curr ? topFromMap(curr.defectsMap) : 'Sin información registrada',
            clientePrincipal: curr ? topFromMap(curr.clientesMap) : 'Sin información registrada',
        };
    }).filter(d => d.recordsCurr > 0 || d.recordsPrev > 0)
        .sort((a, b) => {
            const pOrd = priorityOrd(a.priority) - priorityOrd(b.priority);
            if (pOrd !== 0) return pOrd;
            return b.priorityScore - a.priorityScore;
        })
        .slice(0, 30);

    // ─── 5. Clientes ────────────────────────────────────────────────────────
    const cliExtractor = (r: RegistroMAC): string[] => [r._clientePrincipalFinal || 'Desconocido'];
    const cliCurrMap = aggregateByKey(currData, cliExtractor);
    const cliPrevMap = aggregateByKey(prevData, cliExtractor);
    const allCliKeys = new Set([...cliCurrMap.keys(), ...cliPrevMap.keys()]);
    const maxVolCli = Math.max(...Array.from(cliCurrMap.values()).map(b => b.recordsSet.size), 1);
    const maxUnitsCli = Math.max(...Array.from(cliCurrMap.values()).map(b => b.units), 1);
    const maxValueCli = Math.max(...Array.from(cliCurrMap.values()).map(b => b.value), 1);

    const clients: ClientAnalysis[] = Array.from(allCliKeys).map(name => {
        const curr = cliCurrMap.get(name);
        const prev = cliPrevMap.get(name);
        const rc = curr ? curr.recordsSet.size : 0;
        const rp = prev ? prev.recordsSet.size : 0;
        const uc = curr ? curr.units : 0;
        const up = prev ? prev.units : 0;
        const vc = curr ? curr.value : 0;
        const vp = prev ? prev.value : 0;

        const recurrence = countRecurrenceMonths(allData.filter(r => (r._clientePrincipalFinal || 'Desconocido') === name));
        const concentrationVal = curr ? getConcentration(curr.referenciasMap) : 0;
        const trend = getTrendScore(allData, r => (r._clientePrincipalFinal || 'Desconocido') === name);

        const { score, level } = calculatePriorityScore(
            calculateVariation(rc, rp), rc, maxVolCli, uc, maxUnitsCli, vc, maxValueCli,
            recurrence, 6, concentrationVal, trend,
        );

        return {
            name, recordsPrev: rp, recordsCurr: rc,
            variationRecords: calculateVariation(rc, rp),
            unitsPrev: up, unitsCurr: uc,
            variationUnits: calculateVariation(uc, up),
            valuePrev: vp, valueCurr: vc,
            variationValue: calculateVariation(vc, vp),
            priority: level, priorityScore: score,
            principalNovedad: curr ? topFromMap(curr.defectsMap) : 'Sin información registrada',
            principalReferencia: curr ? topFromMap(curr.referenciasMap) : 'Sin información registrada',
            zona: curr ? topFromMap(curr.zonasMap) : 'Sin información registrada',
            topCliente: name,
            topReferencia: curr ? topFromMap(curr.referenciasMap) : '',
            topZona: curr ? topFromMap(curr.zonasMap) : '',
            topCiudad: curr ? topFromMap(curr.ciudadesMap) : '',
            topResponsable: curr ? topFromMap(curr.responsablesMap) : '',
        };
    }).filter(d => d.recordsCurr > 0 || d.recordsPrev > 0)
        .sort((a, b) => {
            const pOrd = priorityOrd(a.priority) - priorityOrd(b.priority);
            if (pOrd !== 0) return pOrd;
            return b.priorityScore - a.priorityScore;
        })
        .slice(0, 30);

    // ─── 6. Económico ───────────────────────────────────────────────────────
    const economic: EconomicAnalysis[] = defects.map(d => {
        const totalCurrValue = totalValueCurr || 1;
        return {
            ...d,
            percentOfTotal: totalCurrValue > 0 ? (d.valueCurr / totalCurrValue) * 100 : 0,
            responsable: d.topResponsable || 'Sin información registrada',
            principalReferencia: d.topReferencia || 'Sin información registrada',
            clientePrincipal: d.topCliente || 'Sin información registrada',
        };
    }).filter(e => e.valueCurr > 0)
        .sort((a, b) => b.valueCurr - a.valueCurr);

    // ─── 7. Recomendaciones ─────────────────────────────────────────────────
    const recommendations = generateRecommendations(defects, defectsCurrMap);

    return {
        defects, responsables, references, geographic, clients, economic, recommendations,
        currentPeriod, previousPeriod,
        totalRecordsCurr, totalRecordsPrev,
        totalValueCurr, totalValuePrev,
        totalUnitsCurr, totalUnitsPrev,
    };
}

// ── Recomendaciones automáticas ─────────────────────────────────────────────

function generateRecommendations(
    defects: DefectAnalysis[],
    currBuckets: Map<string, AggBucket>,
): Recommendation[] {
    return defects.map(d => {
        const bucket = currBuckets.get(d.name);
        const ids = bucket ? bucket.recordIds : [];

        let accion = 'Monitorear';
        if (d.priority === 'inmediato') accion = 'Abrir QRR';
        else if (d.priority === 'seguimiento') accion = 'Hacer seguimiento';
        else if (d.priority === 'vigilar') accion = 'Monitorear';
        else accion = 'No escalar por ahora';

        let evidencia = '';
        const vr = d.variationRecords;
        if (vr === null) {
            evidencia = 'Problema nuevo en el período actual';
        } else if (vr > 0) {
            evidencia = `+${vr.toFixed(1)}% registros`;
        } else {
            evidencia = `${vr.toFixed(1)}% registros`;
        }
        if (d.unitsCurr > 0) evidencia += `, ${d.unitsCurr} unidades afectadas`;
        if (d.valueCurr > 0) evidencia += `, $${d.valueCurr.toLocaleString('es-CO')}`;
        if (d.recurrence >= 3) evidencia += `, reincidencia (${d.recurrence} meses)`;
        if (d.concentration) evidencia += `. ${d.concentration}`;

        let impacto: 'Alto' | 'Medio' | 'Bajo' = 'Bajo';
        if (d.priority === 'inmediato') impacto = 'Alto';
        else if (d.priority === 'seguimiento') impacto = 'Medio';

        let motivo = '';
        if (d.priority === 'inmediato') {
            motivo = `Combinación de crecimiento, volumen (${d.recordsCurr} casos), impacto económico ($${d.valueCurr.toLocaleString('es-CO')}) y recurrencia que justifica apertura de QRR.`;
        } else if (d.priority === 'seguimiento') {
            motivo = `Tendencia creciente que requiere monitoreo prioritario. Evaluar en el próximo período si justifica apertura de QRR.`;
        } else if (d.priority === 'vigilar') {
            motivo = `Variación puntual o bajo volumen. No justifica acción formal por ahora.`;
        } else {
            motivo = `Comportamiento estable o controlado. Sin alerta.`;
        }

        return {
            priority: d.priority,
            problema: d.name,
            evidencia,
            impacto,
            responsable: d.topResponsable || 'Sin información registrada',
            accionRecomendada: accion,
            referencias: d.topReferencia || '',
            clientes: d.topCliente || '',
            zonaCiudad: `${d.topZona || ''} — ${d.topCiudad || ''}`,
            numCasos: d.recordsCurr,
            numUnidades: d.unitsCurr,
            impactoDinero: d.valueCurr,
            motivo,
            registrosIds: ids,
        };
    });
}

// ── Texto ejecutivo automático ──────────────────────────────────────────────

export function generateExecutiveSummary(analysis: AllAnalyses): string {
    const { defects, currentPeriod, previousPeriod, totalRecordsCurr, totalRecordsPrev, totalValueCurr } = analysis;

    const growing = defects.filter(d => d.variationRecords !== null && d.variationRecords > 0);
    const critical = defects.filter(d => d.priority === 'inmediato');
    const monitoring = defects.filter(d => d.priority === 'seguimiento');

    const varTotal = calculateVariation(totalRecordsCurr, totalRecordsPrev);
    const varTotalStr = varTotal === null ? 'sin registros previos' : `${varTotal > 0 ? '+' : ''}${varTotal.toFixed(1)}%`;

    let summary = `Durante ${currentPeriod.label} se registraron ${totalRecordsCurr} novedades (${varTotalStr} vs ${previousPeriod.label}).`;

    if (totalValueCurr > 0) {
        summary += ` La inversión total del período fue de $${totalValueCurr.toLocaleString('es-CO')}.`;
    }

    if (growing.length > 0) {
        const topGrowing = growing.slice(0, 3).map(d => d.name).join(', ');
        summary += `\n\nSe evidencia un incremento en los tipos de novedad: ${topGrowing}.`;
    }

    if (critical.length > 0) {
        summary += `\n\nEl principal foco de atención corresponde a ${critical[0].name}`;
        if (critical[0].topResponsable) {
            summary += `, asociado al área de ${critical[0].topResponsable}`;
        }
        summary += `. Se recomienda abrir QRR y realizar análisis de causa raíz.`;

        if (critical[0].topZona || critical[0].topCiudad) {
            summary += ` El problema se concentra en ${critical[0].topZona || ''} — ${critical[0].topCiudad || ''}.`;
        }
        if (critical[0].topCliente) {
            summary += ` Con mayor incidencia en el cliente ${critical[0].topCliente}.`;
        }
    } else {
        summary += `\n\nNo se identificaron problemas que requieran apertura inmediata de QRR.`;
    }

    if (monitoring.length > 0) {
        summary += `\n\nAdicionalmente, se identifican ${monitoring.length} problema${monitoring.length > 1 ? 's' : ''} en seguimiento que presenta${monitoring.length > 1 ? 'n' : ''} tendencia creciente, pero que aún no alcanza${monitoring.length > 1 ? 'n' : ''} el nivel de impacto requerido para apertura inmediata: ${monitoring.slice(0, 3).map(d => d.name).join(', ')}.`;
    }

    return summary;
}

// ── Helpers UI ──────────────────────────────────────────────────────────────

function getConcentrationDescription(bucket: AggBucket): string {
    const parts: string[] = [];
    const topCli = topFromMap(bucket.clientesMap);
    const cliConc = getConcentration(bucket.clientesMap);
    if (cliConc >= 50 && topCli !== 'Sin información registrada') {
        parts.push(`Concentrado en cliente: ${topCli} (${cliConc.toFixed(0)}%)`);
    }
    const topRef = topFromMap(bucket.referenciasMap);
    const refConc = getConcentration(bucket.referenciasMap);
    if (refConc >= 50 && topRef !== 'Sin información registrada') {
        parts.push(`Concentrado en referencia: ${topRef} (${refConc.toFixed(0)}%)`);
    }
    const topZona = topFromMap(bucket.zonasMap);
    const zonaConc = getConcentration(bucket.zonasMap);
    if (zonaConc >= 60 && topZona !== 'Sin información registrada') {
        parts.push(`Concentrado en zona: ${topZona} (${zonaConc.toFixed(0)}%)`);
    }
    return parts.join('. ');
}

function priorityOrd(p: PriorityLevel): number {
    switch (p) {
        case 'inmediato': return 0;
        case 'seguimiento': return 1;
        case 'vigilar': return 2;
        case 'estable': return 3;
    }
}

export const PRIORITY_CONFIG: Record<PriorityLevel, { label: string; emoji: string; color: string; bgColor: string; borderColor: string }> = {
    inmediato: { label: 'ATACAR INMEDIATAMENTE', emoji: '🔴', color: '#dc2626', bgColor: '#fef2f2', borderColor: '#fecaca' },
    seguimiento: { label: 'SEGUIMIENTO PRIORITARIO', emoji: '🟠', color: '#ea580c', bgColor: '#fff7ed', borderColor: '#fed7aa' },
    vigilar: { label: 'VIGILAR', emoji: '🟡', color: '#ca8a04', bgColor: '#fefce8', borderColor: '#fef08a' },
    estable: { label: 'ESTABLE / SIN ALERTA', emoji: '🟢', color: '#16a34a', bgColor: '#f0fdf4', borderColor: '#bbf7d0' },
};
