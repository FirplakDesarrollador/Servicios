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
    ExternalLink,
    Video
} from 'lucide-react';
import BuscadorClientes from '@/components/solicitar-servicio/BuscadorClientes';
import BuscadorClienteFinal from '@/components/solicitar-servicio/BuscadorClienteFinal';
import BuscadorProductos from '@/components/solicitar-servicio/BuscadorProductos';

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
    const [canalVenta, setCanalVenta] = useState('canal_ditribuidor');
    const [facturado, setFacturado] = useState(true);
    const [decisionCliente, setDecisionCliente] = useState('');
    const [observaciones, setObservaciones] = useState('');

    // Selection States
    const [clienteSeleccionado, setClienteSeleccionado] = useState<any>(null);
    const [clienteFinalSeleccionado, setClienteFinalSeleccionado] = useState<any>(null);
    const [productosSeleccionados] = useState<any[]>([]);
    const [adjuntos, setAdjuntos] = useState<any[]>([]);

    // Product Selection States (as requested)
    const [grupos, setGrupos] = useState<string[]>([]);
    const [zonasMedidas, setZonasMedidas] = useState<any[]>([]);
    const [medidasVisibles, setMedidasVisibles] = useState<any[]>([]);
    const [grupoSeleccionado, setGrupoSeleccionado] = useState('');
    const [medidaSeleccionada, setMedidaSeleccionada] = useState('');
    const [cantidadPersonas, setCantidadPersonas] = useState<number | null>(null);
    const [tieneCalentadorGas, setTieneCalentadorGas] = useState<boolean | undefined>(undefined);
    const [cantidadProducto, setCantidadProducto] = useState<number>(1);
    const [productosAgregados, setProductosAgregados] = useState<any[]>([]);

    // Modal Control States
    const [showBuscadorClientes, setShowBuscadorClientes] = useState(false);
    const [showBuscadorClienteFinal, setShowBuscadorClienteFinal] = useState(false);
    const [showBuscadorProductos, setShowBuscadorProductos] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const tipoServicioRef = useRef<HTMLSelectElement>(null);
    const canalVentaRef = useRef<HTMLSelectElement>(null);
    const clienteRef = useRef<HTMLDivElement>(null);

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

            // Fetch default sucursal if it exists
            if (userData?.sucursal_predeterminada) {
                const { data: sucursalData } = await supabase
                    .from('Ubicaciones')
                    .select('*')
                    .eq('id', userData.sucursal_predeterminada)
                    .single();
                
                if (sucursalData) {
                    setClienteSeleccionado(sucursalData);
                    setCanalVenta('canal_ditribuidor');
                }
            }

            // Load groups from vw_zonas_medidas_descripciones view
            const { data: gruposData } = await supabase
                .from('vw_zonas_medidas_descripciones')
                .select('descripcion');

            if (gruposData) {
                const gruposUnicos = Array.from(new Set(gruposData.map((item: any) => item.descripcion || item.description || item.Descripcion).filter(Boolean))) as string[];
                setGrupos(gruposUnicos);
            }

            // Load all zonas_medidas data
            const { data: zonasMedidasData } = await supabase
                .from('zonas_medidas')
                .select('*')
                .order('medida');

            if (zonasMedidasData) {
                setZonasMedidas(zonasMedidasData);
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

    // Filter medidas when grupo or cantidadPersonas changes
    useEffect(() => {
        if (grupoSeleccionado && zonasMedidas.length > 0) {
            let medidasFiltradas = zonasMedidas.filter((zm: any) => (zm.descripcion || zm.Descripcion) === grupoSeleccionado);

            // For Hidromasajes, also filter by cantidad_personas
            if (grupoSeleccionado === 'Hidromasajes' && cantidadPersonas) {
                medidasFiltradas = medidasFiltradas.filter((zm: any) => (zm.cantidad_personas || zm.cantidadPersonas) === cantidadPersonas);
            }

            setMedidasVisibles(medidasFiltradas.map((zm: any) => ({
                medida: zm.medida || zm.Medida,
                precio: zm.precio || zm.Precio
            })));
            // Reset medida when grupo or cantidadPersonas changes
            setMedidaSeleccionada('');
            setCantidadProducto(1);
        } else {
            setMedidasVisibles([]);
        }
    }, [grupoSeleccionado, cantidadPersonas, zonasMedidas]);

    const handleAgregarProducto = () => {
        if (!grupoSeleccionado || !medidaSeleccionada) return;

        const nuevoProducto = {
            id: Date.now(),
            grupo: grupoSeleccionado,
            medida: medidaSeleccionada,
            cantidad: cantidadProducto,
            cantidadPersonas,
            tieneCalentadorGas
        };

        setProductosAgregados(prev => [...prev, nuevoProducto]);
        
        // Reset product inputs (optional, maybe keep grupo if they are adding similar items)
        setMedidaSeleccionada('');
        setCantidadProducto(1);
    };

    const handleEliminarProducto = (id: number) => {
        setProductosAgregados(prev => prev.filter(p => p.id !== id));
    };

    const handleClear = () => {
        setNumeroPedido('');
        setTipoServicio('');
        setCanalVenta('');
        setFacturado(false);
        setDecisionCliente('');
        setObservaciones('');
        setClienteSeleccionado(currentUser?.sucursal_predeterminada ? clienteSeleccionado : null);
        setClienteFinalSeleccionado(null);
        setGrupoSeleccionado('');
        setMedidaSeleccionada('');
        setCantidadPersonas(null);
        setTieneCalentadorGas(undefined);
        setCantidadProducto(1);
        setProductosAgregados([]);
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

    const sanitizePath = (path: string) => {
        return path
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "") // Remove accents/diacritics
            .replace(/[^a-zA-Z0-9]/g, "_"); // Replace non-alphanumeric with underscore
    };

    const uploadFiles = async (files: File[]) => {
        const uploadPromises = files.map(async (file) => {
            try {
                const fileExt = file.name.split('.').pop();
                const fileName = `${crypto.randomUUID()}.${fileExt}`;
                // Use the generated consecutive for the folder structure
                // Fallback to 'temp' if for some reason consecutivo is missing (shouldn't happen on save)
                const folderPath = consecutivo ? sanitizePath(consecutivo) : 'temp';
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

        // Validate Products Section
        if (productosAgregados.length === 0) {
            alert('Por favor agregue al menos un producto al pedido.');
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

            // 3. Insert Servicio Distribuidor
            const { data: servicioData, error: servicioError } = await supabase
                .from('Servicios_Distribuidor')
                .insert({
                    consecutivo: consecutivo,
                    numero_orden_compra: numeroPedido,
                    comercial_id: currentUser?.id,
                    consumidor_id: clienteFinalSeleccionado?.id || null,
                    ubicacion_id: clienteSeleccionado?.id,
                    tipo_de_servicio: tipoServicio,
                    canal_de_venta: canalVenta,
                    facturado: facturado,
                    decision_cliente: decisionCliente || 'No aplica',
                    observaciones: observaciones,
                    productos: productosAgregados,
                    adjuntos: uploadedUrls,
                    creado_desde: 'Pagina'
                })
                .select()
                .single();

            if (servicioError) throw servicioError;

            // 5. Insert Productos (Removed this section as per instructions)
            // if (productosSeleccionados.length > 0) {
            //     const productosToInsert = productosSeleccionados.map(p => ({
            //         servicio_id: servicioData.id,
            //         producto_id: p.id,
            //         cantidad: p.cantidad || 1
            //     }));
            //     await supabase.from('productos_servicios').insert(productosToInsert);
            // }

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
                    <h1 className="font-black text-xl tracking-tight uppercase">Montar Pedido - Zona Clientes</h1>
                    <button
                        onClick={handleClear}
                        className="flex items-center gap-2 px-4 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-all text-xs font-bold uppercase tracking-wider"
                    >
                        <Eraser className="w-3.5 h-3.5" />
                        Limpiar Pedido
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
                                <label className="text-sm font-bold text-brand ml-1">Número de orden de compra</label>
                                <input
                                    type="text"
                                    value={numeroPedido}
                                    onChange={(e) => setNumeroPedido(e.target.value)}
                                    placeholder="Ingrese número de orden de compra"
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
                                    <option value="instalacion">Instalación</option>
                                    <option value="visita_instalacion">Visita instalación</option>
                                </select>
                            </div>

                            {/* Canal de venta */}
                            <div className="space-y-1.5">
                                <label className="text-sm font-bold text-brand ml-1">Canal de venta *</label>
                                <select
                                    ref={canalVentaRef}
                                    value={canalVenta}
                                    onChange={(e) => setCanalVenta(e.target.value)}
                                    disabled
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none font-medium text-slate-500 cursor-not-allowed"
                                >
                                    <option value="canal_ditribuidor">Canal Distribuidor</option>
                                </select>
                            </div>


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
                            disabled={!canalVenta || !!currentUser?.sucursal_predeterminada}
                            className={`w-full p-4 border-2 rounded-2xl transition-all font-black text-sm flex items-center justify-center gap-2 ${!canalVenta
                                ? 'bg-slate-50 border-slate-100 text-slate-300 border-dashed'
                                : clienteSeleccionado
                                    ? 'bg-brand/5 border-brand text-brand shadow-sm cursor-not-allowed'
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

                    {/* Información del Producto */}
                    <div className="md:col-span-2 bg-white p-8 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-white">
                        <div className="flex items-center gap-4 mb-8 pb-4 border-b-2 border-slate-100">
                            <div className="w-14 h-14 bg-brand rounded-2xl flex items-center justify-center shadow-lg">
                                <Package className="w-7 h-7 text-white" />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900">Información del Producto Cliente</h2>
                        </div>

                        {/* Resumen de Productos Agregados */}
                        {productosAgregados.length > 0 && (
                            <div className="bg-slate-50 p-6 rounded-[2rem] border-2 border-slate-100 mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
                                <h3 className="font-black text-brand uppercase text-[10px] tracking-widest mb-4 flex items-center gap-2">
                                    <Package className="w-3 h-3 text-emerald-500" />
                                    Productos en el Pedido ({productosAgregados.length})
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {productosAgregados.map((item) => (
                                        <div key={item.id} className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center justify-between group hover:shadow-md transition-all">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-black text-brand uppercase tracking-wider">{item.grupo}</span>
                                                <span className="text-sm font-bold text-slate-700">{item.medida}</span>
                                                <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full mt-1 inline-block w-fit">
                                                    CANTIDAD: {item.cantidad}
                                                </span>
                                            </div>
                                            <button 
                                                type="button"
                                                onClick={() => handleEliminarProducto(item.id)}
                                                className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Grupo */}
                        <div className="mb-6">
                            <label className="block text-base font-bold text-slate-800 mb-3 ml-1 uppercase tracking-widest text-xs">
                                Grupo de Producto
                            </label>
                            <select
                                value={grupoSeleccionado}
                                onChange={(e) => {
                                    setGrupoSeleccionado(e.target.value);
                                    setCantidadPersonas(null);
                                    setTieneCalentadorGas(undefined);
                                    setMedidaSeleccionada(''); // Reset medida when group changes
                                }}
                                className="w-full px-5 py-4 text-base text-slate-900 border-2 border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all bg-slate-50 font-bold"
                            >
                                <option value="">Seleccione un grupo</option>
                                {grupos.map((grupo) => (
                                    <option key={grupo} value={grupo}>
                                        {grupo}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Hidromasajes - Cantidad de Personas (ANTES de medidas) */}
                        {grupoSeleccionado === 'Hidromasajes' && (
                            <div className="mb-6 p-6 bg-brand/5 border-2 border-brand/20 rounded-[2rem]">
                                <label className="block text-base font-bold text-brand mb-4 uppercase tracking-widest text-xs ml-1">
                                    ¿Cuántas personas es el hidromasaje? *
                                </label>
                                <div className="grid grid-cols-2 gap-4">
                                    {[2, 4].map((cantidad) => (
                                        <button
                                            key={cantidad}
                                            type="button"
                                            onClick={() => {
                                                setCantidadPersonas(cantidad);
                                                setMedidaSeleccionada('');
                                                setTieneCalentadorGas(cantidad === 2 ? undefined : tieneCalentadorGas);
                                            }}
                                            className={`py-4 px-6 rounded-2xl font-black text-sm transition-all border-2 ${cantidadPersonas === cantidad
                                                ? 'bg-brand text-white border-brand shadow-lg scale-105'
                                                : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
                                                }`}
                                        >
                                            {cantidad} Personas
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Hidromasajes - Calentador a Gas (ANTES de medidas, solo para 4 personas) */}
                        {grupoSeleccionado === 'Hidromasajes' && cantidadPersonas === 4 && (
                            <div className="mb-6 p-6 bg-slate-50 border-2 border-slate-100 rounded-[2rem]">
                                <label className="block text-base font-bold text-slate-800 mb-4 uppercase tracking-widest text-xs ml-1">
                                    ¿Tiene calentador a gas? *
                                </label>
                                <div className="grid grid-cols-2 gap-4">
                                    {[
                                        { value: true, label: 'Sí' },
                                        { value: false, label: 'No' }
                                    ].map((option) => (
                                        <button
                                            key={option.label}
                                            type="button"
                                            onClick={() => {
                                                setTieneCalentadorGas(option.value);
                                                setMedidaSeleccionada('');
                                            }}
                                            className={`py-4 px-6 rounded-2xl font-black text-sm transition-all border-2 ${tieneCalentadorGas === option.value
                                                ? 'bg-brand text-white border-brand shadow-lg scale-105'
                                                : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
                                                }`}
                                        >
                                            {option.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Medidas y Cantidad */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                            <div className="md:col-span-2">
                                <label className="block text-base font-bold text-slate-800 mb-3 ml-1 uppercase tracking-widest text-xs">
                                    Medidas del Producto
                                </label>
                                <select
                                    value={medidaSeleccionada}
                                    onChange={(e) => setMedidaSeleccionada(e.target.value)}
                                    className="w-full px-5 py-4 text-base text-slate-900 border-2 border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all bg-slate-50 font-bold"
                                    disabled={
                                        !grupoSeleccionado ||
                                        medidasVisibles.length === 0 ||
                                        (grupoSeleccionado === 'Hidromasajes' && cantidadPersonas === null) ||
                                        (grupoSeleccionado === 'Hidromasajes' && cantidadPersonas === 4 && tieneCalentadorGas === undefined)
                                    }
                                >
                                    <option value="">Seleccione una medida</option>
                                    {medidasVisibles.map((m, index) => (
                                        <option key={index} value={m.medida}>
                                            {m.medida}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            
                            <div>
                                <label className="block text-base font-bold text-slate-800 mb-3 ml-1 uppercase tracking-widest text-xs">
                                    Cantidad
                                </label>
                                <input 
                                    type="number" 
                                    min="1"
                                    value={cantidadProducto}
                                    onChange={(e) => setCantidadProducto(parseInt(e.target.value) || 1)}
                                    className="w-full px-5 py-4 text-base text-slate-900 border-2 border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all bg-slate-50 font-bold"
                                />
                            </div>
                        </div>

                        {/* Botón Agregar */}
                        <button
                            type="button"
                            onClick={handleAgregarProducto}
                            disabled={!grupoSeleccionado || !medidaSeleccionada}
                            className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-sm transition-all shadow-lg flex items-center justify-center gap-2 ${
                                !grupoSeleccionado || !medidaSeleccionada
                                ? 'bg-slate-100 text-slate-300 cursor-not-allowed'
                                : 'bg-brand text-white hover:bg-brand/90 hover:scale-[1.02] active:scale-95'
                            }`}
                        >
                            <Plus className="w-5 h-5" />
                            Agregar al Pedido
                        </button>

                        <div className="mt-4">
                            {!grupoSeleccionado && (
                                <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 ml-2 tracking-wider">Primero seleccione un grupo de producto</p>
                            )}
                            {grupoSeleccionado === 'Hidromasajes' && cantidadPersonas === null && (
                                <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 ml-2 tracking-wider">Primero seleccione la cantidad de personas</p>
                            )}
                            {grupoSeleccionado === 'Hidromasajes' && cantidadPersonas === 4 && tieneCalentadorGas === undefined && (
                                <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 ml-2 tracking-wider">Primero indique si tiene calentador a gas</p>
                            )}
                        </div>
                    </div>

                    {/* Adjuntar fotos y orden de compra Section */}
                    <div className="md:col-span-2 bg-white p-6 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-white">
                        <h3 className="font-black text-brand uppercase text-sm tracking-widest flex items-center gap-2 mb-4">
                            <Paperclip className="w-4 h-4" />
                            Adjuntar fotos y orden de compra ({adjuntos.length})
                        </h3>

                        <input
                            type="file"
                            multiple
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            className="hidden"
                            accept="image/*,video/*,.pdf"
                        />

                        <div
                            onClick={handleFileClick}
                            className="border-2 border-dashed border-slate-200 rounded-[1.5rem] p-8 flex flex-col items-center justify-center gap-3 hover:bg-slate-50 transition-all cursor-pointer group mb-4"
                        >
                            <div className="w-12 h-12 bg-slate-100 group-hover:bg-brand/10 rounded-full flex items-center justify-center transition-colors">
                                <Upload className="w-6 h-6 text-slate-400 group-hover:text-brand transition-colors" />
                            </div>
                            <p className="text-slate-400 group-hover:text-slate-600 font-bold text-sm transition-colors text-center">Presione para cargar fotos, videos o PDF de la orden de compra</p>
                            <p className="text-xs text-slate-300 font-medium uppercase tracking-tighter">Imágenes (JPG, PNG), Videos (MP4), Documentos (PDF)</p>
                        </div>

                        {/* File Preview List */}
                        {adjuntos.length > 0 && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                {adjuntos.map((file, idx) => {
                                    const isImage = file.type.startsWith('image/');
                                    const isVideo = file.type.startsWith('video/');
                                    const isPdf = file.type === 'application/pdf';
                                    const previewUrl = (isImage || isVideo) ? URL.createObjectURL(file) : null;

                                    return (
                                        <div key={idx} className="relative group bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                                            {/* Preview/Icon */}
                                            <div className="h-24 w-full flex items-center justify-center bg-slate-100 overflow-hidden relative">
                                                {isImage && previewUrl ? (
                                                    <img src={previewUrl} alt="Preview" className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                                ) : isVideo && previewUrl ? (
                                                    <video src={previewUrl} className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-500" muted />
                                                ) : (
                                                    <FileText className="w-10 h-10 text-brand/30" />
                                                )}
                                                
                                                {isVideo && (
                                                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                                                        <Video className="w-6 h-6 text-white drop-shadow-md" />
                                                    </div>
                                                )}

                                                {/* Overlay with Remove Button */}
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                    <button
                                                        type="button"
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
                            Crear Pedido
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
            </AnimatePresence>
        </div>
    );
}
