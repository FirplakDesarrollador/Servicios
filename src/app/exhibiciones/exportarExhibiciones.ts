import { supabase } from '@/lib/supabase'
import { QueryUbicacionesRow } from '@/types/supabase'

// Cada fila de query_exhibiciones (productos_ubicaciones) es una unidad exhibida.
interface ExhibicionRow {
    ubicacion_id: number
    producto_id: number | null
    producto_sku: string | null
    producto_descripcion: string | null
    producto_grupo: string | null
    mueble_marcado: boolean | null
}

interface ProductoRef {
    id: number
    sku_base: string | null
}

const LOTE_IDS = 200
const PAGINA = 1000

function trocear<T>(arr: T[], tam: number): T[][] {
    const out: T[][] = []
    for (let i = 0; i < arr.length; i += tam) out.push(arr.slice(i, i + tam))
    return out
}

async function cargarExhibiciones(ubicacionIds: number[]): Promise<ExhibicionRow[]> {
    const res: ExhibicionRow[] = []
    for (const lote of trocear(ubicacionIds, LOTE_IDS)) {
        let desde = 0
        while (true) {
            const { data, error } = await supabase
                .from('query_exhibiciones')
                .select('ubicacion_id, producto_id, producto_sku, producto_descripcion, producto_grupo, mueble_marcado')
                .in('ubicacion_id', lote)
                .order('id', { ascending: true })
                .range(desde, desde + PAGINA - 1)
            if (error) throw error
            const filas = (data || []) as ExhibicionRow[]
            res.push(...filas)
            if (filas.length < PAGINA) break
            desde += PAGINA
        }
    }
    return res
}

async function cargarReferencias(productoIds: number[]): Promise<Map<number, string>> {
    const mapa = new Map<number, string>()
    for (const lote of trocear(productoIds, LOTE_IDS)) {
        const { data, error } = await supabase.from('Productos').select('id, sku_base').in('id', lote)
        if (error) throw error
        for (const p of (data || []) as ProductoRef[]) {
            if (p.sku_base) mapa.set(p.id, p.sku_base)
        }
    }
    return mapa
}

const txt = (v: string | null | undefined) => (v ?? '').toString().trim()

function fechaCorta(v: string | null): string {
    if (!v) return 'No registra'
    const d = new Date(v)
    return isNaN(d.getTime()) ? v : d.toLocaleDateString('es-CO')
}

function anchoColumnas(filas: Record<string, string | number>[]): { wch: number }[] {
    if (filas.length === 0) return []
    return Object.keys(filas[0]).map(k => ({
        wch: Math.min(50, Math.max(k.length, ...filas.map(f => String(f[k] ?? '').length)) + 2),
    }))
}

