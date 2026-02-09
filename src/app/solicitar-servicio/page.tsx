'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft,
    Eraser,
    Clipboard,
    Search,
    ChevronDown,
    Plus,
    Trash2,
    Save,
    Loader2,
    PlusCircle,
    User,
    Package,
    Settings,
    Upload,
    CheckCircle2,
    FileText,
    ImageIcon,
    X,
    Paperclip,
    ExternalLink
} from 'lucide-react';
import BuscadorClientes from '@/components/solicitar-servicio/BuscadorClientes';
import BuscadorClienteFinal from '@/components/solicitar-servicio/BuscadorClienteFinal';
import BuscadorProductos from '@/components/solicitar-servicio/BuscadorProductos';
import BuscadorRepuestos from '@/components/solicitar-servicio/BuscadorRepuestos';

export default function SolicitarServicioPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [nextConsecutivo, setNextConsecutivo] = useState<number>(1);
    const [randomSuffix, setRandomSuffix] = useState<string>('');

    // Form States
    const [consecutivo, setConsecutivo] = useState('');
    const [numeroPedido, setNumeroPedido] = useState('');
    const [tipoServicio, setTipoServicio] = useState('');
    const [canalVenta, setCanalVenta] = useState('');
    const [facturado, setFacturado] = useState(false);
    const [decisionCliente, setDecisionCliente] = useState('');
    const [observaciones, setObservaciones] = useState('');

    // Selection States
    const [clienteSeleccionado, setClienteSeleccionado] = useState<any>(null);
    const [clienteFinalSeleccionado, setClienteFinalSeleccionado] = useState<any>(null);
    const [productosSeleccionados, setProductosSeleccionados] = useState<any[]>([]);
    const [repuestosSeleccionados, setRepuestosSeleccionados] = useState<any[]>([]);
    const [adjuntos, setAdjuntos] = useState<any[]>([]);

    // Modal Control States
    const [showBuscadorClientes, setShowBuscadorClientes] = useState(false);
    const [showBuscadorClienteFinal, setShowBuscadorClienteFinal] = useState(false);
    const [showBuscadorProductos, setShowBuscadorProductos] = useState(false);
    const [showBuscadorRepuestos, setShowBuscadorRepuestos] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const tipoServicioRef = useRef<HTMLSelectElement>(null);
    const canalVentaRef = useRef<HTMLSelectElement>(null);
    const clienteRef = useRef<HTMLDivElement>(null);
    const repuestosRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const init = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push('/login');
                return;
            }

            // Fetch current user details from Usuarios table
            const { data: userData } = await supabase
                .from('Usuarios')
                .select('*')
                .eq('user_id', session.user.id)
                .single();

            setCurrentUser(userData);

            // Fetch next consecutivo
            const { data: consecutivoData } = await supabase
                .from('NuevoConsecutivo')
                .select('nuevoConsecutivo')
                .limit(1)
                .single();

            if (consecutivoData) {
                setNextConsecutivo(consecutivoData.nuevoConsecutivo);
            }

            // Generate 5-digit random suffix
            const random = Math.floor(10000 + Math.random() * 90000).toString();
            setRandomSuffix(random);

            setLoading(false);
        };

        init();
    }, [router]);

    // Update consecutivo when tipoServicio or user changes
    useEffect(() => {
        if (!tipoServicio || !currentUser) {
            setConsecutivo('');
            return;
        }

        const nom = (currentUser.nombres || '').substring(0, 3);
        const ape = (currentUser.apellidos || '').substring(0, 3);
        const tipoShort = tipoServicio.substring(0, 4);
        const tipoFormatted = tipoShort.charAt(0).toUpperCase() + tipoShort.slice(1).toLowerCase();

        let newConsecutivo = `${nom}${ape}${tipoFormatted}${randomSuffix}`;

        if (tipoServicio === 'reparacion_y_mantenimiento_(facturado)' || facturado) {
            newConsecutivo = `F${newConsecutivo}`;
        }

        setConsecutivo(newConsecutivo);
    }, [tipoServicio, currentUser, randomSuffix, facturado]);

    const handleClear = () => {
        setNumeroPedido('');
        setTipoServicio('');
        setCanalVenta('');
        setFacturado(false);
        setDecisionCliente('');
        setObservaciones('');
        setClienteSeleccionado(null);
        setClienteFinalSeleccionado(null);
        setProductosSeleccionados([]);
        setRepuestosSeleccionados([]);
        setAdjuntos([]);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleFileClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files);
            setAdjuntos(prev => [...prev, ...newFiles]);
        }
    };

    const removeAdjunto = (index: number) => {
        setAdjuntos(prev => prev.filter((_, i) => i !== index));
    };

    const uploadFiles = async (files: File[]) => {
        const uploadPromises = files.map(async (file) => {
            try {
                const fileExt = file.name.split('.').pop();
                const fileName = `${crypto.randomUUID()}.${fileExt}`;
                // Use the generated consecutive for the folder structure
                // Fallback to 'temp' if for some reason consecutivo is missing (shouldn't happen on save)
                const folderPath = consecutivo || 'temp';
                // User requested folder name be the consecutive, containing all docs
                const filePath = `${folderPath}/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('solicitudesclientes')
                    .upload(filePath, file);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('solicitudesclientes')
                    .getPublicUrl(filePath);

                return publicUrl;
            } catch (error) {
                console.error('Error uploading file:', error);
                return null;
            }
        });

        const results = await Promise.all(uploadPromises);
        return results.filter((url): url is string => url !== null);
    };

    const handleSave = async () => {
        if (!tipoServicio) {
            alert('Por favor complete el campo obligatorio: Tipo de servicio');
            tipoServicioRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            tipoServicioRef.current?.focus();
            return;
        }

        if (!canalVenta) {
            alert('Por favor complete el campo obligatorio: Canal de venta');
            canalVentaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            canalVentaRef.current?.focus();
            return;
        }

        const isEcommerce = canalVenta === 'canal_propio_ecommerce';
        const ubicacionValid = isEcommerce
            ? true
            : (clienteSeleccionado && clienteSeleccionado.direccion && (clienteSeleccionado.contacto || clienteSeleccionado.nombre_contacto));

        const ticketNeedsConsumer = (tipo: string) => false; // Simplified for now as boolean logic is handled below

        // This simulates the complex status logic
        const determineApproval = (tipo: string, facturado: boolean, role: 'director' | 'logistica' | 'mac') => {
            const t = tipo.toLowerCase();
            if (role === 'director') {
                if ((t.includes('visita') || t.includes('atencion') || t.includes('instalacion')) && !facturado) {
                    return { estado: 'Pendiente' };
                }
                return { estado: 'No_aplica' };
            }
            if (role === 'logistica') {
                if (t.includes('quebrados') || t.includes('error') || t.includes('logistica') || t.includes('reposicion')) {
                    return { estado: 'Pendiente' };
                }
                return { estado: 'No_aplica' };
            }
            if (role === 'mac') {
                if (t.includes('garantia')) {
                    return { estado: 'Pendiente' };
                }
                return { estado: 'No_aplica' };
            }
            return { estado: 'No_aplica' };
        };

        const determineAplicaTecnico = (tipo: string) => {
            const t = tipo.toLowerCase();
            if (t.includes('quebrados') || t.includes('error') || t.includes('logistica') || t.includes('reposicion')) {
                return false;
            }
            return true;
        };

        // Validate Clients
        // Relaxed validation: check basic existence if not e-commerce
        if (!isEcommerce && !ubicacionValid) {
            alert('Faltan datos del Distribuidor/Cliente (Dirección o Contacto)');
            clienteRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }

        // Validate Products/Repuestos logic
        const needsRepuestos = tipoServicio.toLowerCase().includes('kit') || tipoServicio.toLowerCase().includes('repuesto');
        if (needsRepuestos && repuestosSeleccionados.length === 0) {
            alert('El servicio seleccionado requiere repuestos/kits, pero no ha seleccionado ninguno.');
            repuestosRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }

        setIsSaving(true);

        try {
            // 1. Upload Files
            const uploadedUrls = await uploadFiles(adjuntos);

            // 2. Prepare Approval Logic
            const aprobacionDirector = determineApproval(tipoServicio, facturado, 'director');
            const aprobacionLogistica = determineApproval(tipoServicio, facturado, 'logistica');
            const aprobacionMac = determineApproval(tipoServicio, facturado, 'mac');
            const aplicaTecnico = determineAplicaTecnico(tipoServicio);

            // 3. Insert Servicio
            const { data: servicioData, error: servicioError } = await supabase
                .from('Servicios')
                .insert({
                    consecutivo: consecutivo,
                    numero_de_pedido: numeroPedido,
                    comercial_id: currentUser?.id,
                    consumidor_id: clienteFinalSeleccionado?.id || null,
                    estado: true,
                    ubicacion_id: isEcommerce ? 2126 : clienteSeleccionado?.id,
                    coordinador_id: clienteFinalSeleccionado?.id
                        ? clienteFinalSeleccionado.coordinadorId
                        : clienteSeleccionado?.coordinadorId,
                    tipo_de_servicio: tipoServicio,
                    canal_de_venta: canalVenta,
                    facturado: facturado,
                    sharepoint_uid: crypto.randomUUID(),
                    creado_desde: 'supabase',
                    decision_cliente: decisionCliente || 'No aplica',
                    aprobacion_director: aprobacionDirector,
                    aprobacion_logistica: aprobacionLogistica,
                    aprobacion_mac: aprobacionMac,
                    aplica_tecnico: aplicaTecnico,
                    asesor_mac_id: (currentUser?.rol === 'mac' && ![26, 6, 66].includes(currentUser?.id))
                        ? currentUser.id
                        : null,
                })
                .select()
                .single();

            if (servicioError) throw servicioError;

            // 4. Insert Comentario
            if (observaciones || uploadedUrls.length > 0) {
                await supabase.from('Comentarios').insert({
                    servicio_id: servicioData.id,
                    contenido: observaciones || 'Anexos adjuntos',
                    documentos: uploadedUrls,
                    usuario_id: currentUser?.id,
                    tipo: 'solicitud_servicio'
                });
            }

            // 5. Insert Productos
            if (productosSeleccionados.length > 0) {
                const productosToInsert = productosSeleccionados.map(p => ({
                    servicio_id: servicioData.id,
                    producto_id: p.id,
                    cantidad: p.cantidad || 1
                }));
                await supabase.from('ProductosServicios').insert(productosToInsert);
            }

            // 6. Insert Repuestos
            if (repuestosSeleccionados.length > 0) {
                const repuestosToInsert = repuestosSeleccionados.map(r => ({
                    servicio_id: servicioData.id,
                    repuesto_id: r.id,
                    cantidad: r.cantidad || 1
                }));
                await supabase.from('RepuestosServicios').insert(repuestosToInsert);
            }

            alert('Servicio creado correctamente');
            handleClear();
            router.push('/');

        } catch (error: any) {
            console.error('Error creating service:', error);
            alert(`Error al crear el servicio: ${error.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#F1F5F9] flex items-center justify-center">
                <Loader2 className="w-12 h-12 text-brand animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F1F5F9] text-slate-800 font-sans pb-10">
            <header className="fixed top-0 left-0 w-full bg-brand text-white z-50 h-[3.5rem] flex items-center px-6 shadow-lg">
                <button
                    onClick={() => router.push('/')}
                    className="mr-4 p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex-1 flex items-center justify-between">
                    <h1 className="font-black text-xl tracking-tight uppercase">Solicitar Servicio</h1>
                    <button
                        onClick={handleClear}
                        className="flex items-center gap-2 px-4 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-all text-xs font-bold uppercase tracking-wider"
                    >
                        <Eraser className="w-3.5 h-3.5" />
                        Limpiar
                    </button>
                </div>
            </header>

            <main className="pt-24 px-4 max-w-4xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Info Card */}
                    <div className="md:col-span-2 bg-white p-6 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-white">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Consecutivo */}
                            <div className="space-y-1.5">
                                <label className="text-sm font-bold text-brand ml-1">Consecutivo</label>
                                <div className="relative group">
                                    <div className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 font-bold flex items-center justify-between">
                                        <span>{consecutivo || '---'}</span>
                                        <button
                                            onClick={() => consecutivo && navigator.clipboard.writeText(consecutivo)}
                                            className="p-1 hover:bg-slate-200 rounded transition-colors"
                                        >
                                            <Clipboard className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Numero de pedido */}
                            <div className="space-y-1.5">
                                <label className="text-sm font-bold text-brand ml-1">Número de pedido</label>
                                <input
                                    type="text"
                                    value={numeroPedido}
                                    onChange={(e) => setNumeroPedido(e.target.value)}
                                    placeholder="Ingrese número de pedido"
                                    className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all shadow-sm font-medium"
                                />
                            </div>

                            {/* Tipo de servicio */}
                            <div className="space-y-1.5">
                                <label className="text-sm font-bold text-brand ml-1">Tipo de servicio *</label>
                                <select
                                    ref={tipoServicioRef}
                                    value={tipoServicio}
                                    onChange={(e) => setTipoServicio(e.target.value)}
                                    className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all shadow-sm font-medium appearance-none"
                                >
                                    <option value="">Seleccione una opción...</option>
                                    <option value="mantenimiento">Mantenimiento</option>
                                    <option value="mantenimiento_con_kit">Mantenimiento con kit</option>
                                    <option value="instalacion">Instalación</option>
                                    <option value="visita_instalacion">Visita instalación</option>
                                    <option value="entrega">Entrega</option>
                                    <option value="garantia_sin_pedido">Garantía sin pedido</option>
                                    <option value="garantia_con_repuesto_kit">Garantía con repuesto kit</option>
                                    <option value="reparacion_atencion">Reparación atención</option>
                                    <option value="reparacion_atencion_con_repuesto_kit">Reparación atención con repuesto kit</option>
                                    <option value="error_en_pedido_referencia">Error en pedido referencia</option>
                                    <option value="quebrados_logistica">Quebrados logística</option>
                                    <option value="garantia_con_pedido_de_reposicion">Garantía con pedido de reposición</option>
                                    <option value="atencion_con_pedido_de_reposicion">Atención con pedido de reposición</option>
                                    <option value="reparacion_y_mantenimiento_(facturado)">Reparación y mantenimiento (Facturado)</option>
                                </select>
                            </div>

                            {/* Canal de venta */}
                            <div className="space-y-1.5">
                                <label className="text-sm font-bold text-brand ml-1">Canal de venta *</label>
                                <select
                                    ref={canalVentaRef}
                                    value={canalVenta}
                                    onChange={(e) => setCanalVenta(e.target.value)}
                                    className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all shadow-sm font-medium"
                                >
                                    <option value="">Seleccione una opción...</option>
                                    <option value="canal_ditribuidor">Canal Distribuidor</option>
                                    <option value="canal_exportador">Canal Exportador</option>
                                    <option value="canal_constructor">Canal Constructor</option>
                                    <option value="canal_propio_firplakhome">Canal Propio Firplakhome</option>
                                    <option value="canal_propio_ecommerce">Canal Propio eCommerce</option>
                                </select>
                            </div>

                            {/* Facturado Switch (Conditional) */}
                            {(tipoServicio.includes('entrega') || tipoServicio.includes('mantenimiento') || tipoServicio.includes('instalacion') || tipoServicio.includes('visita')) && (
                                <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
                                    <div className="text-xs font-medium text-slate-500 max-w-[70%]">
                                        ¿Es un servicio facturado? (Aplica para mantenimientos, entregas, visitas e instalaciones)
                                    </div>
                                    <button
                                        disabled={tipoServicio === 'reparacion_y_mantenimiento_(facturado)'}
                                        onClick={() => setFacturado(!facturado)}
                                        className={`w-12 h-6 rounded-full transition-all flex items-center px-1 shadow-inner ${facturado ? 'bg-brand' : 'bg-slate-300'}`}
                                    >
                                        <div className={`w-4 h-4 bg-white rounded-full shadow-md transition-transform ${facturado ? 'translate-x-6' : 'translate-x-0'}`} />
                                    </button>
                                </div>
                            )}

                            {/* Decision Cliente (Conditional) */}
                            {(['error_en_pedido_referencia', 'garantia_con_pedido_de_reposicion', 'quebrados_logistica', 'atencion_con_pedido_de_reposicion'].includes(tipoServicio)) && (
                                <div className="space-y-1.5">
                                    <label className="text-sm font-bold text-brand ml-1">Decisión del cliente</label>
                                    <select
                                        value={decisionCliente}
                                        onChange={(e) => setDecisionCliente(e.target.value)}
                                        className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all shadow-sm font-medium"
                                    >
                                        <option value="">Seleccione una opción...</option>
                                        <option value="Acepta Reposicion">Acepta Reposición</option>
                                        <option value="Quiere Nota Credito y Dinero">Quiere Nota Crédito y Dinero</option>
                                    </select>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Cliente Selection */}
                    <div ref={clienteRef} className="bg-white p-6 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-white flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <h3 className="font-black text-brand uppercase text-sm tracking-widest flex items-center gap-2">
                                <User className="w-4 h-4" />
                                {canalVenta === 'canal_constructor' ? 'Cliente Constructor' : 'Cliente Distribuidor'}
                            </h3>
                            {clienteSeleccionado && (
                                <button className="text-brand hover:scale-110 transition-transform">
                                    <PlusCircle className="w-5 h-5" />
                                </button>
                            )}
                        </div>

                        <button
                            onClick={() => canalVenta && setShowBuscadorClientes(true)}
                            disabled={!canalVenta}
                            className={`w-full p-4 border-2 rounded-2xl transition-all font-black text-sm flex items-center justify-center gap-2 ${!canalVenta
                                ? 'bg-slate-50 border-slate-100 text-slate-300 border-dashed'
                                : clienteSeleccionado
                                    ? 'bg-brand/5 border-brand text-brand shadow-sm'
                                    : 'border-slate-200 border-dashed hover:bg-slate-50 text-slate-400'
                                }`}
                        >
                            {clienteSeleccionado ? clienteSeleccionado.nombre : canalVenta ? 'Presione para buscar cliente...' : 'Seleccione canal de venta primero'}
                        </button>

                        <div className="space-y-2">
                            <div className="flex justify-between text-xs">
                                <span className="text-slate-400 font-medium uppercase">Dirección</span>
                                <span className="font-bold">{clienteSeleccionado?.direccion || '---'}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-slate-400 font-medium uppercase">Teléfono</span>
                                <span className="font-bold">{clienteSeleccionado?.telefono || '---'}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-slate-400 font-medium uppercase">Contacto</span>
                                <span className="font-bold">{clienteSeleccionado?.nombre_contacto || clienteSeleccionado?.contacto || '---'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Cliente Final Selection */}
                    {(canalVenta === 'canal_propio_ecommerce' || canalVenta === 'canal_propio_firplakhome' || facturado) && (
                        <div className="bg-white p-6 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-white flex flex-col gap-4">
                            <div className="flex items-center justify-between">
                                <h3 className="font-black text-brand uppercase text-sm tracking-widest flex items-center gap-2">
                                    <User className="w-4 h-4 text-emerald-500" />
                                    Cliente Final
                                </h3>
                            </div>

                            <button
                                onClick={() => setShowBuscadorClienteFinal(true)}
                                className={`w-full p-4 border-2 rounded-2xl transition-all font-black text-sm flex items-center justify-center gap-2 ${clienteFinalSeleccionado
                                    ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm'
                                    : 'border-2 border-dashed border-slate-200 hover:bg-slate-50 text-slate-400'
                                    }`}
                            >
                                {clienteFinalSeleccionado ? (clienteFinalSeleccionado._search_type === 'ubicacion' ? (clienteFinalSeleccionado.nombre || clienteFinalSeleccionado.cliente_nombre) : clienteFinalSeleccionado.contacto) : 'Presione para buscar cliente final...'}
                            </button>

                            <div className="space-y-2">
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-400 font-medium uppercase">Ciudad</span>
                                    <span className="font-bold">{clienteFinalSeleccionado?.ciudad || '---'}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-400 font-medium uppercase">Dirección</span>
                                    <span className="font-bold">{clienteFinalSeleccionado?.direccion || '---'}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-400 font-medium uppercase">Teléfono</span>
                                    <span className="font-bold">{clienteFinalSeleccionado?.telefono || '---'}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-400 font-medium uppercase">Contacto</span>
                                    <span className="font-bold">{clienteFinalSeleccionado?.contacto || clienteFinalSeleccionado?.nombre_contacto || '---'}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Productos Section */}
                    <div className="md:col-span-2 bg-white p-6 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-white">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-black text-brand uppercase text-sm tracking-widest flex items-center gap-2">
                                <Package className="w-4 h-4" />
                                Productos ({productosSeleccionados.length})
                            </h3>
                            <button
                                onClick={() => setShowBuscadorProductos(true)}
                                className="bg-brand text-white text-[10px] font-black uppercase px-4 py-1.5 rounded-full shadow-md hover:scale-105 transition-all flex items-center gap-1.5"
                            >
                                <Plus className="w-3 h-3" />
                                Añadir
                            </button>
                        </div>

                        {productosSeleccionados.length === 0 ? (
                            <div className="py-10 text-center border-2 border-dashed border-slate-100 rounded-[1.5rem] text-slate-300 font-bold italic tracking-tighter text-lg">
                                No hay productos seleccionados
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                                {productosSeleccionados.map((prod, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100 group">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black text-brand uppercase tracking-wider">{prod.sku}</span>
                                            <span className="text-xs font-bold text-slate-700 uppercase truncate max-w-[150px]">{prod.nombre}</span>
                                            {(prod.color_base || prod.color_mueble) && (
                                                <span className="text-[9px] text-slate-400 font-medium uppercase mt-0.5">
                                                    {prod.color_base && `Base: ${prod.color_base}`}
                                                    {prod.color_base && prod.color_mueble && ' | '}
                                                    {prod.color_mueble && `Mueble: ${prod.color_mueble}`}
                                                </span>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => setProductosSeleccionados(prev => prev.filter((_, i) => i !== idx))}
                                            className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Repuestos Section */}
                    <div ref={repuestosRef} className="md:col-span-2 bg-white p-6 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-white">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-black text-brand uppercase text-sm tracking-widest flex items-center gap-2">
                                <Settings className="w-4 h-4" />
                                Repuestos / Kits ({repuestosSeleccionados.length})
                            </h3>
                            <button
                                onClick={() => setShowBuscadorRepuestos(true)}
                                className="bg-indigo-600 text-white text-[10px] font-black uppercase px-4 py-1.5 rounded-full shadow-md hover:scale-105 transition-all flex items-center gap-1.5"
                            >
                                <Plus className="w-3 h-3" />
                                Añadir
                            </button>
                        </div>

                        {repuestosSeleccionados.length === 0 ? (
                            <div className="py-10 text-center border-2 border-dashed border-slate-100 rounded-[1.5rem] text-slate-300 font-bold italic tracking-tighter text-lg">
                                No hay repuestos seleccionados
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                                {repuestosSeleccionados.map((rep, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3 bg-indigo-50/50 rounded-2xl border border-indigo-100 group">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-wider">{rep.sku}</span>
                                            <span className="text-xs font-bold text-slate-700 uppercase truncate max-w-[150px]">{rep.nombre}</span>
                                        </div>
                                        <button
                                            onClick={() => setRepuestosSeleccionados(prev => prev.filter((_, i) => i !== idx))}
                                            className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Adjuntos Section */}
                    <div className="md:col-span-2 bg-white p-6 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-white">
                        <h3 className="font-black text-brand uppercase text-sm tracking-widest flex items-center gap-2 mb-4">
                            <Paperclip className="w-4 h-4" />
                            Evidencias / Adjuntos ({adjuntos.length})
                        </h3>

                        <input
                            type="file"
                            multiple
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            className="hidden"
                            accept="image/*,.pdf"
                        />

                        <div
                            onClick={handleFileClick}
                            className="border-2 border-dashed border-slate-200 rounded-[1.5rem] p-8 flex flex-col items-center justify-center gap-3 hover:bg-slate-50 transition-all cursor-pointer group mb-4"
                        >
                            <div className="w-12 h-12 bg-slate-100 group-hover:bg-indigo-50 rounded-full flex items-center justify-center transition-colors">
                                <Upload className="w-6 h-6 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                            </div>
                            <p className="text-slate-400 group-hover:text-slate-600 font-bold text-sm transition-colors">Presione para cargar archivos...</p>
                            <p className="text-xs text-slate-300 font-medium">Imágenes, PDF</p>
                        </div>

                        {/* File Preview List */}
                        {adjuntos.length > 0 && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                {adjuntos.map((file, idx) => {
                                    const isImage = file.type.startsWith('image/');
                                    const previewUrl = isImage ? URL.createObjectURL(file) : null;

                                    return (
                                        <div key={idx} className="relative group bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                                            {/* Preview/Icon */}
                                            <div className="h-24 w-full flex items-center justify-center bg-slate-100 overflow-hidden relative">
                                                {isImage && previewUrl ? (
                                                    <img
                                                        src={previewUrl}
                                                        alt="preview"
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <FileText className="w-10 h-10 text-slate-400" />
                                                )}

                                                {/* Overlay with Remove Button */}
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            removeAdjunto(idx);
                                                        }}
                                                        className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors shadow-lg"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* File Info */}
                                            <div className="p-2 bg-white">
                                                <p className="text-[10px] font-bold text-slate-700 truncate" title={file.name}>{file.name}</p>
                                                <p className="text-[9px] text-slate-400 font-medium">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Observaciones */}
                    <div className="md:col-span-2 bg-white p-6 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-white">
                        <h3 className="font-black text-brand uppercase text-sm tracking-widest flex items-center gap-2 mb-4">
                            Comentarios / Observaciones
                        </h3>
                        <textarea
                            value={observaciones}
                            onChange={(e) => setObservaciones(e.target.value)}
                            rows={4}
                            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-[1.5rem] focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all font-medium text-slate-700"
                            placeholder="Escriba aquí los detalles adicionales del servicio..."
                        />
                    </div>

                    {/* Actions */}
                    <div className="md:col-span-2 flex justify-end gap-4 mt-4">
                        <button
                            disabled={isSaving}
                            onClick={handleSave}
                            className="bg-brand text-white font-black uppercase tracking-[0.2em] px-10 py-4 rounded-[1.5rem] shadow-2xl hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-3 disabled:opacity-50"
                        >
                            {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                            Crear Servicio
                        </button>
                    </div>
                </div>
            </main>

            {/* Modals */}
            <AnimatePresence>
                {showBuscadorClientes && (
                    <BuscadorClientes
                        canalVenta={canalVenta}
                        onClose={() => setShowBuscadorClientes(false)}
                        onSelect={(cliente) => {
                            setClienteSeleccionado(cliente);
                            setShowBuscadorClientes(false);
                        }}
                    />
                )}
                {showBuscadorClienteFinal && (
                    <BuscadorClienteFinal
                        onClose={() => setShowBuscadorClienteFinal(false)}
                        onSelect={(cliente) => {
                            setClienteFinalSeleccionado(cliente);
                            setShowBuscadorClienteFinal(false);
                        }}
                    />
                )}
                {showBuscadorProductos && (
                    <BuscadorProductos
                        productosSeleccionados={productosSeleccionados}
                        onAdd={(prod) => setProductosSeleccionados(prev => [...prev, prod])}
                        onRemove={(index) => setProductosSeleccionados(prev => prev.filter((_, i) => i !== index))}
                        onClose={() => setShowBuscadorProductos(false)}
                    />
                )}
                {showBuscadorRepuestos && (
                    <BuscadorRepuestos
                        repuestosSeleccionados={repuestosSeleccionados}
                        onAdd={(rep) => setRepuestosSeleccionados(prev => [...prev, { ...rep, cantidad: 1 }])}
                        onRemove={(index) => setRepuestosSeleccionados(prev => prev.filter((_, i) => i !== index))}
                        onUpdateQuantity={(index, quantity) => {
                            setRepuestosSeleccionados(prev => prev.map((item, i) =>
                                i === index ? { ...item, cantidad: quantity } : item
                            ));
                        }}
                        onClose={() => setShowBuscadorRepuestos(false)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
