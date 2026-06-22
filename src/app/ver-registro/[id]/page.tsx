'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';
import { 
    ArrowLeft, Loader2, FileText, Info, MessageSquare, Tag, 
    Calendar, User, Building2, UserCog, CheckCircle, Hash, Package, ShieldCheck, X, Pencil, Save, Plus, Trash2, Send
} from 'lucide-react';
import BuscadorProductos from '@/components/solicitar-servicio/BuscadorProductos';

type TabType = 'informacion' | 'comentarios' | 'clasificacion';

export default function VerRegistroPage() {
    const params = useParams();
    const router = useRouter();
    const [registro, setRegistro] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<TabType>('informacion');
    const [isProductosModalOpen, setIsProductosModalOpen] = useState(false);

    // Estados de edición
    const [isEditingProductos, setIsEditingProductos] = useState(false);
    const [editProductosCompra, setEditProductosCompra] = useState<any[]>([]);
    const [editProductosNovedad, setEditProductosNovedad] = useState<any[]>([]);
    const [isSavingProductos, setIsSavingProductos] = useState(false);
    
    // Estados de Buscadores
    const [showBuscadorProductoCompra, setShowBuscadorProductoCompra] = useState(false);
    const [showBuscadorProductoNovedad, setShowBuscadorProductoNovedad] = useState(false);

    useEffect(() => {
        if (params.id) fetchRegistro();
    }, [params.id]);

    const fetchRegistro = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('registro_solicitudes')
                .select(`
                    *,
                    Usuarios!registro_solicitudes_tratado_por_id_fkey(nombres, apellidos),
                    Ubicaciones:cliente_id(*),
                    Consumidores:cliente_final_id(*)
                `)
                .eq('id', params.id)
                .single();

            if (error) throw error;
            setRegistro(data);
        } catch (error) {
            console.error('Error fetching registro:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleEditModeToggle = () => {
        if (!isEditingProductos) {
            setEditProductosCompra(registro.productos_compra || []);
            setEditProductosNovedad(registro.productos_novedad || []);
            setIsEditingProductos(true);
        } else {
            setIsEditingProductos(false);
        }
    };

    const handleSaveProductos = async () => {
        setIsSavingProductos(true);
        try {
            const { error } = await supabase
                .from('registro_solicitudes')
                .update({
                    productos_compra: editProductosCompra,
                    productos_novedad: editProductosNovedad
                })
                .eq('id', registro.id);
            
            if (error) throw error;
            
            setRegistro({
                ...registro,
                productos_compra: editProductosCompra,
                productos_novedad: editProductosNovedad
            });
            setIsEditingProductos(false);
        } catch (error) {
            console.error("Error al guardar productos:", error);
            alert("Error al guardar los productos");
        } finally {
            setIsSavingProductos(false);
        }
    };

    const updateProduct = (type: 'compra' | 'novedad', index: number, field: string, value: any) => {
        if (type === 'compra') {
            const newArr = [...editProductosCompra];
            newArr[index] = { ...newArr[index], [field]: value };
            setEditProductosCompra(newArr);
        } else {
            const newArr = [...editProductosNovedad];
            newArr[index] = { ...newArr[index], [field]: value };
            setEditProductosNovedad(newArr);
        }
    };

    const removeProduct = (type: 'compra' | 'novedad', index: number) => {
        if (type === 'compra') {
            setEditProductosCompra(editProductosCompra.filter((_, i) => i !== index));
        } else {
            setEditProductosNovedad(editProductosNovedad.filter((_, i) => i !== index));
        }
    };

    const tabs = useMemo(() => [
        { id: 'informacion' as TabType, label: 'Información general', icon: Info },
        { id: 'comentarios' as TabType, label: 'Comentarios', icon: MessageSquare },
        { id: 'clasificacion' as TabType, label: 'Clasificación', icon: Tag },
    ], []);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#F1F5F9] flex flex-col items-center justify-center">
                <Loader2 className="w-10 h-10 text-brand animate-spin mb-4" />
                <p className="text-slate-500 font-medium">Cargando registro...</p>
            </div>
        );
    }

    if (!registro) {
        return (
            <div className="min-h-screen bg-[#F1F5F9] flex flex-col items-center justify-center p-4">
                <FileText className="w-16 h-16 text-slate-300 mb-4" />
                <h2 className="text-2xl font-bold text-slate-700 mb-2">Registro no encontrado</h2>
                <p className="text-slate-500 mb-6">El registro solicitado no existe o fue eliminado.</p>
                <button
                    onClick={() => router.push('/registro-solicitudes')}
                    className="px-6 py-2.5 bg-brand text-white font-bold rounded-xl shadow-lg shadow-brand/20 hover:scale-105 transition-all"
                >
                    Volver al listado
                </button>
            </div>
        );
    }

    const consecutivo = registro.consecutivo || `REG-${registro.id}`;
    const status = registro.estado || 'Abierto';

    return (
        <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-20">
            {/* Header Sticky */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-5">
                        <button
                            onClick={() => router.push('/registro-solicitudes')}
                            className="p-2.5 bg-white border border-slate-200 shadow-sm -ml-2 rounded-xl hover:bg-slate-50 hover:text-slate-900 transition-all text-slate-500 group"
                        >
                            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
                        </button>
                        <div className="flex items-center gap-4">
                            <div className="w-11 h-11 bg-slate-800 rounded-xl flex items-center justify-center text-white shadow-md hidden sm:flex">
                                <FileText className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-0.5">Registro de Servicio</p>
                                <h1 className="text-xl font-black text-slate-900 leading-none">
                                    {consecutivo}
                                </h1>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setIsProductosModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-sm transition-colors"
                        >
                            <Package className="w-4 h-4" />
                            Productos
                        </button>
                        <span className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest border ${status === 'Abierto' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                            {status}
                        </span>
                    </div>
                </div>

                {/* Tabs Navigation */}
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center gap-4 overflow-x-auto hide-scrollbar -mb-px pt-4">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`
                                        flex items-center gap-2 px-1 py-3 border-b-2 text-sm font-bold whitespace-nowrap transition-colors outline-none
                                        ${isActive 
                                            ? 'border-slate-800 text-slate-900' 
                                            : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                                        }
                                    `}
                                >
                                    <Icon className={`w-4 h-4 ${isActive ? 'text-slate-800' : 'text-slate-400'}`} />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                >
                    {activeTab === 'informacion' && <InformacionTab registro={registro} />}
                    {activeTab === 'comentarios' && <ComentariosTab registro={registro} />}
                    {activeTab === 'clasificacion' && <PlaceholderTab title="Clasificación" description="Aquí podrás gestionar la clasificación de este registro próximamente." icon={Tag} />}
                </motion.div>
            </main>

            {/* Modal de Productos */}
            {isProductosModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
                    {/* Backdrop */}
                    <div 
                        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
                        onClick={() => setIsProductosModalOpen(false)}
                    />
                    
                    {/* Modal Content */}
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center justify-between p-6 border-b border-slate-100">
                            <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 flex items-center gap-2">
                                <Package className="w-5 h-5 text-slate-400" />
                                Registro de Productos
                                {isEditingProductos && <span className="text-brand ml-2 text-xs font-bold">(Modo Edición)</span>}
                            </h3>
                            <div className="flex items-center gap-2">
                                {!isEditingProductos ? (
                                    <button onClick={handleEditModeToggle} className="flex items-center gap-2 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
                                        <Pencil className="w-3.5 h-3.5" /> Editar
                                    </button>
                                ) : (
                                    <>
                                        <button onClick={handleEditModeToggle} className="px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-slate-500 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50" disabled={isSavingProductos}>Cancelar</button>
                                        <button onClick={handleSaveProductos} disabled={isSavingProductos} className="flex items-center gap-2 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-white bg-slate-800 hover:bg-slate-900 rounded-lg shadow-md transition-all disabled:opacity-50">
                                            {isSavingProductos ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Guardar
                                        </button>
                                    </>
                                )}
                                <div className="w-px h-6 bg-slate-200 mx-2"></div>
                                <button 
                                    onClick={() => setIsProductosModalOpen(false)}
                                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        <div className="p-6 overflow-y-auto bg-slate-50">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Productos de Compra */}
                                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                                    <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
                                            Productos de Compra
                                        </h4>
                                        {isEditingProductos && (
                                            <button onClick={() => setShowBuscadorProductoCompra(true)} className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-brand hover:text-brand/80">
                                                <Plus className="w-3 h-3" /> Añadir
                                            </button>
                                        )}
                                    </div>
                                    
                                    {(!isEditingProductos ? (registro.productos_compra || []) : editProductosCompra).length > 0 ? (
                                        <ul className="space-y-3">
                                            {(!isEditingProductos ? (registro.productos_compra || []) : editProductosCompra).map((prod: any, idx: number) => (
                                                <li key={idx} className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                                                    {isEditingProductos ? (
                                                        <div className="flex items-start gap-3">
                                                            <div className="w-14 shrink-0">
                                                                <label className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-1 block">Cant.</label>
                                                                <input type="number" min="1" value={prod.cantidad || 1} onChange={(e) => updateProduct('compra', idx, 'cantidad', parseInt(e.target.value)||1)} className="w-full bg-white border border-slate-200 rounded-md p-1.5 text-xs font-bold text-center outline-none focus:border-slate-400" />
                                                            </div>
                                                            <div className="flex-1 space-y-2">
                                                                <div>
                                                                    <label className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-1 block">Referencia</label>
                                                                    <div className="w-full bg-slate-100 border border-slate-200 rounded-md p-1.5 text-xs font-bold text-slate-600 cursor-not-allowed">
                                                                        {prod.referencia || prod.codigo || prod.sku || 'Sin Referencia'}
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <label className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-1 block">Descripción</label>
                                                                    <div className="w-full bg-slate-100 border border-slate-200 rounded-md p-1.5 text-xs text-slate-600 cursor-not-allowed">
                                                                        {prod.descripcion || prod.nombre || 'Producto Genérico'}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <button onClick={() => removeProduct('compra', idx)} className="mt-5 p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors shrink-0">
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-start gap-4">
                                                            <div className="w-10 h-10 bg-white text-slate-600 border border-slate-200 rounded-lg flex flex-col items-center justify-center shrink-0 shadow-sm">
                                                                <span className="text-[9px] font-bold uppercase leading-none opacity-50 mb-0.5">CANT</span>
                                                                <span className="font-bold text-sm leading-none">{prod.cantidad || 1}</span>
                                                            </div>
                                                            <div className="min-w-0 pt-0.5">
                                                                <p className="text-xs font-bold text-slate-900 truncate" title={prod.referencia || prod.codigo || prod.sku}>{prod.referencia || prod.codigo || prod.sku || 'Sin Referencia'}</p>
                                                                <p className="text-[11px] text-slate-600 mt-0.5 line-clamp-2" title={prod.descripcion || prod.nombre}>{prod.descripcion || prod.nombre || 'Producto Genérico'}</p>
                                                            </div>
                                                        </div>
                                                    )}
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center p-8 bg-slate-50 border border-slate-200 border-dashed rounded-lg">
                                            <Package className="w-6 h-6 text-slate-300 mb-2" />
                                            <p className="text-xs text-slate-500">No hay compras registradas</p>
                                        </div>
                                    )}
                                </div>

                                {/* Productos Novedad */}
                                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                                    <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
                                            Productos con Novedad
                                        </h4>
                                        {isEditingProductos && (
                                            <button onClick={() => setShowBuscadorProductoNovedad(true)} className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-brand hover:text-brand/80">
                                                <Plus className="w-3 h-3" /> Añadir
                                            </button>
                                        )}
                                    </div>
                                    
                                    {(!isEditingProductos ? (registro.productos_novedad || []) : editProductosNovedad).length > 0 ? (
                                        <ul className="space-y-3">
                                            {(!isEditingProductos ? (registro.productos_novedad || []) : editProductosNovedad).map((prod: any, idx: number) => (
                                                <li key={idx} className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                                                    {isEditingProductos ? (
                                                        <div className="flex items-start gap-3">
                                                            <div className="w-14 shrink-0">
                                                                <label className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-1 block">Cant.</label>
                                                                <input type="number" min="1" value={prod.cantidad || 1} onChange={(e) => updateProduct('novedad', idx, 'cantidad', parseInt(e.target.value)||1)} className="w-full bg-white border border-slate-200 rounded-md p-1.5 text-xs font-bold text-center outline-none focus:border-slate-400" />
                                                            </div>
                                                            <div className="flex-1 space-y-2">
                                                                <div>
                                                                    <label className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-1 block">Referencia</label>
                                                                    <div className="w-full bg-slate-100 border border-slate-200 rounded-md p-1.5 text-xs font-bold text-slate-600 cursor-not-allowed">
                                                                        {prod.referencia || prod.codigo || prod.sku || 'Sin Referencia'}
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <label className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-1 block">Descripción</label>
                                                                    <div className="w-full bg-slate-100 border border-slate-200 rounded-md p-1.5 text-xs text-slate-600 cursor-not-allowed">
                                                                        {prod.descripcion || prod.nombre || 'Producto Genérico'}
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <label className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-1 block">Comentario (Opcional)</label>
                                                                    <textarea value={prod.comentarios || ''} onChange={(e) => updateProduct('novedad', idx, 'comentarios', e.target.value)} className="w-full bg-white border border-slate-200 rounded-md p-1.5 text-xs outline-none focus:border-slate-400 resize-none h-16" placeholder="Detalle de la novedad..." />
                                                                </div>
                                                            </div>
                                                            <button onClick={() => removeProduct('novedad', idx)} className="mt-5 p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors shrink-0">
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-start gap-4">
                                                            <div className="w-10 h-10 bg-slate-800 text-white shadow-sm rounded-lg flex flex-col items-center justify-center shrink-0">
                                                                <span className="text-[9px] font-bold uppercase leading-none opacity-70 mb-0.5">CANT</span>
                                                                <span className="font-bold text-sm leading-none">{prod.cantidad || 1}</span>
                                                            </div>
                                                            <div className="min-w-0 pt-0.5 flex-1">
                                                                <p className="text-xs font-bold text-slate-900 truncate" title={prod.referencia || prod.codigo || prod.sku}>{prod.referencia || prod.codigo || prod.sku || 'Sin Referencia'}</p>
                                                                <p className="text-[11px] text-slate-600 mt-0.5 line-clamp-2" title={prod.descripcion || prod.nombre}>{prod.descripcion || prod.nombre || 'Producto Genérico'}</p>
                                                                {prod.comentarios && (
                                                                    <div className="mt-3 bg-white shadow-sm rounded-md p-3 border border-slate-200 relative">
                                                                        <MessageSquare className="w-3 h-3 text-slate-400 absolute top-3 right-3" />
                                                                        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-1">Comentario</p>
                                                                        <p className="text-xs text-slate-700">"{prod.comentarios}"</p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center p-8 bg-slate-50 border border-slate-200 border-dashed rounded-lg">
                                            <ShieldCheck className="w-6 h-6 text-slate-300 mb-2" />
                                            <p className="text-xs text-slate-500">Sin novedades reportadas</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Buscadores de Productos */}
            {showBuscadorProductoCompra && (
                <BuscadorProductos
                    onClose={() => setShowBuscadorProductoCompra(false)}
                    productosSeleccionados={editProductosCompra}
                    onAdd={(p) => setEditProductosCompra([...editProductosCompra, { ...p, cantidad: 1 }])}
                    onRemove={(idx) => {
                        const arr = [...editProductosCompra];
                        arr.splice(idx, 1);
                        setEditProductosCompra(arr);
                    }}
                />
            )}

            {showBuscadorProductoNovedad && (
                <BuscadorProductos
                    onClose={() => setShowBuscadorProductoNovedad(false)}
                    productosSeleccionados={editProductosNovedad}
                    onAdd={(p) => setEditProductosNovedad([...editProductosNovedad, { ...p, cantidad: 1 }])}
                    onRemove={(idx) => {
                        const arr = [...editProductosNovedad];
                        arr.splice(idx, 1);
                        setEditProductosNovedad(arr);
                    }}
                />
            )}
        </div>
    );
}

// ----------------------------------------------------------------------
// Componente de Pestaña: Comentarios
// ----------------------------------------------------------------------
function ComentariosTab({ registro }: { registro: any }) {
    const [comentarios, setComentarios] = useState<any[]>([]);
    const [nuevoComentario, setNuevoComentario] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (registro?.consecutivo) {
            fetchComentarios();
        }
    }, [registro?.consecutivo]);

    const fetchComentarios = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('Comentarios_RegistroMAC')
                .select(`
                    *,
                    Usuarios!fk_autor(nombres, apellidos)
                `)
                .eq('numero_radicado', registro.consecutivo)
                .order('created_at', { ascending: true });

            if (error) throw error;
            setComentarios(data || []);
        } catch (error) {
            console.error('Error fetching comentarios:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddComentario = async () => {
        if (!nuevoComentario.trim()) return;
        setIsSubmitting(true);
        try {
            const userRes = await supabase.auth.getUser();
            const authId = userRes.data?.user?.id;
            
            if (!authId) throw new Error("No autenticado");

            const { data: userData } = await supabase.from('Usuarios').select('id').eq('user_id', authId).single();
            if (!userData) throw new Error("Usuario no encontrado en la base de datos");

            const { error } = await supabase
                .from('Comentarios_RegistroMAC')
                .insert({
                    numero_radicado: registro.consecutivo,
                    autor: userData.id,
                    comentario: nuevoComentario.trim()
                });

            if (error) throw error;
            
            setNuevoComentario('');
            fetchComentarios();
        } catch (error) {
            console.error('Error adding comentario:', error);
            alert("Error al agregar el comentario");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[600px]">
            {/* Cabecera */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600">
                        <MessageSquare className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-slate-900">Historial de Comentarios</h3>
                        <p className="text-[11px] font-medium text-slate-500 uppercase tracking-widest mt-0.5">Discusión del caso</p>
                    </div>
                </div>
                <div className="text-xs font-bold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                    {comentarios.length} {comentarios.length === 1 ? 'Mensaje' : 'Mensajes'}
                </div>
            </div>

            {/* Lista de Comentarios */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50 custom-scrollbar space-y-6">
                {loading ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400">
                        <Loader2 className="w-8 h-8 animate-spin mb-3 text-brand" />
                        <p className="text-sm font-medium">Cargando comentarios...</p>
                    </div>
                ) : comentarios.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400">
                        <MessageSquare className="w-12 h-12 mb-3 opacity-20" />
                        <p className="text-sm font-medium">No hay comentarios aún.</p>
                        <p className="text-xs mt-1 opacity-70">Sé el primero en escribir algo sobre este registro.</p>
                    </div>
                ) : (
                    comentarios.map((comentario, index) => {
                        const autorNombre = comentario.Usuarios 
                            ? `${comentario.Usuarios.nombres || ''} ${comentario.Usuarios.apellidos || ''}`.trim() 
                            : 'Usuario Desconocido';
                        
                        return (
                            <div key={comentario.id || index} className="flex gap-4">
                                <div className="w-10 h-10 bg-gradient-to-br from-brand to-blue-800 rounded-full flex items-center justify-center shrink-0 shadow-md">
                                    <span className="text-white font-black text-xs">
                                        {autorNombre.charAt(0).toUpperCase()}
                                    </span>
                                </div>
                                <div className="flex-1 space-y-1.5">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-black text-slate-800">{autorNombre}</span>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                            {new Date(comentario.created_at).toLocaleString('es-CO', { 
                                                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                                            })}
                                        </span>
                                    </div>
                                    <div className="bg-white border border-slate-200 p-4 rounded-2xl rounded-tl-none shadow-sm text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                                        {comentario.comentario || 'Sin contenido'}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Input para Nuevo Comentario */}
            <div className="p-4 bg-white border-t border-slate-200 shrink-0">
                <div className="flex items-end gap-3 bg-slate-50 border border-slate-200 p-2 rounded-2xl focus-within:border-brand focus-within:ring-1 focus-within:ring-brand transition-all">
                    <textarea 
                        value={nuevoComentario}
                        onChange={(e) => setNuevoComentario(e.target.value)}
                        placeholder="Escribe un comentario..."
                        className="flex-1 bg-transparent p-2 text-sm text-slate-800 focus:outline-none resize-none min-h-[44px] max-h-32 custom-scrollbar"
                        rows={1}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleAddComentario();
                            }
                        }}
                    />
                    <button 
                        onClick={handleAddComentario}
                        disabled={!nuevoComentario.trim() || isSubmitting}
                        className="w-11 h-11 flex items-center justify-center bg-brand text-white rounded-xl shadow-md hover:bg-brand/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                    >
                        {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 ml-1" />}
                    </button>
                </div>
                <p className="text-[10px] text-slate-400 font-medium text-center mt-2 uppercase tracking-widest">
                    Presiona Enter para enviar, Shift + Enter para salto de línea
                </p>
            </div>
        </div>
    );
}

// ----------------------------------------------------------------------
// Componente de Pestaña: Clasificación
// ----------------------------------------------------------------------
function InformacionTab({ registro }: { registro: any }) {
    
    // Preparar campos derivados
    const tratadoPor = registro.Usuarios 
        ? `${registro.Usuarios.nombres || ''} ${registro.Usuarios.apellidos || ''}`.trim() || 'Usuario'
        : (registro.tratado_por_id ? `Usuario ID: ${registro.tratado_por_id}` : 'N/A');

    let dateStr = 'Sin fecha';
    if (registro.created_at) {
        try {
            dateStr = new Date(registro.created_at).toLocaleString();
        } catch(e) {}
    }

    const ubi = registro.Ubicaciones || {};
    const cons = registro.Consumidores || {};

    const canalVentaFormat = registro.canal_venta ? registro.canal_venta.replace(/_/g, ' ').toUpperCase() : 'N/A';

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Columna Izquierda: Datos Básicos */}
            <div className="lg:col-span-2 space-y-6">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 sm:p-8">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2 border-b border-slate-100 pb-4">
                        <Info className="w-4 h-4 text-slate-500" />
                        Detalles Principales
                    </h3>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <InfoField label="Consecutivo" value={registro.consecutivo || 'N/A'} icon={Hash} />
                        <InfoField label="Fecha de Solicitud" value={dateStr} icon={Calendar} />
                        <InfoField label="Tratado Por" value={tratadoPor} icon={UserCog} />
                        <InfoField label="Tipo de Solicitud" value={registro.tipo_solicitud || 'N/A'} icon={Tag} />
                        <InfoField label="Canal de Venta" value={canalVentaFormat} icon={Building2} />
                        <InfoField label="Orden de Venta" value={registro.orden_venta ? registro.orden_venta.toString() : 'N/A'} icon={FileText} />
                    </div>
                </div>
            </div>

            {/* Columna Derecha: Clientes */}
            <div className="space-y-6">
                
                {/* Datos del Canal de Venta / Distribuidor */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 sm:p-8 hover:border-slate-300 transition-colors">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-6 flex items-center gap-2 border-b border-slate-100 pb-3">
                        <Building2 className="w-3.5 h-3.5" />
                        {registro.canal_venta === 'canal_propio_ecommerce' ? 'Datos del Canal (Propio)' : 'Datos del Canal de Venta'}
                    </h3>
                    
                    <div className="space-y-5">
                        <div>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Nombre</span>
                            <span className="text-sm font-semibold text-slate-900">
                                {registro.canal_venta === 'canal_propio_ecommerce' 
                                    ? 'Firplak / Ecommerce'
                                    : registro.cliente_nombre || 'N/A'}
                            </span>
                        </div>
                        {registro.canal_venta !== 'canal_propio_ecommerce' && (
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Ciudad</span>
                                    <span className="text-xs font-medium text-slate-600">{ubi.ciudad || '---'}</span>
                                </div>
                                <div>
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Teléfono</span>
                                    <span className="text-xs font-medium text-slate-600">{ubi.telefono1 || ubi.telefono || ubi.celular || '---'}</span>
                                </div>
                                <div className="col-span-2">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Dirección</span>
                                    <span className="text-xs font-medium text-slate-600">{ubi.direccion || '---'}</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Datos del Cliente Final */}
                {registro.cliente_final_id && (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 sm:p-8 hover:border-slate-300 transition-colors">
                        <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-6 flex items-center gap-2 border-b border-slate-100 pb-3">
                            <User className="w-3.5 h-3.5" />
                            Datos del Cliente Final
                        </h3>
                        
                        <div className="space-y-5">
                            <div>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Nombre</span>
                                <span className="text-sm font-semibold text-slate-900">{registro.cliente_final_nombre || 'N/A'}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Ciudad</span>
                                    <span className="text-xs font-medium text-slate-600">{cons.ciudad || '---'}</span>
                                </div>
                                <div>
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Teléfono</span>
                                    <span className="text-xs font-medium text-slate-600">{cons.celular || cons.telefono1 || cons.telefono || '---'}</span>
                                </div>
                                <div className="col-span-2">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Dirección</span>
                                    <span className="text-xs font-medium text-slate-600">{cons.direccion || '---'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}

// ----------------------------------------------------------------------
// Componentes Auxiliares
// ----------------------------------------------------------------------

function InfoField({ label, value, icon: Icon }: { label: string, value: string, icon: any }) {
    return (
        <div className="flex gap-4 items-center p-3 rounded-lg border border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-slate-100 transition-colors">
            <div className="w-10 h-10 rounded-md bg-white border border-slate-200 flex items-center justify-center text-slate-600 shrink-0">
                <Icon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-0.5">{label}</p>
                <p className="text-sm font-semibold text-slate-900 truncate" title={value}>{value}</p>
            </div>
        </div>
    );
}

function PlaceholderTab({ title, description, icon: Icon }: { title: string, description: string, icon: any }) {
    return (
        <div className="bg-white rounded-2xl p-12 border border-dashed border-slate-300 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                <Icon className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="text-lg font-bold text-slate-700 mb-2">Pestaña de {title}</h3>
            <p className="text-slate-500 max-w-md">{description}</p>
            <span className="mt-6 px-4 py-1.5 bg-brand/10 text-brand rounded-full text-xs font-black uppercase tracking-widest">
                Próximamente
            </span>
        </div>
    );
}