export async function exportarInformeExhibiciones(salas: QueryUbicacionesRow[]): Promise<void> {
    const salaPorId = new Map<number, QueryUbicacionesRow>()
    for (const s of salas) salaPorId.set(s.id, s)

    const exhibiciones = await cargarExhibiciones(salas.map(s => s.id))
    const productoIds = Array.from(new Set(exhibiciones.map(e => e.producto_id).filter((x): x is number => x != null)))
    const referencias = await cargarReferencias(productoIds)

    const referenciaDe = (e: ExhibicionRow) =>
        (e.producto_id != null && referencias.get(e.producto_id)) || txt(e.producto_sku)

    // ---- Hoja Detalle: una fila por sala + SKU con su cantidad ----
    interface Agrupado { sala: QueryUbicacionesRow; e: ExhibicionRow; cantidad: number; marcados: number }
    const porSalaSku = new Map<string, Agrupado>()
    for (const e of exhibiciones) {
        const sala = salaPorId.get(e.ubicacion_id)
        if (!sala) continue
        const clave = `${e.ubicacion_id}|${txt(e.producto_sku) || e.producto_id}`
        const g = porSalaSku.get(clave)
        if (g) {
            g.cantidad++
            if (e.mueble_marcado) g.marcados++
        } else {
            porSalaSku.set(clave, { sala, e, cantidad: 1, marcados: e.mueble_marcado ? 1 : 0 })
        }
    }
    const detalle: Record<string, string | number>[] = Array.from(porSalaSku.values())
        .sort((a, b) =>
            txt(a.sala.cliente_nombre).localeCompare(txt(b.sala.cliente_nombre)) ||
            txt(a.sala.nombre).localeCompare(txt(b.sala.nombre)) ||
            txt(a.e.producto_sku).localeCompare(txt(b.e.producto_sku)))
        .map(({ sala, e, cantidad, marcados }) => ({
            'Cliente': txt(sala.cliente_nombre),
            'NIT cliente': txt(sala.cliente_nit),
            'Sala': txt(sala.nombre),
            'Id sala': sala.id,
            'Tipo cliente': txt(sala.cliente_tipo),
            'Zona': txt(sala.zona),
            'Departamento': txt(sala.departamento),
            'Ciudad': txt(sala.ciudad),
            'Asesor comercial': txt(sala.asesor_comercial_nombre),
            'SKU': txt(e.producto_sku),
            'Referencia': referenciaDe(e),
            'Descripción': txt(e.producto_descripcion),
            'Grupo': txt(e.producto_grupo),
            'Cantidad': cantidad,
            'Muebles marcados': marcados,
        }))

    // ---- Hoja Salas: todas las salas filtradas, incluso sin exhibición ----
    const unidadesPorSala = new Map<number, number>()
    const skusPorSala = new Map<number, Set<string>>()
    for (const e of exhibiciones) {
        unidadesPorSala.set(e.ubicacion_id, (unidadesPorSala.get(e.ubicacion_id) || 0) + 1)
        if (!skusPorSala.has(e.ubicacion_id)) skusPorSala.set(e.ubicacion_id, new Set())
        skusPorSala.get(e.ubicacion_id)!.add(txt(e.producto_sku))
    }
    const hojaSalas: Record<string, string | number>[] = [...salas]
        .sort((a, b) =>
            txt(a.cliente_nombre).localeCompare(txt(b.cliente_nombre)) ||
            txt(a.nombre).localeCompare(txt(b.nombre)))
        .map(s => ({
            'Cliente': txt(s.cliente_nombre),
            'NIT cliente': txt(s.cliente_nit),
            'Sala': txt(s.nombre),
            'Id sala': s.id,
            'NIT sala': txt(s.nit),
            'Tipo cliente': txt(s.cliente_tipo),
            'Zona': txt(s.zona),
            'Departamento': txt(s.departamento),
            'Ciudad': txt(s.ciudad),
            'Dirección': txt(s.direccion),
            'Contacto': txt(s.nombre_contacto),
            'Teléfono': txt(s.telefono),
            'Asesor comercial': txt(s.asesor_comercial_nombre),
            'Permite exhibir': s.permite_exhibir ? 'Sí' : 'No',
            'Unidades exhibidas': unidadesPorSala.get(s.id) || 0,
            'SKUs distintos': skusPorSala.get(s.id)?.size || 0,
            'Último mantenimiento': fechaCorta(s.ultimo_mantenimiento_fecha_cierre),
        }))

    // ---- Hoja Por SKU ----
    interface AcSku { e: ExhibicionRow; unidades: number; salas: Set<number>; ciudades: Set<string>; zonas: Set<string> }
    const porSku = new Map<string, AcSku>()
    for (const e of exhibiciones) {
        const sala = salaPorId.get(e.ubicacion_id)
        if (!sala) continue
        const clave = txt(e.producto_sku) || `id-${e.producto_id}`
        let ac = porSku.get(clave)
        if (!ac) {
            ac = { e, unidades: 0, salas: new Set(), ciudades: new Set(), zonas: new Set() }
            porSku.set(clave, ac)
        }
        ac.unidades++
        ac.salas.add(e.ubicacion_id)
        if (sala.ciudad) ac.ciudades.add(sala.ciudad)
        if (sala.zona) ac.zonas.add(sala.zona)
    }
    const hojaSku: Record<string, string | number>[] = Array.from(porSku.values())
        .sort((a, b) => b.unidades - a.unidades)
        .map(ac => ({
            'SKU': txt(ac.e.producto_sku),
            'Referencia': referenciaDe(ac.e),
            'Descripción': txt(ac.e.producto_descripcion),
            'Grupo': txt(ac.e.producto_grupo),
            'Unidades': ac.unidades,
            'Salas': ac.salas.size,
            'Ciudades': ac.ciudades.size,
            'Zonas': Array.from(ac.zonas).sort().join(', '),
        }))

    // ---- Hoja Por ciudad y zona ----
    interface AcCiudad { zona: string; depto: string; ciudad: string; salas: number; conExhibicion: number; unidades: number; skus: Set<string> }
    const porCiudad = new Map<string, AcCiudad>()
    for (const s of salas) {
        const zona = txt(s.zona) || 'Sin zona'
        const depto = txt(s.departamento)
        const ciudad = txt(s.ciudad) || 'Sin ciudad'
        const clave = `${zona}|${depto}|${ciudad}`
        let ac = porCiudad.get(clave)
        if (!ac) {
            ac = { zona, depto, ciudad, salas: 0, conExhibicion: 0, unidades: 0, skus: new Set() }
            porCiudad.set(clave, ac)
        }
        ac.salas++
        const u = unidadesPorSala.get(s.id) || 0
        if (u > 0) ac.conExhibicion++
        ac.unidades += u
        skusPorSala.get(s.id)?.forEach(k => ac!.skus.add(k))
    }
    const hojaCiudad: Record<string, string | number>[] = Array.from(porCiudad.values())
        .sort((a, b) => a.zona.localeCompare(b.zona) || b.unidades - a.unidades)
        .map(ac => ({
            'Zona': ac.zona,
            'Departamento': ac.depto,
            'Ciudad': ac.ciudad,
            'Salas': ac.salas,
            'Salas con exhibición': ac.conExhibicion,
            'Unidades exhibidas': ac.unidades,
            'SKUs distintos': ac.skus.size,
        }))

    // ---- Hoja Resumen ----
    const totalUnidades = exhibiciones.filter(e => salaPorId.has(e.ubicacion_id)).length
    const resumen: Record<string, string | number>[] = [
        { 'Indicador': 'Fecha del informe', 'Valor': new Date().toLocaleString('es-CO') },
        { 'Indicador': 'Clientes', 'Valor': new Set(salas.map(s => s.cliente_id)).size },
        { 'Indicador': 'Salas', 'Valor': salas.length },
        { 'Indicador': 'Salas con exhibición', 'Valor': hojaSalas.filter(s => (s['Unidades exhibidas'] as number) > 0).length },
        { 'Indicador': 'Unidades exhibidas', 'Valor': totalUnidades },
        { 'Indicador': 'SKUs distintos', 'Valor': porSku.size },
        { 'Indicador': 'Ciudades', 'Valor': new Set(salas.map(s => txt(s.ciudad)).filter(Boolean)).size },
        { 'Indicador': 'Zonas', 'Valor': new Set(salas.map(s => txt(s.zona)).filter(Boolean)).size },
    ]

    const XLSX = await import('xlsx')
    const libro = XLSX.utils.book_new()
    const agregar = (filas: Record<string, string | number>[], nombre: string) => {
        const hoja = XLSX.utils.json_to_sheet(filas)
        hoja['!cols'] = anchoColumnas(filas)
        if (filas.length > 0) {
            const rango = XLSX.utils.decode_range(hoja['!ref'] || 'A1')
            hoja['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: rango.e.r, c: rango.e.c } }) }
        }
        XLSX.utils.book_append_sheet(libro, hoja, nombre)
    }
    agregar(resumen, 'Resumen')
    agregar(detalle, 'Detalle exhibición')
    agregar(hojaSalas, 'Salas')
    agregar(hojaSku, 'Por SKU')
    agregar(hojaCiudad, 'Por ciudad y zona')

    XLSX.writeFile(libro, `Informe_Exhibiciones_${new Date().toISOString().slice(0, 10)}.xlsx`)
}
