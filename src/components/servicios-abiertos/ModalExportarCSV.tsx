'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Package, Settings, FileText, Loader2, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface ModalExportarCSVProps {
    isOpen: boolean;
    onClose: () => void;
    services: any[];
}

const BASE_COLUMNS: { key: string; getValue: (s: any) => any }[] = [
    { key: 'id', getValue: (s) => s.id },
    { key: 'fecha_solicitud', getValue: (s) => s.created_at ? String(s.created_at).replace('T', ' ').split('.')[0] : '' },
    { key: 'consecutivo', getValue: (s) => s.consecutivo || '' },
    { key: 'numero_de_pedido', getValue: (s) => s.numero_de_pedido || s.numeroDePedido || '' },
    { key: 'estado', getValue: (s) => s.estado === true ? 'Abierto' : (s.estado === false ? 'Cerrado' : (s.estado ?? '')) },
    { key: 'tipo_de_servicio', getValue: (s) => s.tipo_de_servicio || s.tipoDeServicio || '' },
    { key: 'canal_de_venta', getValue: (s) => s.canal_de_venta || s.canalDeVenta || '' },
    { key: 'facturado', getValue: (s) => s.facturado === true ? 'Sí' : (s.facturado === false ? 'No' : (s.facturado ?? '')) },
    { key: 'asesor_comercial', getValue: (s) => s.asesor_nombre || s.asesorNombre || '' },
    { key: 'coordinador_nombre', getValue: (s) => s.coordinador_nombre || s.coordinadorNombre || '' },
    { key: 'cliente', getValue: (s) => s.cliente_nombre || s.clienteNombre || '' },
    { key: 'cliente_nit', getValue: (s) => s.ubicacion_nit || s.ubicacionNit || '' },
    { key: 'cliente_obra_sala', getValue: (s) => s.ubicacion_nombre || s.ubicacionNombre || '' },
    { key: 'cliente_contacto', getValue: (s) => s.ubicacion_contacto || s.ubicacionContacto || '' },
    { key: 'cliente_telefono', getValue: (s) => s.ubicacion_telefono || s.ubicacionTelefono || '' },
    { key: 'cliente_direccion', getValue: (s) => s.ubicacion_direccion || s.ubicacionDireccion || '' },
    { key: 'cliente_ciudad', getValue: (s) => s.ubicacion_ciudad || s.ubicacionCiudad || '' },
    { key: 'cliente_zona', getValue: (s) => s.ubicacion_zona || s.ubicacionZona || '' },
    { key: 'cliente_pais', getValue: (s) => s.ubicacion_pais || s.ubicacionPais || '' },
    { key: 'cliente_departamento', getValue: (s) => s.ubicacion_departamento || s.ubicacionDepartamento || '' },
    { key: 'clienteFinal_cedula', getValue: (s) => s.consumidor_cedula || s.consumidorCedula || '' },
    { key: 'clienteFinal_contacto', getValue: (s) => s.consumidor_contacto || s.consumidorContacto || s.consumidor_nombre || s.consumidorNombre || '' },
    { key: 'clienteFinal_telefono', getValue: (s) => s.consumidor_telefono || s.consumidorTelefono || '' },
    { key: 'clienteFinal_direccion', getValue: (s) => s.consumidor_direccion || s.consumidorDireccion || '' },
    { key: 'clienteFinal_descripcion_direccion', getValue: (s) => s.consumidor_descripcion_direccion || s.consumidorDescripcionDireccion || '' },
    { key: 'clienteFinal_ciudad', getValue: (s) => s.consumidor_ciudad || s.consumidorCiudad || '' },
    { key: 'clienteFinal_pais', getValue: (s) => s.consumidor_pais || s.consumidorPais || '' },
    { key: 'clienteFinal_departamento', getValue: (s) => s.consumidor_departamento || s.consumidorDepartamento || '' },
    { key: 'clienteFinal_zona', getValue: (s) => s.consumidor_zona || s.consumidorZona || '' },
    { key: 'clienteFinal_correo', getValue: (s) => s.consumidor_correo || s.consumidorCorreo || '' },
    { key: 'aplica_tecnico', getValue: (s) => s.aplica_tecnico === true || s.aplicaTecnico === true ? 'Sí' : (s.aplica_tecnico === false || s.aplicaTecnico === false ? 'No' : (s.aplica_tecnico ?? s.aplicaTecnico ?? '')) },
    { key: 'tecnico', getValue: (s) => s.tecnico_nombre || s.tecnicoNombre || '' },
    { key: 'visita_fecha_hora_inicio', getValue: (s) => s.visita_fecha_hora_inicio ? String(s.visita_fecha_hora_inicio).replace('T', ' ').split('.')[0] : '' },
    { key: 'visita_fecha_hora_fin', getValue: (s) => s.visita_fecha_hora_fin ? String(s.visita_fecha_hora_fin).replace('T', ' ').split('.')[0] : '' },
    { key: 'estado_visita', getValue: (s) => s.estado_visita || s.estadoVisita || s.estadoAgendamiento || '' },
    { key: 'fecha_cierre', getValue: (s) => s.fecha_cierre ? String(s.fecha_cierre).split('T')[0] : '' },
    { key: 'cerrado_por', getValue: (s) => s.nombre_cerrado_por || s.nombreCerradoPor || s.cerrado_por || '' }
];

