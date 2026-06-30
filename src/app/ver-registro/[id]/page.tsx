'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';
import { 
    ArrowLeft, Loader2, FileText, Info, MessageSquare, Tag, 
    Calendar, User, Building2, UserCog, CheckCircle, Hash, Package, ShieldCheck, X, Pencil, Save, Plus, Trash2, Send, Paperclip, ExternalLink
} from 'lucide-react';
import BuscadorProductos from '@/components/solicitar-servicio/BuscadorProductos';
import BuscadorClientes from '@/components/solicitar-servicio/BuscadorClientes';
import BuscadorClienteFinal from '@/components/solicitar-servicio/BuscadorClienteFinal';
import ModalCrearClienteFinal from '@/components/base-de-datos/ModalCrearClienteFinal';
import ModalEditarUbicacion from '@/components/solicitar-servicio/ModalEditarUbicacion';

type TabType = 'informacion' | 'comentarios' | 'clasificacion' | 'servicios';

export default function VerRegistroPage() {
    const params = useParams();
    const router = useRouter();
    const [registro, setRegistro] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<TabType>('informacion');
    const [isProductosModalOpen, setIsProductosModalOpen] = useState(false);

    // Estados de edición Productos
    const [isEditingProductos, setIsEditingProductos] = useState(false);
    const [editProductosCompra, setEditProductosCompra] = useState<any[]>([]);
    const [editProductosNovedad, setEditProductosNovedad] = useState<any[]>([]);
    const [isSavingProductos, setIsSavingProductos] = useState(false);
    
    // Estado de Creacion de Servicio
    const [isCreatingService, setIsCreatingService] = useState(false);
    
    // Estados de edición Clasificación
    
    // Estados de Buscadores
    const [showBuscadorProductoCompra, setShowBuscadorProductoCompra] = useState(false);
    const [showBuscadorProductoNovedad, setShowBuscadorProductoNovedad] = useState(false);

    // Listas globales para clasificación
    const [razonesQueja, setRazonesQueja] = useState<any[]>([]);
    const [responsableQueja, setResponsableQueja] = useState<any[]>([]);
    const [usuariosList, setUsuariosList] = useState<any[]>([]);

    useEffect(() => {
        if (params.id) fetchRegistro();
        fetchGlobalOptions();
    }, [params.id]);

    const fetchGlobalOptions = async () => {
        try {
            const [resRazones, resResp, resVend] = await Promise.all([
                supabase.from('razones_queja').select('*').order('razon'),
                supabase.from('responsable_queja').select('*').order('responsable'),
                supabase.from('Usuarios').select('id, display_name, nombres, apellidos, rol').order('display_name')
            ]);
            if (resRazones.data) setRazonesQueja(resRazones.data);
            if (resResp.data) setResponsableQueja(resResp.data);
            if (resVend.data) setUsuariosList(resVend.data);
        } catch (e) {
            console.error(e);
        }
    };

    const fetchRegistro = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('registro_solicitudes')
                .select(`
                    *,
                    Usuarios!registro_solicitudes_tratado_por_id_fkey(nombres, apellidos),
                    Ubicaciones:cliente_id(*, ciudades:ciudad_id(ciudad, zona_id)),
                    Consumidores:cliente_final_id(*, ciudades:ciudad_id(ciudad, zona_id))
                `)
                .eq('id', params.id)
                .single();

            if (error) throw error;
            setRegistro(data);
        } catch (error) {
            console.error('Error fetching registro:', error);
            setRegistro(null);
        } finally {
            setLoading(false);
        }
    };

    const handleSolicitarServicio = async () => {
        if (!registro) return;
        
        try {
            setIsCreatingService(true);
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                alert("Debes iniciar sesión para crear un servicio.");
                return;
            }

            const { data: currentUser } = await supabase
                .from('Usuarios')
                .select('*')
                .eq('user_id', session.user.id)
                .single();

            const nom = (currentUser?.nombres || '').substring(0, 3);
            const ape = (currentUser?.apellidos || '').substring(0, 3);
            
            let mappedTipoServicio = 'garantia_sin_pedido';
            if (registro.tipo_solicitud) {
                const reqType = registro.tipo_solicitud.toLowerCase();
                if (reqType.includes('garantia') || reqType.includes('reclamo')) {
                    mappedTipoServicio = 'garantia_sin_pedido';
                } else if (reqType.includes('instalacion') || reqType.includes('visita')) {
                    mappedTipoServicio = 'instalacion';
                }
            }
            
            const tipoShort = mappedTipoServicio.substring(0, 4);
            const tipoFormatted = tipoShort.charAt(0).toUpperCase() + tipoShort.slice(1).toLowerCase();
            const randomSuffix = Math.floor(10000 + Math.random() * 90000).toString();
            
            let consecutivo = `${nom}${ape}${tipoFormatted}${randomSuffix}`;
            
            if (mappedTipoServicio === 'reparacion_y_mantenimiento_(facturado)') {
                consecutivo = `F${consecutivo}`;
            }

            let finalCoordinadorId = null;
            const ubi = registro.Ubicaciones || {};
            const cons = registro.Consumidores || {};
            let zoneId = cons?.ciudades?.zona_id || ubi?.ciudades?.zona_id;
            
            if (!zoneId && (registro.canal_venta === 'canal_propio_ecommerce' || registro.canal_venta === 'ecommerce')) {
                zoneId = 985;
            }
            
            if (zoneId) {
                const { data: zonaData } = await supabase.from('Zonas').select('coordinador_id').eq('id', zoneId).single();
                if (zonaData) {
                    finalCoordinadorId = zonaData.coordinador_id;
                }
            }
            
            if (!finalCoordinadorId) {
                finalCoordinadorId = cons?.coordinador_id || cons?.coordinadorId || ubi?.coordinador_id || ubi?.coordinadorId || null;
            }

            const { data: servicioData, error: servicioError } = await supabase
                .from('Servicios')
                .insert({
                    consecutivo: consecutivo,
                    comercial_id: registro.vendedor_id || currentUser?.id,
                    consumidor_id: registro.cliente_final_id,
                    estado: true,
                    ubicacion_id: registro.cliente_id,
                    coordinador_id: finalCoordinadorId,
                    tipo_de_servicio: mappedTipoServicio,
                    canal_de_venta: registro.canal_venta || 'retail',
                    creado_desde: 'supabase',
                    asesor_mac_id: registro.asesor_mac_id || currentUser?.id,
                    numero_de_pedido: registro.orden_venta || '',
                    sharepoint_uid: crypto.randomUUID(),
                    decision_cliente: 'No aplica',
                    aplica_tecnico: true,
                    facturado: false
                })
                .select()
                .single();
                
            if (servicioError) throw servicioError;
            
            const primerComentario = `Viene desde la solicitud ${registro.consecutivo || 'REG-' + registro.id}`;
            await supabase.from('Comentarios').insert({
                servicio_id: servicioData.id,
                contenido: primerComentario,
                usuario_id: currentUser?.id,
                tipo: 'solicitud_servicio',
                documentos: []
            });
            
            if (registro.productos_novedad && Array.isArray(registro.productos_novedad) && registro.productos_novedad.length > 0) {
                const productosToInsert = registro.productos_novedad.map((p: any) => ({
                    servicio_id: servicioData.id,
                    producto_id: p.producto_id || p.id,
                    cantidad: p.cantidad || 1
                }));
                await supabase.from('productos_servicios').insert(productosToInsert);
            }
            
            const existing = registro.servicio_creado_consecutivo || '';
            const newConsecutivos = existing ? `${existing}, ${servicioData.consecutivo}` : servicioData.consecutivo;

            const { error: updateError } = await supabase
                .from('registro_solicitudes')
                .update({ servicio_creado_consecutivo: newConsecutivos })
                .eq('id', registro.id);
                
            if (updateError) {
                console.error("No se pudo guardar el consecutivo en registro_solicitudes:", updateError);
                alert(`Servicio creado con consecutivo ${servicioData.consecutivo}, pero no se pudo vincular al registro.`);
            } else {
                alert(`Servicio ${servicioData.consecutivo} creado correctamente.`);
            }
            
            fetchRegistro();
            
        } catch (error: any) {
            console.error(error);
            alert("Error al crear servicio: " + error.message);
        } finally {
            setIsCreatingService(false);
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
        { id: 'servicios' as TabType, label: 'Servicios Enlazados', icon: FileText },
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
                        <select
                            value={registro.prioridad || 'Media'}
                            onChange={async (e) => {
                                const newPrioridad = e.target.value;
                                try {
                                    const { error } = await supabase.from('registro_solicitudes').update({ prioridad: newPrioridad }).eq('id', registro.id);
                                    if (error) throw error;
                                    setRegistro((prev: any) => ({ ...prev, prioridad: newPrioridad }));
                                } catch (error) {
                                    console.error('Error updating prioridad:', error);
                                    alert('Error al actualizar la prioridad');
                                }
                            }}
                            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-widest border outline-none cursor-pointer transition-colors shadow-sm text-center appearance-none
                                ${registro.prioridad === 'Alta' ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100' : 
                                  registro.prioridad === 'Baja' ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100' : 
                                  'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'}`}
                        >
                            <option value="Alta">Prioridad: Alta</option>
                            <option value="Media">Prioridad: Media</option>
                            <option value="Baja">Prioridad: Baja</option>
                        </select>
                        <button
                            onClick={handleSolicitarServicio}
                            disabled={isCreatingService}
                            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest border border-brand bg-brand text-white shadow-sm transition-colors ${
                                isCreatingService ? 'opacity-50 cursor-not-allowed' : 'hover:bg-brand-600'
                            }`}
                        >
                            {isCreatingService ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                            {isCreatingService ? 'CREANDO...' : 'SOLICITAR SERVICIO'}
                        </button>
                        <button
                            onClick={() => setIsProductosModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-sm transition-colors"
                        >
                            <Package className="w-4 h-4" />
                            Productos
                        </button>
                        <button
                            onClick={async () => {
                                const isCurrentlyClosed = registro.cerrada || registro.estado === 'Cerrado';
                                
                                if (!isCurrentlyClosed) {
                                    const missingFields = [];
                                    if (!registro.orden_venta || String(registro.orden_venta).trim() === '') missingFields.push('Orden de Venta (OV)');
                                    if (!registro.asesor_mac_id) missingFields.push('Asesor MAC');
                                    if (!registro.cliente_id && !registro.cliente_final_id) missingFields.push('Datos de Cliente');
                                    if (!registro.vendedor_id) missingFields.push('Vendedor');
                                    if (!registro.fecha_verificacion) missingFields.push('Fecha de Verificación');
                                    if (registro.valor_servicio === null || registro.valor_servicio === undefined || String(registro.valor_servicio).trim() === '') missingFields.push('Valor Servicio');
                                    if (registro.valor_flete === null || registro.valor_flete === undefined || String(registro.valor_flete).trim() === '') missingFields.push('Valor Flete');
                                    if (registro.valor_producto === null || registro.valor_producto === undefined || String(registro.valor_producto).trim() === '') missingFields.push('Valor Producto');

                                    // Validar Comentarios
                                    const { count, error: commentsError } = await supabase.from('Comentarios_RegistroMAC')
                                        .select('*', { count: 'exact', head: true })
                                        .eq('numero_radicado', registro.consecutivo || `REG-${registro.id}`);
                                    
                                    if (commentsError || count === 0) {
                                        missingFields.push('Comentarios (debe tener al menos uno)');
                                    }

                                    // Validar Productos, Defectos y Responsables
                                    const productos = registro.productos_novedad || [];
                                    if (productos.length === 0) {
                                        missingFields.push('Productos con Novedad (al menos uno)');
                                    } else {
                                        let hasProductError = false;
                                        for (const prod of productos) {
                                            if (!prod.problemas || prod.problemas.length === 0) {
                                                hasProductError = true;
                                                break;
                                            }
                                            for (const prob of prod.problemas) {
                                                if (!prob.tipo_problema_id || !prob.responsable_problema_id) {
                                                    hasProductError = true;
                                                    break;
                                                }
                                            }
                                        }
                                        if (hasProductError) {
                                            missingFields.push('Defecto y Responsable por cada Producto');
                                        }
                                    }

                                    if (missingFields.length > 0) {
                                        alert('No se puede cerrar la solicitud. Faltan los siguientes campos obligatorios:\n\n- ' + missingFields.join('\n- '));
                                        return;
                                    }
                                }

                                const newCerrada = !isCurrentlyClosed;
                                const newEstado = newCerrada ? 'Cerrado' : 'Abierto';
                                try {
                                    const { error } = await supabase.from('registro_solicitudes').update({ cerrada: newCerrada, estado: newEstado }).eq('id', registro.id);
                                    if (error) throw error;
                                    setRegistro((prev: any) => ({ ...prev, cerrada: newCerrada, estado: newEstado }));
                                } catch (error) {
                                    console.error('Error toggling state:', error);
                                    alert('Error al cambiar el estado de la solicitud');
                                }
                            }}
                            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest border transition-colors shadow-sm
                                ${registro.cerrada || registro.estado === 'Cerrado' ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' : 'bg-slate-800 text-white border-slate-700 hover:bg-slate-700'}`}
                        >
                            {registro.cerrada || registro.estado === 'Cerrado' ? <CheckCircle className="w-4 h-4" /> : <X className="w-4 h-4" />}
                            {registro.cerrada || registro.estado === 'Cerrado' ? 'Reabrir' : 'Cerrar'}
                        </button>
                        <span className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest border ${registro.cerrada || registro.estado === 'Cerrado' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                            {registro.cerrada || registro.estado === 'Cerrado' ? 'Cerrado' : 'Abierto'}
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
                    {activeTab === 'informacion' && <InformacionTab registro={registro} usuariosList={usuariosList} onRefresh={() => fetchRegistro()} router={router} />}
                    {activeTab === 'comentarios' && <ComentariosTab registro={registro} />}
                    {activeTab === 'clasificacion' && (
                        <ClasificacionTab 
                            registro={registro} 
                            usuariosList={usuariosList} 
                            razonesQueja={razonesQueja} 
                            responsableQueja={responsableQueja} 
                            onRefresh={() => fetchRegistro()} 
                        />
                    )}
                    {activeTab === 'servicios' && <ServiciosEnlazadosTab registro={registro} />}
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
    const [archivos, setArchivos] = useState<File[]>([]);
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
                .order('created_at', { ascending: false });

            if (error) throw error;
            setComentarios(data || []);
        } catch (error) {
            console.error('Error fetching comentarios:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddComentario = async () => {
        if (!nuevoComentario.trim() && archivos.length === 0) return;
        setIsSubmitting(true);
        try {
            const userRes = await supabase.auth.getUser();
            const authId = userRes.data?.user?.id;
            
            if (!authId) throw new Error("No autenticado");

            const { data: userData } = await supabase.from('Usuarios').select('id').eq('user_id', authId).single();
            if (!userData) throw new Error("Usuario no encontrado en la base de datos");

            const uploadedUrls = [];

            if (archivos.length > 0) {
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

                    const folderPath = sanitizePath(String(registro.consecutivo || `REG-${registro.id}`));
                    const filePath = `registrosMAC/${folderPath}/comentarios/${fileName}`;

                    const { error: uploadError } = await supabase.storage
                        .from('servicios')
                        .upload(filePath, file);

                    if (uploadError) throw uploadError;

                    const { data: { publicUrl } } = supabase.storage
                        .from('servicios')
                        .getPublicUrl(filePath);

                    uploadedUrls.push({ url: publicUrl, name: file.name, type: file.type });
                }
            }

            const { error } = await supabase
                .from('Comentarios_RegistroMAC')
                .insert({
                    numero_radicado: registro.consecutivo,
                    autor: userData.id,
                    comentario: nuevoComentario.trim(),
                    adjuntos: uploadedUrls
                });

            if (error) throw error;
            
            setNuevoComentario('');
            setArchivos([]);
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
                                        {comentario.comentario || ''}
                                        {comentario.adjuntos && comentario.adjuntos.length > 0 && (
                                            <div className={`flex flex-wrap gap-2 ${comentario.comentario ? 'mt-3 pt-3 border-t border-slate-100' : ''}`}>
                                                {comentario.adjuntos.map((adjunto: any, i: number) => {
                                                    const isImage = adjunto.type?.startsWith('image/');
                                                    const isVideo = adjunto.type?.startsWith('video/');
                                                    if (isImage) {
                                                        return (
                                                            <a key={i} href={adjunto.url} target="_blank" rel="noreferrer" className="block w-24 h-24 rounded-lg overflow-hidden border border-slate-200 hover:opacity-80 transition-opacity shrink-0">
                                                                <img src={adjunto.url} alt={adjunto.name} className="w-full h-full object-cover bg-slate-50" />
                                                            </a>
                                                        );
                                                    }
                                                    if (isVideo) {
                                                        return (
                                                            <a key={i} href={adjunto.url} target="_blank" rel="noreferrer" className="block w-24 h-24 rounded-lg overflow-hidden border border-slate-200 bg-black flex items-center justify-center hover:opacity-80 transition-opacity shrink-0 relative group">
                                                                <video src={adjunto.url} className="w-full h-full object-cover opacity-80" />
                                                                <div className="absolute inset-0 flex items-center justify-center">
                                                                    <div className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                                                                        <div className="w-0 h-0 border-t-4 border-t-transparent border-l-6 border-l-white border-b-4 border-b-transparent ml-1"></div>
                                                                    </div>
                                                                </div>
                                                            </a>
                                                        );
                                                    }
                                                    return (
                                                        <a key={i} href={adjunto.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors w-full sm:w-auto shrink-0">
                                                            <Paperclip className="w-4 h-4 text-slate-400 shrink-0" />
                                                            <span className="truncate max-w-[150px]">{adjunto.name}</span>
                                                        </a>
                                                    );
                                                })}
                                            </div>
                                        )}
                                        {!comentario.comentario && (!comentario.adjuntos || comentario.adjuntos.length === 0) && 'Sin contenido'}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Input para Nuevo Comentario */}
            <div className="p-4 bg-white border-t border-slate-200 shrink-0">
                {archivos.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                        {archivos.map((file, i) => (
                            <div key={i} className="flex items-center gap-2 bg-brand/5 border border-brand/20 text-brand px-3 py-1.5 rounded-lg text-xs font-medium">
                                <span className="truncate max-w-[150px]">{file.name}</span>
                                <button onClick={() => setArchivos(prev => prev.filter((_, idx) => idx !== i))} className="p-0.5 hover:bg-brand/10 rounded-md transition-colors">
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
                <div className="flex items-end gap-3 bg-slate-50 border border-slate-200 p-2 rounded-2xl focus-within:border-brand focus-within:ring-1 focus-within:ring-brand transition-all">
                    <label className="w-11 h-11 flex items-center justify-center text-slate-400 hover:text-brand hover:bg-brand/5 rounded-xl cursor-pointer transition-colors shrink-0">
                        <Paperclip className="w-5 h-5" />
                        <input type="file" multiple className="hidden" onChange={(e) => {
                            if (e.target.files) {
                                const newFiles = Array.from(e.target.files);
                                setArchivos(prev => [...prev, ...newFiles]);
                            }
                            e.target.value = '';
                        }} />
                    </label>
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
                        disabled={(!nuevoComentario.trim() && archivos.length === 0) || isSubmitting}
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
function ClasificacionTab({ 
    registro, 
    usuariosList, 
    razonesQueja, 
    responsableQueja, 
    onRefresh 
}: { 
    registro: any, 
    usuariosList: any[], 
    razonesQueja: any[], 
    responsableQueja: any[], 
    onRefresh: () => void 
}) {
    const [editClasificacionProductos, setEditClasificacionProductos] = useState<any[]>(registro.productos_novedad || []);
    const [globalClasificacion, setGlobalClasificacion] = useState({
        vendedor_id: registro.vendedor_id || '',
        valor_servicio: registro.valor_servicio || '',
        valor_flete: registro.valor_flete || '',
        valor_producto: registro.valor_producto || '',
        responsable_atraso: registro.responsable_atraso || '',
        area_responsable: registro.area_responsable || '',
        fecha_verificacion: registro.fecha_verificacion || '',
    });
    const [isSavingClasificacion, setIsSavingClasificacion] = useState(false);
    
    const [localRazones, setLocalRazones] = useState(razonesQueja);
    const [localResponsables, setLocalResponsables] = useState(responsableQueja);

    useEffect(() => {
        setLocalRazones(razonesQueja);
    }, [razonesQueja]);

    useEffect(() => {
        setLocalResponsables(responsableQueja);
    }, [responsableQueja]);

    const handleGlobalClasificacionChange = (field: string, value: any) => {
        setGlobalClasificacion(prev => ({ ...prev, [field]: value }));
    };

    const updateClasificacionProduct = (index: number, field: string, value: any) => {
        const newArr = [...editClasificacionProductos];
        newArr[index] = { ...newArr[index], [field]: value };
        setEditClasificacionProductos(newArr);
    };

    const updateProductProblema = (productIdx: number, problemaIdx: number, field: string, value: any) => {
        const newArr = [...editClasificacionProductos];
        const product = { ...newArr[productIdx] };
        const problemas = [...(product.problemas || [])];
        problemas[problemaIdx] = { ...problemas[problemaIdx], [field]: value };
        product.problemas = problemas;
        newArr[productIdx] = product;
        setEditClasificacionProductos(newArr);
    };

    const addProductProblema = (productIdx: number) => {
        const newArr = [...editClasificacionProductos];
        const product = { ...newArr[productIdx] };
        product.problemas = [...(product.problemas || []), { tipo_problema_id: '', responsable_problema_id: '' }];
        newArr[productIdx] = product;
        setEditClasificacionProductos(newArr);
    };

    const removeProductProblema = (productIdx: number, problemaIdx: number) => {
        const newArr = [...editClasificacionProductos];
        const product = { ...newArr[productIdx] };
        const problemas = [...(product.problemas || [])];
        problemas.splice(problemaIdx, 1);
        product.problemas = problemas;
        newArr[productIdx] = product;
        setEditClasificacionProductos(newArr);
    };

    const handleDefectoChange = async (productIdx: number, problemaIdx: number, value: string) => {
        if (value === 'NEW') {
            const newName = window.prompt("Ingrese el nombre del nuevo defecto:");
            if (!newName?.trim()) return;
            
            try {
                const { data: maxData } = await supabase.from('razones_queja').select('id').order('id', { ascending: false }).limit(1);
                const nextId = (maxData && maxData.length > 0) ? Number(maxData[0].id) + 1 : 1;

                const { data, error } = await supabase.from('razones_queja').insert({ id: nextId, razon: newName.trim() }).select().single();
                if (error) throw error;
                if (data) {
                    setLocalRazones(prev => [...prev, data]);
                    updateProductProblema(productIdx, problemaIdx, 'tipo_problema_id', data.id);
                }
            } catch (err: any) {
                alert("Error al crear defecto: " + err.message);
            }
        } else {
            updateProductProblema(productIdx, problemaIdx, 'tipo_problema_id', value);
        }
    };

    const handleResponsableChange = async (productIdx: number, problemaIdx: number, value: string) => {
        if (value === 'NEW') {
            const newName = window.prompt("Ingrese el nombre del nuevo responsable:");
            if (!newName?.trim()) return;
            
            try {
                const { data: maxData } = await supabase.from('responsable_queja').select('id').order('id', { ascending: false }).limit(1);
                const nextId = (maxData && maxData.length > 0) ? Number(maxData[0].id) + 1 : 1;

                const { data, error } = await supabase.from('responsable_queja').insert({ id: nextId, responsable: newName.trim() }).select().single();
                if (error) throw error;
                if (data) {
                    setLocalResponsables(prev => [...prev, data]);
                    updateProductProblema(productIdx, problemaIdx, 'responsable_problema_id', data.id);
                }
            } catch (err: any) {
                alert("Error al crear responsable: " + err.message);
            }
        } else {
            updateProductProblema(productIdx, problemaIdx, 'responsable_problema_id', value);
        }
    };

    const handleSaveClasificacion = async () => {
        setIsSavingClasificacion(true);
        try {
            const { error } = await supabase
                .from('registro_solicitudes')
                .update({
                    productos_novedad: editClasificacionProductos,
                    vendedor_id: globalClasificacion.vendedor_id || null,
                    valor_servicio: globalClasificacion.valor_servicio || null,
                    valor_flete: globalClasificacion.valor_flete || null,
                    valor_producto: globalClasificacion.valor_producto || null,
                    responsable_atraso: globalClasificacion.responsable_atraso || null,
                    area_responsable: globalClasificacion.area_responsable || null,
                    fecha_verificacion: globalClasificacion.fecha_verificacion || null,
                })
                .eq('id', registro.id);
            if (error) throw error;
            
            alert('Clasificación guardada exitosamente');
            onRefresh();
        } catch (error: any) {
            console.error('Error guardando clasificación:', error);
            alert(error.message || 'Error guardando');
        } finally {
            setIsSavingClasificacion(false);
        }
    };

    return (
        <div className="bg-white rounded-2xl w-full shadow-sm border border-slate-200 flex flex-col relative z-10 overflow-hidden">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-brand/10 text-brand rounded-xl flex items-center justify-center">
                        <Tag className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-base font-bold text-slate-800">Clasificación de Productos</h2>
                        <p className="text-[11px] text-slate-500 font-medium">Asigna la clasificación detallada para cada novedad</p>
                    </div>
                </div>
            </div>
            
            {/* Global Classification Fields */}
            <div className="p-4 sm:p-6 bg-slate-50 border-b border-slate-100 pb-0">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2">
                        <Info className="w-4 h-4" /> Datos Generales de la Solicitud
                    </h3>
                    
                    <div className="space-y-5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div>
                                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5 block">Vendedor</label>
                                <select value={globalClasificacion.vendedor_id} onChange={(e) => handleGlobalClasificacionChange('vendedor_id', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand">
                                    <option value="">Seleccione Vendedor</option>
                                    {usuariosList.map(v => <option key={v.id} value={v.id}>{v.display_name || `${v.nombres||''} ${v.apellidos||''}`}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5 block">Responsable Atraso</label>
                                <input type="text" value={globalClasificacion.responsable_atraso} onChange={(e) => handleGlobalClasificacionChange('responsable_atraso', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand" />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5 block">Área Responsable</label>
                                <input type="text" value={globalClasificacion.area_responsable} onChange={(e) => handleGlobalClasificacionChange('area_responsable', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand" />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5 block">Fecha Verificación</label>
                                <input type="date" value={globalClasificacion.fecha_verificacion} onChange={(e) => handleGlobalClasificacionChange('fecha_verificacion', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand" />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 border-t border-slate-100 pt-5">
                            <div>
                                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5 block">Valor Servicio</label>
                                <input type="number" value={globalClasificacion.valor_servicio} onChange={(e) => handleGlobalClasificacionChange('valor_servicio', Number(e.target.value))} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand" />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5 block">Valor Flete</label>
                                <input type="number" value={globalClasificacion.valor_flete} onChange={(e) => handleGlobalClasificacionChange('valor_flete', Number(e.target.value))} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand" />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5 block">Valor Producto</label>
                                <input type="number" value={globalClasificacion.valor_producto} onChange={(e) => handleGlobalClasificacionChange('valor_producto', Number(e.target.value))} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand" />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5 block">Valor Total</label>
                                <div className="w-full bg-brand/5 border border-brand/20 rounded-lg p-2.5 text-sm font-bold text-brand">
                                    ${((Number(globalClasificacion.valor_servicio)||0) + (Number(globalClasificacion.valor_flete)||0) + (Number(globalClasificacion.valor_producto)||0)).toLocaleString()}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Body */}
            <div className="p-4 sm:p-6 bg-slate-50">
                {editClasificacionProductos.length === 0 ? (
                    <div className="text-center text-slate-500 py-10">No hay productos de novedad para clasificar.</div>
                ) : (
                    <ul className="space-y-6">
                        {editClasificacionProductos.map((prod: any, idx: number) => (
                            <li key={idx} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                                {/* Header del Producto */}
                                <div className="flex items-start gap-4 mb-5 border-b border-slate-100 pb-4">
                                    <div className="w-10 h-10 bg-slate-800 text-white shadow-sm rounded-lg flex flex-col items-center justify-center shrink-0">
                                        <span className="text-[9px] font-bold uppercase leading-none opacity-70 mb-0.5">CANT</span>
                                        <span className="font-bold text-sm leading-none">{prod.cantidad || 1}</span>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-bold text-slate-900 truncate">{prod.referencia || prod.codigo || prod.sku || 'Sin Referencia'}</p>
                                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{prod.descripcion || prod.nombre || 'Producto Genérico'}</p>
                                    </div>
                                </div>

                                {/* Formulario de Clasificación */}
                                <div className="space-y-5">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5 block">Fecha de Compra</label>
                                            <input type="date" value={prod.fecha_compra || ''} onChange={(e) => updateClasificacionProduct(idx, 'fecha_compra', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5 block">Fecha Fabricación</label>
                                            <input type="date" value={prod.fecha_fabricacion || ''} onChange={(e) => updateClasificacionProduct(idx, 'fecha_fabricacion', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand" />
                                        </div>
                                    </div>

                                    <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 mt-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <label className="text-[11px] font-bold uppercase tracking-widest text-brand">Defectos / Responsables</label>
                                            <button onClick={() => addProductProblema(idx)} className="text-[10px] font-bold uppercase tracking-widest text-brand hover:underline flex items-center gap-1 bg-white px-2 py-1 rounded-md border border-brand/10">
                                                <Plus className="w-3 h-3" /> Añadir Defecto
                                            </button>
                                        </div>
                                        {(prod.problemas || []).length > 0 ? (
                                            <div className="space-y-3">
                                                {(prod.problemas || []).map((prob: any, pIdx: number) => (
                                                    <div key={pIdx} className="flex items-start sm:items-center gap-2 flex-col sm:flex-row bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                                                        <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                            <div>
                                                                <span className="text-[9px] text-slate-400 block mb-1">Defecto</span>
                                                                <select value={prob.tipo_problema_id || ''} onChange={(e) => handleDefectoChange(idx, pIdx, e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-md p-2 text-xs outline-none focus:border-brand">
                                                                    <option value="">Seleccione...</option>
                                                                    {localRazones.map(r => <option key={r.id} value={r.id}>{r.razon}</option>)}
                                                                    <option value="NEW" className="font-bold text-brand">+ Crear Nuevo Defecto...</option>
                                                                </select>
                                                            </div>
                                                            <div>
                                                                <span className="text-[9px] text-slate-400 block mb-1">Responsable</span>
                                                                <select value={prob.responsable_problema_id || ''} onChange={(e) => handleResponsableChange(idx, pIdx, e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-md p-2 text-xs outline-none focus:border-brand">
                                                                    <option value="">Seleccione...</option>
                                                                    {localResponsables.map(r => <option key={r.id} value={r.id}>{r.responsable}</option>)}
                                                                    <option value="NEW" className="font-bold text-brand">+ Crear Nuevo Responsable...</option>
                                                                </select>
                                                            </div>
                                                        </div>
                                                        <button onClick={() => removeProductProblema(idx, pIdx)} className="self-end sm:self-auto p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors mt-2 sm:mt-0">
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center py-4 bg-white rounded-lg border border-slate-200 border-dashed text-[11px] text-slate-400">
                                                No hay defectos registrados. Haz clic en "Añadir Defecto".
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* Footer */}
            <div className="p-4 sm:p-5 border-t border-slate-100 flex items-center justify-end gap-3 bg-white shrink-0">
                <button
                    onClick={handleSaveClasificacion}
                    disabled={isSavingClasificacion}
                    className="px-6 py-2.5 rounded-xl text-sm font-bold bg-brand text-white shadow-lg shadow-brand/20 hover:scale-105 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                    {isSavingClasificacion ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Guardar Clasificación
                </button>
            </div>
        </div>
    );
}

// ----------------------------------------------------------------------
// Componente de Pestaña: Información General
// ----------------------------------------------------------------------
function InformacionTab({ registro, usuariosList, onRefresh, router }: { registro: any, usuariosList: any[], onRefresh: () => void, router: any }) {
    const [isSavingAsesor, setIsSavingAsesor] = useState(false);
    const [ordenVentaLocal, setOrdenVentaLocal] = useState(registro.orden_venta || '');
    const [isSavingOrdenVenta, setIsSavingOrdenVenta] = useState(false);
    const [isSavingTipoSolicitud, setIsSavingTipoSolicitud] = useState(false);

    const ubi = registro.Ubicaciones || {};
    const cons = registro.Consumidores || {};

    const [showModalEditarCanal, setShowModalEditarCanal] = useState(false);
    const [showModalEditarClienteFinal, setShowModalEditarClienteFinal] = useState(false);

    useEffect(() => {
        setOrdenVentaLocal(registro.orden_venta || '');
    }, [registro.orden_venta]);

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

    const canalVentaFormat = registro.canal_venta ? registro.canal_venta.replace(/_/g, ' ').toUpperCase() : 'N/A';

    const handleOrdenVentaBlur = async () => {
        if (ordenVentaLocal === (registro.orden_venta || '')) return;
        setIsSavingOrdenVenta(true);
        try {
            const { error } = await supabase.from('registro_solicitudes').update({ orden_venta: ordenVentaLocal || null }).eq('id', registro.id);
            if (error) throw error;
            onRefresh();
        } catch (err: any) {
            console.error(err);
            alert("Error actualizando Orden de Venta: " + err.message);
        } finally {
            setIsSavingOrdenVenta(false);
        }
    };

    const handleTipoSolicitudChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newValue = e.target.value;
        setIsSavingTipoSolicitud(true);
        try {
            const { error } = await supabase
                .from('registro_solicitudes')
                .update({ tipo_solicitud: newValue })
                .eq('id', registro.id);
            if (error) throw error;
            onRefresh();
        } catch (error) {
            console.error('Error al actualizar tipo de solicitud:', error);
            alert("Error al actualizar el tipo de solicitud");
        } finally {
            setIsSavingTipoSolicitud(false);
        }
    };

    const handleAsesorChange = async (e: any) => {
        const val = e.target.value;
        setIsSavingAsesor(true);
        try {
            const { error } = await supabase.from('registro_solicitudes').update({ asesor_mac_id: val || null }).eq('id', registro.id);
            if (error) throw error;
            onRefresh();
        } catch (err: any) {
            console.error(err);
            alert("Error asignando Asesor MAC: " + err.message);
        } finally {
            setIsSavingAsesor(false);
        }
    };

    const asesoresMac = usuariosList.filter(u => u.rol && u.rol.toLowerCase() === 'mac');

    return (
        <div className="space-y-6">
            
            {/* Datos Básicos */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 sm:p-8">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2 border-b border-slate-100 pb-4">
                    <Info className="w-4 h-4 text-slate-500" />
                    Detalles Principales
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    <InfoField label="Consecutivo" value={registro.consecutivo || 'N/A'} icon={Hash} />
                    

                    
                    <InfoField label="Fecha de Solicitud" value={dateStr} icon={Calendar} />
                    <InfoField label="Tratado Por" value={tratadoPor} icon={UserCog} />
                    
                    <div className="flex gap-4 items-center p-3 rounded-lg border border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-slate-100 transition-colors">
                        <div className="w-10 h-10 rounded-md bg-white border border-slate-200 flex items-center justify-center text-slate-600 shrink-0">
                            <Tag className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1 relative">
                            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-0.5">Tipo de Solicitud</p>
                            <select 
                                value={registro.tipo_solicitud || ''} 
                                onChange={handleTipoSolicitudChange}
                                disabled={isSavingTipoSolicitud}
                                className="w-full text-sm font-semibold text-slate-900 bg-transparent outline-none cursor-pointer truncate appearance-none"
                            >
                                <option value="">Seleccionar opción...</option>
                                <option value="Garantía">Garantía</option>
                                <option value="Documento Sagrilaft">Documento Sagrilaft</option>
                                <option value="Reclamo">Reclamo</option>
                                <option value="Atención">Atención</option>
                            </select>
                            {isSavingTipoSolicitud && <Loader2 className="w-3 h-3 animate-spin absolute right-0 top-1/2 -translate-y-1/2 text-brand" />}
                        </div>
                    </div>
                    <InfoField label="Canal de Venta" value={canalVentaFormat} icon={Building2} />
                    <div className="flex gap-4 items-center p-3 rounded-lg border border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-slate-100 transition-colors">
                        <div className="w-10 h-10 rounded-md bg-white border border-slate-200 flex items-center justify-center text-slate-600 shrink-0">
                            <FileText className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1 relative">
                            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-0.5">Orden de Venta</p>
                            <input 
                                type="text"
                                placeholder="N/A"
                                value={ordenVentaLocal}
                                onChange={(e) => setOrdenVentaLocal(e.target.value)}
                                onBlur={handleOrdenVentaBlur}
                                onKeyDown={(e) => { if (e.key === 'Enter') handleOrdenVentaBlur(); }}
                                disabled={isSavingOrdenVenta}
                                className="w-full text-sm font-semibold text-slate-900 bg-transparent outline-none truncate placeholder:text-slate-400"
                            />
                            {isSavingOrdenVenta && <Loader2 className="w-3 h-3 animate-spin absolute right-0 top-1/2 -translate-y-1/2 text-brand" />}
                        </div>
                    </div>
                    <div className="flex gap-4 items-center p-3 rounded-lg border border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-slate-100 transition-colors">
                        <div className="w-10 h-10 rounded-md bg-white border border-slate-200 flex items-center justify-center text-slate-600 shrink-0">
                            <UserCog className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1 relative">
                            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-0.5">Asesor MAC</p>
                            <select 
                                value={registro.asesor_mac_id || ''} 
                                onChange={handleAsesorChange}
                                disabled={isSavingAsesor}
                                className="w-full text-sm font-semibold text-slate-900 bg-transparent outline-none cursor-pointer truncate appearance-none"
                            >
                                <option value="">Sin Asignar</option>
                                {asesoresMac.map(u => (
                                    <option key={u.id} value={u.id}>{u.nombres} {u.apellidos}</option>
                                ))}
                            </select>
                            {isSavingAsesor && <Loader2 className="w-3 h-3 animate-spin absolute right-0 top-1/2 -translate-y-1/2 text-brand" />}
                        </div>
                    </div>
                </div>
            </div>

            {/* Datos del Canal de Venta / Distribuidor */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 sm:p-8 hover:border-slate-300 transition-colors">
                <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-3">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                        <Building2 className="w-3.5 h-3.5" />
                        {registro.canal_venta === 'canal_propio_ecommerce' ? 'Datos del Canal (Propio)' : 'Datos del Canal de Venta'}
                    </h3>
                    {registro.canal_venta !== 'canal_propio_ecommerce' && (
                        <button 
                            onClick={() => setShowModalEditarCanal(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-brand bg-brand/5 hover:bg-brand/10 rounded-lg transition-colors"
                        >
                            <Pencil className="w-3.5 h-3.5" />
                            Editar Datos
                        </button>
                    )}
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
                    <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Nombre</span>
                        <span className="text-sm font-semibold text-slate-900">
                            {registro.canal_venta === 'canal_propio_ecommerce' 
                                ? 'Firplak / Ecommerce'
                                : registro.cliente_nombre || 'N/A'}
                        </span>
                    </div>
                    {registro.canal_venta !== 'canal_propio_ecommerce' && (
                        <>
                            <div>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Ciudad</span>
                                <span className="text-xs font-medium text-slate-600">{ubi.ciudades?.ciudad || ubi.ciudad || '---'}</span>
                            </div>
                            <div>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Teléfono</span>
                                <span className="text-xs font-medium text-slate-600">{ubi.telefono1 || ubi.telefono || ubi.celular || '---'}</span>
                            </div>
                            <div className="lg:col-span-2 xl:col-span-1">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Dirección</span>
                                <span className="text-xs font-medium text-slate-600">{ubi.direccion || '---'}</span>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Datos del Cliente Final */}
            {registro.cliente_final_id && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 sm:p-8 hover:border-slate-300 transition-colors">
                    <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-3">
                        <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                            <User className="w-3.5 h-3.5" />
                            Datos del Cliente Final
                        </h3>
                        <button 
                            onClick={() => setShowModalEditarClienteFinal(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-brand bg-brand/5 hover:bg-brand/10 rounded-lg transition-colors"
                        >
                            <Pencil className="w-3.5 h-3.5" />
                            Editar Datos
                        </button>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
                        <div>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Nombre</span>
                            <span className="text-sm font-semibold text-slate-900">{registro.cliente_final_nombre || 'N/A'}</span>
                        </div>
                        <div>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Ciudad</span>
                            <span className="text-xs font-medium text-slate-600">{cons.ciudades?.ciudad || cons.ciudad || '---'}</span>
                        </div>
                        <div>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Teléfono</span>
                            <span className="text-xs font-medium text-slate-600">{cons.celular || cons.telefono1 || cons.telefono || '---'}</span>
                        </div>
                        <div className="lg:col-span-2 xl:col-span-1">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Dirección</span>
                            <span className="text-xs font-medium text-slate-600">{cons.direccion || '---'}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Modals for Editing Clients */}
            {showModalEditarCanal && (
                <ModalEditarUbicacion
                    isOpen={true}
                    initialData={ubi}
                    onClose={() => setShowModalEditarCanal(false)}
                    onSuccess={async (updatedUbi) => {
                        setShowModalEditarCanal(false);
                        try {
                            await supabase.from('registro_solicitudes').update({
                                cliente_nombre: updatedUbi.nombre || updatedUbi.cliente_nombre
                            }).eq('id', registro.id);
                        } catch(e) {}
                        onRefresh();
                    }}
                />
            )}
            
            {showModalEditarClienteFinal && (
                <ModalCrearClienteFinal
                    isOpen={true}
                    initialData={{ ...cons, consumidor_id: cons.id }}
                    onClose={() => setShowModalEditarClienteFinal(false)}
                    onSuccess={async (updatedCons) => {
                        setShowModalEditarClienteFinal(false);
                        try {
                            await supabase.from('registro_solicitudes').update({
                                cliente_final_nombre: updatedCons.contacto || updatedCons.nombre_contacto || updatedCons.cedula
                            }).eq('id', registro.id);
                        } catch(e) {}
                        onRefresh();
                    }}
                />
            )}
        </div>
    );
}

// ----------------------------------------------------------------------
// Componentes Auxiliares
// ----------------------------------------------------------------------

function ServiciosEnlazadosTab({ registro }: { registro: any }) {
    const [servicios, setServicios] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        if (registro?.servicio_creado_consecutivo) {
            fetchServicios();
        } else {
            setLoading(false);
        }
    }, [registro?.servicio_creado_consecutivo]);

    const fetchServicios = async () => {
        try {
            const consecutivos = registro.servicio_creado_consecutivo.split(',').map((s: string) => s.trim()).filter(Boolean);
            if(consecutivos.length === 0) {
                setLoading(false); return;
            }
            
            const { data, error } = await supabase
                .from('query_servicios')
                .select('*')
                .in('consecutivo', consecutivos);
                
            if (error) throw error;
            setServicios(data || []);
        } catch (error) {
            console.error('Error fetching servicios enlazados:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;

    if (servicios.length === 0) return (
        <div className="bg-white rounded-2xl p-12 border border-dashed border-slate-300 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                <FileText className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="text-lg font-bold text-slate-700 mb-2">No hay servicios enlazados</h3>
            <p className="text-slate-500 max-w-md">Esta solicitud aún no tiene servicios asociados. Puedes crearlos usando el botón "Solicitar Servicio" en la parte superior.</p>
        </div>
    );

    return (
        <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-600 mb-4 flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-400" /> Servicios Enlazados ({servicios.length})
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {servicios.map((svc: any) => (
                    <div key={svc.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 hover:border-slate-300 transition-colors flex flex-col">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">{(svc.tipo_de_servicio || 'Servicio').replace(/_/g, ' ')}</p>
                                <h4 className="text-lg font-black text-slate-800 leading-none">{svc.consecutivo}</h4>
                            </div>
                            <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest shadow-sm ${svc.estado ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-50 text-amber-600 border border-amber-100'}`}>
                                {svc.estado ? 'Abierto' : 'Cerrado'}
                            </span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 mb-5 flex-1">
                            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-1"><User className="w-3 h-3" /> Técnico</p>
                                <p className="text-xs font-semibold text-slate-700 truncate" title={svc.tecnico_nombre || svc.tecnicoNombre || 'Sin asignar'}>{svc.tecnico_nombre || svc.tecnicoNombre || 'Sin asignar'}</p>
                            </div>
                            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-1"><Calendar className="w-3 h-3" /> Agendamiento</p>
                                <p className="text-xs font-semibold text-slate-700 truncate" title={svc.estado_visita || svc.estadoVisita || 'Sin agendar'}>{svc.estado_visita || svc.estadoVisita || 'Sin agendar'}</p>
                            </div>
                        </div>

                        <button 
                            onClick={() => router.push(`/ver-servicio/${svc.consecutivo}`)}
                            className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-[10px] uppercase tracking-widest rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm mt-auto"
                        >
                            Ver Detalles del Servicio <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}

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
