import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Search, Plus, Trash2, Package, Sparkles, Receipt, Tags, Store, Users, MessageSquare, Paperclip, File as FileIcon } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import BuscadorClientes from '@/components/solicitar-servicio/BuscadorClientes';
import BuscadorClienteFinal from '@/components/solicitar-servicio/BuscadorClienteFinal';
import BuscadorProductos from '@/components/solicitar-servicio/BuscadorProductos';

export default function ModalCrearRegistro({ 
    onClose, 
    onSuccess 
}: { 
    onClose: () => void; 
    onSuccess: () => void; 
}) {
    const [isSaving, setIsSaving] = useState(false);
    
    // Generar consecutivo al cargar el modal
    const [consecutivoStr] = useState(`RAD-${Math.floor(100000 + Math.random() * 900000)}`);

    // Form fields
    const [ordenVenta, setOrdenVenta] = useState('');
    const [tipoSolicitud, setTipoSolicitud] = useState('');
    const [tiposSolicitud, setTiposSolicitud] = useState<string[]>([]);

    useEffect(() => {
        const fetchTipos = async () => {
            try {
                const { data } = await supabase.from('Tipo_Solicitud').select('TipoSolicitud').eq('activo', true);
                if (data) {
                    const fromTable = data.map(d => d.TipoSolicitud).filter((t): t is string => typeof t === 'string' && t.trim() !== '');
                    setTiposSolicitud(fromTable);
                }
            } catch(e) {
                console.error("Error fetching tipos de solicitud:", e);
            }
        };
        fetchTipos();
    }, []);
    const [canalVenta, setCanalVenta] = useState('');
    const [comentarios, setComentarios] = useState('');
    const [archivos, setArchivos] = useState<File[]>([]);
    
    // Clients & Products
    const [cliente, setCliente] = useState<any>(null);
    const [clienteFinal, setClienteFinal] = useState<any>(null);
    const [llevaClienteFinal, setLlevaClienteFinal] = useState(false);
    const [productosCompra, setProductosCompra] = useState<any[]>([]);
    const [productosNovedad, setProductosNovedad] = useState<any[]>([]);

    // Modals
    const [showBuscadorCliente, setShowBuscadorCliente] = useState(false);
    const [showBuscadorClienteFinal, setShowBuscadorClienteFinal] = useState(false);
    const [showBuscadorProductoCompra, setShowBuscadorProductoCompra] = useState(false);
    const [showBuscadorProductoNovedad, setShowBuscadorProductoNovedad] = useState(false);

    const getClientLabel = () => {
        if (!canalVenta) return 'Cliente';
        if (canalVenta === 'canal_propio_ecommerce') return 'Cliente Final';
        if (canalVenta === 'canal_constructor') return 'Obra / Proyecto';
        return 'Distribuidor / Cliente';
    };

    const handleSave = async () => {
        if (!tipoSolicitud || !canalVenta) {
            alert('Por favor complete los campos requeridos (Tipo de Solicitud y Canal de Venta).');
            return;
        }

        setIsSaving(true);
        try {
            const userRes = await supabase.auth.getUser();
            const userId = userRes.data?.user?.id;

            let tratadoPorId = null;
            let asesorMacId = null;
            if (userId) {
                const { data: userData } = await supabase.from('Usuarios').select('id, rol').eq('user_id', userId).single();
                if (userData) {
                    tratadoPorId = userData.id;
                    if (userData.rol && userData.rol.toLowerCase() === 'mac') {
                        asesorMacId = userData.id;
                    }
                }
            }

            // Mapeamos los arrays eliminando información innecesaria y guardando id, sku, nombre, cantidad
            const formatProducts = (prods: any[]) => prods.map(p => ({
                id: p.id,
                sku: p.sku,
                nombre: p.nombre || p.producto_descripcion,
                cantidad: p.cantidad || 1
            }));

            const { error } = await supabase
                .from('registro_solicitudes')
                .insert({
                    consecutivo: consecutivoStr,
                    orden_venta: ordenVenta ? parseInt(ordenVenta) : null,
                    tipo_solicitud: tipoSolicitud,
                    canal_venta: canalVenta,
                    cliente_id: cliente ? cliente.id : null,
                    cliente_nombre: cliente ? (cliente.cliente_nombre || cliente.nombre) : null,
                    cliente_final_id: clienteFinal ? clienteFinal.id : null,
                    cliente_final_nombre: clienteFinal ? (clienteFinal.contacto || clienteFinal.nombre_contacto || clienteFinal.cedula) : null,
                    productos_compra: formatProducts(productosCompra),
                    productos_novedad: formatProducts(productosNovedad),
                    comentarios: comentarios,
                    tratado_por_id: tratadoPorId,
                    asesor_mac_id: asesorMacId,
                    estado: 'Abierto',
                    prioridad: 'Media'
                });

            if (error) throw error;
            
            const hasComentario = comentarios.trim().length > 0;
            const hasArchivos = archivos.length > 0;

            if (hasComentario || hasArchivos) {
                const uploadedUrls = [];
                if (hasArchivos) {
                    for (const file of archivos) {
                        const fileExt = file.name.split('.').pop();
                        const fileName = `${crypto.randomUUID()}.${fileExt}`;
                        
                        const sanitizePath = (path: string) => {
                            return path
                                .normalize("NFD")
                                .replace(/[\u0300-\u036f]/g, "")
                                .replace(/ñ/g, "n")
                                .replace(/Ñ/g, "N")
                                .replace(/[^a-zA-Z0-9\/\-_.]/g, "_");
                        };

                        const folderPath = sanitizePath(consecutivoStr);
                        const filePath = `registrosMAC/${folderPath}/comentarios/${fileName}`;

                        const { error: uploadError } = await supabase.storage
                            .from('servicios')
                            .upload(filePath, file);

                        if (!uploadError) {
                            const { data: { publicUrl } } = supabase.storage
                                .from('servicios')
                                .getPublicUrl(filePath);
                            uploadedUrls.push({ url: publicUrl, name: file.name, type: file.type });
                        }
                    }
                }

                await supabase
                    .from('Comentarios_RegistroMAC')
                    .insert({
                        numero_radicado: consecutivoStr,
                        autor: tratadoPorId,
                        comentario: hasComentario ? comentarios.trim() : "Archivos adjuntos iniciales",
                        adjuntos: uploadedUrls.length > 0 ? uploadedUrls : null
                    });
            }

            onSuccess();
        } catch (error: any) {
            console.error('Error saving:', error);
            alert(`Ocurrió un error al guardar el registro: ${error.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    // Componente auxiliar para renderizar listas de productos
    const renderProductsList = (
        title: string, 
        icon: any,
        products: any[], 
        setProducts: any, 
        onAddClick: () => void
    ) => (
        <div className="p-5 rounded-[1.5rem] border border-[#e8e2d5] bg-[#f5f1ea]/20 hover:border-[#749094]/30 transition-colors">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-white border border-[#e8e2d5] text-[#749094] shadow-sm">
                        {icon}
                    </div>
                    <label className="text-sm font-bold text-[#1d1d1b]">{title}</label>
                </div>
                <button
                    type="button"
                    onClick={onAddClick}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all bg-white text-[#1d1d1b]/80 border border-[#e8e2d5] hover:bg-[#f5f1ea]/50 hover:text-[#254153] shadow-sm"
                >
                    <Plus className="w-4 h-4" />
                    Añadir Producto
                </button>
            </div>
            
            {products.length === 0 ? (
                <div className="text-center py-8 rounded-xl border-2 border-dashed border-[#e8e2d5] bg-white/50 text-[#749094]/60">
                    <Package className="w-8 h-8 mx-auto mb-2 opacity-30 text-[#749094]" />
                    <span className="text-xs font-medium">No se han agregado productos.</span>
                </div>
            ) : (
                <div className="space-y-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                    {products.map((p, idx) => (
                        <motion.div 
                            initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                            key={idx} 
                            className="flex items-center justify-between gap-4 bg-white p-3.5 rounded-xl border border-[#e8e2d5] shadow-sm"
                        >
                            <div className="flex items-center gap-3 overflow-hidden flex-1">
                                <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-[#f5f1ea]/50 text-[#749094]">
                                    <Package className="w-5 h-5" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-bold text-[#1d1d1b] truncate">{p.sku}</p>
                                    <p className="text-xs font-medium text-[#1d1d1b]/70 truncate">{p.nombre}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                                <div className="flex items-center gap-2 bg-[#f5f1ea]/30 p-1.5 rounded-lg border border-[#e8e2d5]">
                                    <span className="text-[10px] font-bold uppercase text-[#749094] ml-1">Cant:</span>
                                    <input
                                        type="number"
                                        min="1"
                                        value={p.cantidad || 1}
                                        onChange={(e) => {
                                            const newProducts = [...products];
                                            newProducts[idx].cantidad = parseInt(e.target.value) || 1;
                                            setProducts(newProducts);
                                        }}
                                        className="w-14 px-1 py-1 bg-white border border-[#e8e2d5] focus:border-[#254153] focus:ring-[#254153]/20 focus:ring-1 rounded-md text-sm font-bold text-center text-[#1d1d1b] focus:outline-none transition-all"
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const newProducts = [...products];
                                        newProducts.splice(idx, 1);
                                        setProducts(newProducts);
                                    }}
                                    className="p-2 text-[#749094] hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                    title="Eliminar"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );

    return (
        <AnimatePresence>
            <motion.div
                key="modal-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-[#1d1d1b]/70 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
            >
                <motion.div
                    initial={{ scale: 0.95, y: 20, opacity: 0 }}
                    animate={{ scale: 1, y: 0, opacity: 1 }}
                    exit={{ scale: 0.95, y: 20, opacity: 0 }}
                    transition={{ type: "spring", bounce: 0.3, duration: 0.5 }}
                    className="bg-white rounded-[2rem] w-full max-w-[96%] xl:max-w-[1700px] shadow-2xl flex flex-col my-auto max-h-[96vh] overflow-hidden"
                >
                    {/* Header Ejecutivo */}
                    <div className="flex items-center justify-between p-6 bg-[#f5f1ea] shrink-0 border-b border-[#e8e2d5]">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-brand flex items-center justify-center shadow-md text-white">
                                <Receipt className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-xl sm:text-2xl font-black text-[#1d1d1b] tracking-tight">Nuevo Registro de Solicitud</h2>
                                <p className="text-[10px] sm:text-xs font-medium text-[#749094] uppercase tracking-widest mt-1">Complete la información de la solicitud</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 bg-white hover:bg-[#f5f1ea]/50 text-[#254153] rounded-lg transition-colors border border-[#749094]/20 shadow-sm"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Form Body */}
                    <div className="p-6 sm:p-8 overflow-y-auto custom-scrollbar flex-1 bg-white">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                            
                            {/* Consecutivo (Read Only) */}
                            <div className="space-y-2">
                                <label className="flex items-center text-sm font-bold text-[#1d1d1b] ml-1">
                                    <Sparkles className="w-4 h-4 text-brand mr-1.5" /> Radicado
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        readOnly
                                        value={consecutivoStr}
                                        className="w-full p-3.5 bg-[#f5f1ea]/50 border border-[#e8e2d5] rounded-xl text-sm font-bold text-[#1d1d1b]/70 focus:outline-none cursor-default"
                                    />
                                    <button 
                                        type="button"
                                        onClick={() => {
                                            navigator.clipboard.writeText(consecutivoStr);
                                            alert('¡Radicado copiado al portapapeles!');
                                        }}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-[#749094] hover:text-[#254153] hover:bg-[#254153]/10 p-2 rounded-lg transition-colors"
                                        title="Copiar radicado"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                    </button>
                                </div>
                            </div>

                            {/* Orden Venta */}
                            <div className="space-y-2">
                                <label className="flex items-center gap-1.5 text-sm font-bold text-[#1d1d1b] ml-1">
                                    <Receipt className="w-4 h-4 text-[#749094]" /> Orden de Venta
                                </label>
                                <input
                                    type="number"
                                    value={ordenVenta}
                                    onChange={(e) => setOrdenVenta(e.target.value)}
                                    placeholder="Ej: 123456"
                                    className="w-full p-3.5 bg-white border border-[#e8e2d5] hover:border-[#749094]/40 focus:bg-white rounded-xl text-sm focus:outline-none focus:border-[#254153] focus:ring-[#254153]/20 focus:ring-2 transition-all text-[#1d1d1b]"
                                />
                            </div>

                            {/* Tipo Solicitud */}
                            <div className="space-y-2">
                                <label className="flex items-center gap-1.5 text-sm font-bold text-slate-700 ml-1">
                                    <Tags className="w-4 h-4 text-[#749094]" /> Tipo de Solicitud *
                                </label>
                                <select
                                    value={tipoSolicitud}
                                    onChange={async (e) => {
                                        const val = e.target.value;
                                        if (val === 'NEW') {
                                            const newName = window.prompt("Ingrese el nombre del nuevo tipo de solicitud:");
                                            if (!newName?.trim()) {
                                                e.target.value = tipoSolicitud;
                                                return;
                                            }
                                            const cleanName = newName.trim();
                                            try {
                                                const { error: insertError } = await supabase.from('Tipo_Solicitud').insert({ TipoSolicitud: cleanName });
                                                if (insertError && insertError.code !== '23505') throw insertError; // 23505 is unique_violation
                                                
                                                setTiposSolicitud(prev => Array.from(new Set([...prev, cleanName])));
                                                setTipoSolicitud(cleanName);
                                            } catch (err: any) {
                                                console.error("Error creando nuevo tipo de solicitud:", err);
                                                alert("Error creando nuevo tipo: " + err.message);
                                                e.target.value = tipoSolicitud;
                                            }
                                        } else {
                                            setTipoSolicitud(val);
                                        }
                                    }}
                                    className="w-full p-3.5 bg-white border border-slate-300 hover:border-slate-400 focus:bg-white rounded-xl text-sm focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all text-[#1d1d1b]"
                                >
                                    <option value="">Seleccionar opción...</option>
                                    {tiposSolicitud.map(tipo => (
                                        <option key={tipo} value={tipo}>{tipo}</option>
                                    ))}
                                    <option value="NEW" className="font-bold text-[#254153]">+ Crear Nuevo Tipo...</option>
                                </select>
                            </div>

                            {/* Canal Venta */}
                            <div className="space-y-2">
                                <label className="flex items-center gap-1.5 text-sm font-bold text-slate-700 ml-1">
                                    <Store className="w-4 h-4 text-[#749094]" /> Canal de Venta *
                                </label>
                                <select
                                    value={canalVenta}
                                    onChange={(e) => {
                                        setCanalVenta(e.target.value);
                                        setCliente(null);
                                        setClienteFinal(null);
                                    }}
                                    className="w-full p-3.5 bg-white border border-slate-300 hover:border-slate-400 focus:bg-white rounded-xl text-sm focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all"
                                >
                                    <option value="">Seleccionar canal...</option>
                                    <option value="canal_ditribuidor">Canal Distribuidor</option>
                                    <option value="canal_exportador">Canal Exportador</option>
                                    <option value="canal_constructor">Canal Constructor</option>
                                    <option value="canal_propio_firplakhome">Canal Propio Firplakhome</option>
                                    <option value="canal_propio_ecommerce">Canal Propio eCommerce</option>
                                </select>
                            </div>

                            {/* Cliente Principal */}
                            {canalVenta !== 'canal_propio_ecommerce' && (
                                <div className="space-y-2">
                                    <label className="flex items-center gap-1.5 text-sm font-bold text-slate-700 ml-1">
                                        <Users className="w-4 h-4 text-[#749094]" />
                                        {getClientLabel()}
                                    </label>
                                    {cliente ? (
                                        <div className="flex items-center justify-between w-full p-3.5 bg-[#f5f1ea]/30 border border-[#e8e2d5] rounded-xl">
                                            <span className="text-sm font-bold text-slate-700 truncate">{cliente.cliente_nombre || cliente.nombre}</span>
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => setShowBuscadorCliente(true)} className="text-[#254153] hover:underline text-xs font-bold transition-colors">
                                                    Cambiar
                                                </button>
                                                <button onClick={() => setCliente(null)} className="p-1 hover:bg-[#f5f1ea]/50 text-[#749094] rounded-md transition-colors">
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            disabled={!canalVenta}
                                            onClick={() => setShowBuscadorCliente(true)}
                                            className="w-full p-3.5 bg-white border border-dashed border-[#e8e2d5] hover:border-[#254153] hover:bg-[#254153]/5 rounded-xl flex items-center justify-center gap-2 text-[#749094] hover:text-[#254153] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <Search className="w-4 h-4" />
                                            <span className="text-sm font-medium">{canalVenta ? 'Buscar Cliente...' : 'Seleccione canal primero'}</span>
                                        </button>
                                    )}

                                    {/* Toggle para habilitar Cliente Final */}
                                    {canalVenta && (
                                        <div className="pt-1.5 pl-1">
                                            <label className="flex items-center gap-2 cursor-pointer w-max group">
                                                <input
                                                    type="checkbox"
                                                    checked={llevaClienteFinal}
                                                    onChange={(e) => {
                                                        setLlevaClienteFinal(e.target.checked);
                                                        if (!e.target.checked) setClienteFinal(null);
                                                    }}
                                                    className="w-4 h-4 text-brand rounded border-slate-300 focus:ring-brand cursor-pointer"
                                                />
                                                <span className="text-xs font-bold text-[#749094] group-hover:text-[#254153] transition-colors">¿Este registro incluye Cliente Final?</span>
                                            </label>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Cliente Final (Solo si es eCommerce o el toggle está activo) */}
                            {(canalVenta === 'canal_propio_ecommerce' || (canalVenta && llevaClienteFinal)) && (
                                <div className="space-y-2">
                                    <label className="flex items-center gap-1.5 text-sm font-bold text-slate-700 ml-1">
                                        <Users className="w-4 h-4 text-slate-400" />
                                        Cliente Final
                                    </label>
                                    {clienteFinal ? (
                                        <div className="flex items-center justify-between w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                                            <span className="text-sm font-bold text-slate-700 truncate">{clienteFinal.contacto || clienteFinal.nombre_contacto || clienteFinal.cedula}</span>
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => setShowBuscadorClienteFinal(true)} className="text-brand hover:underline text-xs font-bold transition-colors">
                                                    Cambiar
                                                </button>
                                                <button onClick={() => setClienteFinal(null)} className="p-1 hover:bg-slate-200 text-slate-500 rounded-md transition-colors">
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => setShowBuscadorClienteFinal(true)}
                                            className="w-full p-3.5 bg-white border border-dashed border-[#e8e2d5] hover:border-[#254153] hover:bg-[#254153]/5 rounded-xl flex items-center justify-center gap-2 text-[#749094] hover:text-[#254153] transition-all"
                                        >
                                            <Search className="w-4 h-4" />
                                            <span className="text-sm font-medium">Buscar Cliente Final...</span>
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* Sección de Productos lado a lado */}
                            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
                                {/* Productos Compra */}
                                <div>
                                    {renderProductsList(
                                        "Productos de Compra", 
                                        <Package className="w-4 h-4" />,
                                        productosCompra, 
                                        setProductosCompra, 
                                        () => setShowBuscadorProductoCompra(true)
                                    )}
                                </div>

                                {/* Productos Novedad */}
                                <div>
                                    {renderProductsList(
                                        "Productos con Novedad", 
                                        <Sparkles className="w-4 h-4" />,
                                        productosNovedad, 
                                        setProductosNovedad, 
                                        () => setShowBuscadorProductoNovedad(true)
                                    )}
                                </div>
                            </div>

                            {/* Comentarios */}
                            <div className="md:col-span-2 space-y-2 mt-2">
                                <div className="flex items-center justify-between ml-1">
                                    <label className="flex items-center gap-1.5 text-sm font-bold text-slate-700">
                                        <MessageSquare className="w-4 h-4 text-[#749094]" /> Comentarios
                                    </label>
                                    <label className="flex items-center gap-1.5 text-xs font-bold text-brand cursor-pointer hover:text-brand/80 transition-colors">
                                        <Paperclip className="w-3.5 h-3.5" /> Adjuntar archivos
                                        <input 
                                            type="file" 
                                            multiple 
                                            className="hidden" 
                                            onChange={(e) => {
                                                if (e.target.files && e.target.files.length > 0) {
                                                    const newFiles = Array.from(e.target.files);
                                                    setArchivos(prev => [...prev, ...newFiles]);
                                                }
                                                // Retrasamos el reset para evitar problemas de compatibilidad
                                                setTimeout(() => {
                                                    if (e.target) e.target.value = '';
                                                }, 100);
                                            }} 
                                        />
                                    </label>
                                </div>
                                <textarea
                                    value={comentarios}
                                    onChange={(e) => setComentarios(e.target.value)}
                                    placeholder="Detalles adicionales de la solicitud..."
                                    className="w-full p-3.5 bg-white border border-[#e8e2d5] hover:border-[#749094]/40 focus:bg-white rounded-xl text-sm focus:outline-none focus:border-[#254153] focus:ring-[#254153]/20 focus:ring-2 transition-all min-h-[100px] resize-none custom-scrollbar text-[#1d1d1b]"
                                />
                                {archivos.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {archivos.map((file, idx) => (
                                            <div key={idx} className="flex items-center gap-2 bg-[#f5f1ea]/50 border border-[#e8e2d5] text-[#1d1d1b]/80 px-3 py-1.5 rounded-lg text-xs font-medium">
                                                <FileIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                <span className="truncate max-w-[150px]">{file.name}</span>
                                                <button
                                                    onClick={() => setArchivos(archivos.filter((_, i) => i !== idx))}
                                                    className="text-slate-400 hover:text-red-500 transition-colors ml-1"
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="p-6 bg-[#f5f1ea] border-t border-[#e8e2d5] flex items-center justify-end gap-3 shrink-0">
                        <button
                            onClick={onClose}
                            className="px-6 py-2.5 rounded-lg font-bold text-sm text-[#1d1d1b]/80 hover:bg-[#254153]/10 hover:text-[#254153] transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="flex items-center gap-2 bg-[#254153] text-white px-8 py-2.5 rounded-lg font-bold text-sm hover:bg-[#254153]/90 transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isSaving ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Guardando...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4" />
                                    Guardar Registro
                                </>
                            )}
                        </button>
                    </div>
                </motion.div>
            </motion.div>

            {/* Child Modals */}
            {showBuscadorCliente && canalVenta && canalVenta !== 'canal_propio_ecommerce' && (
                <BuscadorClientes
                    onClose={() => setShowBuscadorCliente(false)}
                    onSelect={(c) => {
                        setCliente(c);
                        setShowBuscadorCliente(false);
                    }}
                    canalVenta={canalVenta}
                />
            )}

            {showBuscadorClienteFinal && (
                <BuscadorClienteFinal
                    onClose={() => setShowBuscadorClienteFinal(false)}
                    onSelect={(c) => {
                        setClienteFinal(c);
                        setShowBuscadorClienteFinal(false);
                    }}
                />
            )}

            {showBuscadorProductoCompra && (
                <BuscadorProductos
                    onClose={() => setShowBuscadorProductoCompra(false)}
                    productosSeleccionados={productosCompra}
                    onAdd={(p) => setProductosCompra([...productosCompra, { ...p, cantidad: 1 }])}
                    onRemove={(idx) => {
                        const arr = [...productosCompra];
                        arr.splice(idx, 1);
                        setProductosCompra(arr);
                    }}
                />
            )}

            {showBuscadorProductoNovedad && (
                <BuscadorProductos
                    onClose={() => setShowBuscadorProductoNovedad(false)}
                    productosSeleccionados={productosNovedad}
                    onAdd={(p) => setProductosNovedad([...productosNovedad, { ...p, cantidad: 1 }])}
                    onRemove={(idx) => {
                        const arr = [...productosNovedad];
                        arr.splice(idx, 1);
                        setProductosNovedad(arr);
                    }}
                />
            )}
        </AnimatePresence>
    );
}