export default function ModalExportarCSV({ isOpen, onClose, services }: ModalExportarCSVProps) {
    const [includeProducts, setIncludeProducts] = useState(false);
    const [includeParts, setIncludeParts] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState(() => {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    });
    const [dbCount, setDbCount] = useState<number | null>(null);
    const [isCounting, setIsCounting] = useState(false);

    const isDateFilterActive = startDate.trim() !== '';

    useEffect(() => {
        const fetchCount = async () => {
            if (!isDateFilterActive) {
                setDbCount(null);
                return;
            }
            setIsCounting(true);
            try {
                let query = supabase.from('query_servicios').select('*', { count: 'exact', head: true });
                if (startDate) query = query.gte('created_at', startDate);
                if (endDate) query = query.lte('created_at', endDate + 'T23:59:59.999Z');
                
                const { count, error } = await query;
                if (!error && count !== null) {
                    setDbCount(count);
                }
            } catch (error) {
                console.error("Error fetching count:", error);
            } finally {
                setIsCounting(false);
            }
        };

        const timeoutId = setTimeout(() => {
            fetchCount();
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [startDate, endDate]);

    if (!isOpen) return null;

    const formatCsvField = (value: any) => {
        if (value === null || value === undefined) return '';
        const stringVal = String(value);
        if (stringVal.includes(';') || stringVal.includes('"') || stringVal.includes('\n')) {
            return `"${stringVal.replace(/"/g, '""')}"`;
        }
        return stringVal;
    };

    const handleExport = async () => {
        setIsExporting(true);
        try {
            let finalServicesToExport = services;

            if (isDateFilterActive) {
                let query = supabase.from('query_servicios').select('*');
                if (startDate) query = query.gte('created_at', startDate);
                if (endDate) query = query.lte('created_at', endDate + 'T23:59:59.999Z');
                
                let allFetched: any[] = [];
                let from = 0;
                const step = 999;
                while (true) {
                    const { data, error } = await query.range(from, from + step);
                    if (error) throw error;
                    if (!data || data.length === 0) break;
                    allFetched = [...allFetched, ...data];
                    if (data.length <= step) break;
                    from += step + 1;
                }

                finalServicesToExport = allFetched.map((s: any) => ({
                    ...s,
                    ubicacionNombre: s.ubicacion_nombre || s.ubicacionNombre,
                    ubicacionCiudad: s.ubicacion_ciudad || s.ubicacionCiudad,
                    consumidorNombre: s.consumidor_nombre || s.consumidorNombre,
                    asesorNombre: s.asesor_nombre || s.asesorNombre,
                    coordinadorNombre: s.coordinador_nombre || s.coordinadorNombre,
                    macNombre: s.mac_nombre || s.macNombre || s.asesor_mac_nombre,
                    asesorMacNombre: s.mac_nombre || s.macNombre || s.asesor_mac_nombre,
                    asesorMacId: s.asesor_mac_id || s.asesorMacId,
                    tecnicoNombre: s.tecnico_nombre || s.tecnicoNombre,
                    tipoDeServicio: s.tipo_de_servicio || s.tipoDeServicio,
                    numeroDePedido: s.numero_de_pedido || s.numeroDePedido,
                    estadoAgendamiento: s.estado_visita || s.estadoVisita || 'Sin agendar',
                    fechaProgramada: s.visita_fecha_hora_inicio ? new Date(s.visita_fecha_hora_inicio).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Null'
                }));
            }

            if (finalServicesToExport.length === 0) {
                alert("No hay servicios para exportar en el rango seleccionado.");
                setIsExporting(false);
                return;
            }
            let csvRows = [];
            
            let allProducts: any[] = [];
            if (includeProducts) {
                const serviceIds = finalServicesToExport.map(s => s.id);
                const chunkSize = 100;
                for (let i = 0; i < serviceIds.length; i += chunkSize) {
                    const chunk = serviceIds.slice(i, i + chunkSize);
                    const { data } = await supabase
                        .from('productos_servicios')
                        .select('servicio_id, cantidad, Productos(*), producto:producto_id(*)')
                        .in('servicio_id', chunk);
                    if (data) allProducts = [...allProducts, ...data];
                }
            }

            let allParts: any[] = [];
            if (includeParts) {
                const serviceIds = finalServicesToExport.map(s => s.id);
                const chunkSize = 100;
                for (let i = 0; i < serviceIds.length; i += chunkSize) {
                    const chunk = serviceIds.slice(i, i + chunkSize);
                    const { data } = await supabase
                        .from('Repuestos_Servicios')
                        .select('servicio_id, cantidad, Repuestos(*), repuesto:repuesto_id(*)')
                        .in('servicio_id', chunk);
                    if (data) allParts = [...allParts, ...data];
                }
            }

            const headers = BASE_COLUMNS.map(c => c.key);
            if (includeProducts) {
                headers.push('PRODUCTOS');
            }
            if (includeParts) {
                headers.push('REPUESTOS');
            }
            csvRows = [headers];

            finalServicesToExport.forEach(s => {
                // Preparar lista de productos para este servicio
                let sProductsList: string[] = [];
                if (includeProducts) {
                    const sProducts = allProducts.filter(p => p.servicio_id === s.id);
                    if (sProducts.length > 0) {
                        sProductsList = sProducts.map(p => {
                            const prod = p.Productos || p.producto || {};
                            const nombre = prod.nombre || prod.descripcion || prod.producto || '';
                            const cant = p.cantidad || 1;
                            const ref = prod.sku || prod.referencia || '';
                            return `${cant}x ${nombre}${ref ? ` (${ref})` : ''}`.trim();
                        }).filter(Boolean);
                    } else if (Array.isArray(s.productos) && s.productos.length > 0) {
                        sProductsList = s.productos.map((p: any) => {
                            const nombre = p.producto || p.nombre || '';
                            const cant = p.cantidad || 1;
                            return `${cant}x ${nombre}`.trim();
                        }).filter(Boolean);
                    }
                }

                // Preparar lista de repuestos para este servicio
                let sPartsList: string[] = [];
                if (includeParts) {
                    const sParts = allParts.filter(p => p.servicio_id === s.id);
                    if (sParts.length > 0) {
                        sPartsList = sParts.map(p => {
                            const rep = p.Repuestos || p.repuesto || {};
                            const nombre = rep.nombre || rep.descripcion || rep.repuesto || '';
                            const cant = p.cantidad || 1;
                            const ref = rep.sku || rep.referencia || '';
                            return `${cant}x ${nombre}${ref ? ` (${ref})` : ''}`.trim();
                        }).filter(Boolean);
                    }
                }

                // Si piden productos o repuestos, repetir filas con la misma información del servicio
                const maxRows = Math.max(
                    1,
                    includeProducts ? sProductsList.length : 0,
                    includeParts ? sPartsList.length : 0
                );

                for (let i = 0; i < maxRows; i++) {
                    const row = BASE_COLUMNS.map(c => formatCsvField(c.getValue(s)));

                    if (includeProducts) {
                        row.push(formatCsvField(sProductsList[i] || ''));
                    }

                    if (includeParts) {
                        row.push(formatCsvField(sPartsList[i] || ''));
                    }

                    csvRows.push(row);
                }
            });

            const csvContent = csvRows.map(e => e.join(";")).join("\n");
            // prepend BOM for excel utf8
            const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            const typeStr = [includeProducts ? 'productos' : '', includeParts ? 'repuestos' : ''].filter(Boolean).join('_') || 'general';
            link.setAttribute("download", `servicios_${typeStr}_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            onClose();
        } catch (error: any) {
            console.error('Export error:', error);
            alert('Hubo un error al exportar: ' + error.message);
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white w-full max-w-lg rounded-3xl shadow-2xl relative overflow-hidden flex flex-col"
            >
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center shadow-sm">
                            <Download className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-slate-800 tracking-tight">Exportar CSV</h2>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Selecciona el tipo de exportación</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 hover:bg-slate-200 text-slate-400 hover:text-slate-600 rounded-xl transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <div className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left border-indigo-600 bg-indigo-50 shadow-md shadow-indigo-100 opacity-80">
                        <div className="p-3 rounded-xl bg-indigo-600 text-white">
                            <FileText className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-indigo-900">General (Columnas principales)</h3>
                            <p className="text-xs font-medium text-indigo-600">Exporta las columnas base del servicio, cliente y técnico.</p>
                        </div>
                    </div>

                    <button
                        onClick={() => setIncludeProducts(!includeProducts)}
                        className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${
                            includeProducts 
                            ? 'border-emerald-600 bg-emerald-50 shadow-md shadow-emerald-100' 
                            : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                        }`}
                    >
                        <div className={`p-3 rounded-xl ${includeProducts ? 'bg-emerald-600 text-white' : 'bg-white text-slate-400 shadow-sm'}`}>
                            <Package className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                            <h3 className={`text-sm font-black ${includeProducts ? 'text-emerald-900' : 'text-slate-700'}`}>Incluir Productos</h3>
                            <p className={`text-xs font-medium ${includeProducts ? 'text-emerald-600' : 'text-slate-500'}`}>Incluye la columna PRODUCTOS asociada a cada servicio.</p>
                        </div>
                        <div className={`w-6 h-6 rounded-md flex items-center justify-center border-2 ${includeProducts ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300'}`}>
                            {includeProducts && <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                        </div>
                    </button>

                    <button
                        onClick={() => setIncludeParts(!includeParts)}
                        className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${
                            includeParts 
                            ? 'border-amber-500 bg-amber-50 shadow-md shadow-amber-100' 
                            : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                        }`}
                    >
                        <div className={`p-3 rounded-xl ${includeParts ? 'bg-amber-500 text-white' : 'bg-white text-slate-400 shadow-sm'}`}>
                            <Settings className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                            <h3 className={`text-sm font-black ${includeParts ? 'text-amber-900' : 'text-slate-700'}`}>Incluir Repuestos</h3>
                            <p className={`text-xs font-medium ${includeParts ? 'text-amber-600' : 'text-slate-500'}`}>Incluye la columna REPUESTOS asociada a cada servicio.</p>
                        </div>
                        <div className={`w-6 h-6 rounded-md flex items-center justify-center border-2 ${includeParts ? 'border-amber-500 bg-amber-500' : 'border-slate-300'}`}>
                            {includeParts && <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                        </div>
                    </button>
                </div>

                <div className="px-6 space-y-2 mb-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Filtrar por Fecha de Creación (Opcional)</label>
                    <div className="flex items-center gap-2">
                        <input
                            type="date"
                            className="flex-1 bg-slate-50 border border-slate-100 rounded-xl py-3 px-4 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-brand/20 outline-none"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            title="Desde"
                        />
                        <span className="text-slate-300 font-bold">-</span>
                        <input
                            type="date"
                            className="flex-1 bg-slate-50 border border-slate-100 rounded-xl py-3 px-4 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-brand/20 outline-none"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            title="Hasta"
                        />
                    </div>
                    {isDateFilterActive ? (
                        <p className="text-[10px] font-bold text-indigo-600 ml-1">
                            {isCounting 
                                ? 'Calculando total de registros en la base de datos...' 
                                : `Se exportarán ${dbCount ?? 0} registros históricos de la base de datos para este rango.`
                            }
                        </p>
                    ) : (
                        <p className="text-[10px] font-bold text-slate-500 ml-1">
                            Ingresa una fecha de inicio para descargar el historial completo de la base de datos.
                        </p>
                    )}
                </div>

                <div className="p-6 pt-0 mt-2">
                    <button
                        onClick={handleExport}
                        disabled={isExporting}
                        className="w-full bg-slate-900 hover:bg-brand text-white p-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
                    >
                        {isExporting ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Generando CSV...
                            </>
                        ) : (
                            <>
                                <Download className="w-5 h-5" />
                                {isDateFilterActive 
                                    ? `Exportar (${isCounting ? '...' : dbCount ?? 0} registros)`
                                    : `Exportar (${services.length} registros)`
                                }
                            </>
                        )}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
