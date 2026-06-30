'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
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
    Pencil,
    MapPin,
    Phone,
    Building2,
    Minus,
    PlusCircle as PlusCircleIcon,
    Video,
    Eye,
    EyeOff,
    Maximize2
} from 'lucide-react';
import BuscadorClientes from '@/components/solicitar-servicio/BuscadorClientes';
import BuscadorClienteFinal from '@/components/solicitar-servicio/BuscadorClienteFinal';
import BuscadorProductos from '@/components/solicitar-servicio/BuscadorProductos';
import BuscadorRepuestos from '@/components/solicitar-servicio/BuscadorRepuestos';
import ModalCrearSala from '@/components/base-de-datos/ModalCrearSala';
import ModalEditSala from '@/components/base-de-datos/ModalEditSala';
import ModalCrearClienteFinal from '@/components/base-de-datos/ModalCrearClienteFinal';

interface SolicitarServicioProps {
    isInline?: boolean;
    defaultSolicitudId?: string;
    onSuccess?: () => void;
}

export default function SolicitarServicioPage({ isInline = false, defaultSolicitudId, onSuccess }: SolicitarServicioProps = {}) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [nextConsecutivo, setNextConsecutivo] = useState<number>(1);
    const [randomSuffix, setRandomSuffix] = useState<string>('');
    const [parentServiceId, setParentServiceId] = useState<string | null>(null);

    // Form States
    const [consecutivo, setConsecutivo] = useState('');
    const [numeroPedido, setNumeroPedido] = useState('');
    const [tipoServicio, setTipoServicio] = useState('');
    const [canalVenta, setCanalVenta] = useState('');
    const [facturado, setFacturado] = useState(false);
    const [decisionCliente, setDecisionCliente] = useState('');
    const [observaciones, setObservaciones] = useState('');
    const [llevaClienteFinal, setLlevaClienteFinal] = useState(true);
    const [solicitudConsecutivo, setSolicitudConsecutivo] = useState<string | null>(null);

    // Selection States
    const [clienteSeleccionado, setClienteSeleccionado] = useState<any>(null);
    const [clienteFinalSeleccionado, setClienteFinalSeleccionado] = useState<any>(null);
    const [productosSeleccionados, setProductosSeleccionados] = useState<any[]>([]);
    const [repuestosSeleccionados, setRepuestosSeleccionados] = useState<any[]>([]);
    const [adjuntos, setAdjuntos] = useState<{ file?: File; url?: string; name?: string; isHidden: boolean }[]>([]);
    const [previewFile, setPreviewFile] = useState<any>(null);

    // Modal Control States
    const [showBuscadorClientes, setShowBuscadorClientes] = useState(false);
    const [showBuscadorClienteFinal, setShowBuscadorClienteFinal] = useState(false);
    const [showBuscadorProductos, setShowBuscadorProductos] = useState(false);
    const [showBuscadorRepuestos, setShowBuscadorRepuestos] = useState(false);
    const [showEditSala, setShowEditSala] = useState(false);
    const [showEditClienteFinal, setShowEditClienteFinal] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const tipoServicioRef = useRef<HTMLSelectElement>(null);
    const canalVentaRef = useRef<HTMLSelectElement>(null);
    const clienteRef = useRef<HTMLDivElement>(null);
    const repuestosRef = useRef<HTMLDivElement>(null);
    const observacionesRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        const init = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push('/login');
                return;
            }

            // Fetch user and consecutivo in parallel
            const [userRes, consecRes] = await Promise.all([
                supabase.from('Usuarios').select('*').eq('user_id', session.user.id).single(),
                supabase.from('nuevo_consecutivo').select('nuevo_consecutivo').limit(1).single()
            ]);

            if (userRes.data) setCurrentUser(userRes.data);
            if (consecRes.data) setNextConsecutivo(consecRes.data.nuevo_consecutivo);

            // Generate 5-digit random suffix
            const random = Math.floor(10000 + Math.random() * 90000).toString();
            setRandomSuffix(random);

            // Handle parent service pre-fill
            const parentId = searchParams.get('parent_id');
            if (parentId) {
                setParentServiceId(parentId);
                const { data: parentData } = await supabase
                    .from('Servicios')
                    .select('*, Ubicaciones(*), Consumidores(*)')
                    .eq('id', parentId)
                    .single();

                if (parentData) {
                    setCanalVenta(parentData.canal_de_venta);
                    setClienteSeleccionado(parentData.Ubicaciones);
                    setClienteFinalSeleccionado(parentData.Consumidores);
                    if (parentData.numero_de_pedido) {
                        setNumeroPedido(parentData.numero_de_pedido);
                    }

                    // Logic for tipo_de_servicio
                    if (parentData.tipo_de_servicio === 'visita_instalacion') {
                        setTipoServicio('instalacion');
                    } else {
                        setTipoServicio('garantia_sin_pedido');
                    }

                    setObservaciones(`Este es un servicio enlazado y el servicio original es ${parentData.consecutivo}`);

                    // Fetch products from parent service
                    const { data: productsData } = await supabase
                        .from('productos_servicios')
                        .select('*, Productos(*)')
                        .eq('servicio_id', parentId);
                    
                    if (productsData) {
                        const formattedProducts = productsData.map(ps => ({
                            ...ps.Productos,
                            cantidad: ps.cantidad
                        }));
                        setProductosSeleccionados(formattedProducts);
                    }
                }
            }

            // Handle solicitud_id pre-fill
            const solicitudId = defaultSolicitudId || searchParams.get('solicitud_id');
            if (solicitudId) {
                const { data: solicitudData } = await supabase
                    .from('solicitudes_clientes')
                    .select('*')
                    .eq('id', solicitudId)
                    .single();

                if (solicitudData) {
                    setLlevaClienteFinal(true);
                    setCanalVenta('canal_propio_ecommerce');
                    if (solicitudData.consecutivo) {
                        setSolicitudConsecutivo(solicitudData.consecutivo);
                    }
                    if (solicitudData.tipodeservicio) {
                        const tipo = solicitudData.tipodeservicio.toLowerCase();
                        if (tipo.includes('visita')) {
                            setTipoServicio('visita_instalacion');
                        } else if (tipo.includes('instalaci')) {
                            setTipoServicio('instalacion');
                        }
                    }
                    // Mapear los datos de la solicitud al cliente final seleccionado (aunque no tenga ID en BD aún)
                    // Se creará en la BD automáticamente al guardar el servicio si no tiene ID.
                    setClienteFinalSeleccionado({
                        cedula: solicitudData.numeroid,
                        contacto: solicitudData.nombre_razon_social,
                        telefono: solicitudData.telefono,
                        direccion: solicitudData.direccion,
                        ciudad: solicitudData.ciudad,
                        correo_electronico: solicitudData.correo_electronico,
                        _search_type: 'consumidor'
                    });

                    // Auto-attach files from solicitud
                    const newAdjuntos = [];
                    if (solicitudData.soporte_pago_url) newAdjuntos.push({ url: solicitudData.soporte_pago_url, name: 'Soporte de Pago', isHidden: true }); // Facturado/Pago usually hidden
                    if (solicitudData.factura_url) newAdjuntos.push({ url: solicitudData.factura_url, name: 'Factura', isHidden: true });
                    if (solicitudData.rut_url) newAdjuntos.push({ url: solicitudData.rut_url, name: 'RUT / Cédula', isHidden: true });
                    if (newAdjuntos.length > 0) setAdjuntos(newAdjuntos);
                }
            }

            // Handle ubicacion_id pre-fill (from sala-details)
            const ubicacionId = searchParams.get('ubicacion_id');
            if (ubicacionId) {
                const { data: ubicacionData } = await supabase
                    .from('Ubicaciones')
                    .select('*')
                    .eq('id', ubicacionId)
                    .single();

                if (ubicacionData) {
                    setClienteSeleccionado(ubicacionData);
                    // Decide canalVenta based on ubicacionData or default to canal_ditribuidor
                    if (ubicacionData.id === 515 || ubicacionData.id === 516) {
                        setCanalVenta('canal_propio_ecommerce');
                        setLlevaClienteFinal(true);
                    } else {
                        setCanalVenta('canal_ditribuidor');
                    }
                    
                    // Fetch products of this ubicacion as default? 
                    // Wait, in FF it auto-populates products from exhibiciones.
                    const { data: exhibicionesData } = await supabase
                        .from('query_exhibiciones')
                        .select('*')
                        .eq('ubicacion_id', ubicacionId);

                    if (exhibicionesData) {
                        const formattedProducts = exhibicionesData.map(ps => ({
                            id: ps.producto_id,
                            sku: ps.producto_sku,
                            nombre: ps.producto_descripcion,
                            cantidad: 1
                        }));
                        setProductosSeleccionados(formattedProducts);
                    }
                }
            }

            setLoading(false);
        };

        init();
    }, [router]);

    // Update consecutivo when tipoServicio or user changes
    useEffect(() => {
        if (solicitudConsecutivo) {
            setConsecutivo(solicitudConsecutivo);
            return;
        }

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
    }, [tipoServicio, currentUser, randomSuffix, facturado, solicitudConsecutivo]);

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
            const newFiles = Array.from(e.target.files).map(file => ({
                file,
                isHidden: false
            }));
            setAdjuntos(prev => [...prev, ...newFiles]);
        }
    };

    const toggleVisibility = (index: number) => {
        setAdjuntos(prev => prev.map((item, i) => 
            i === index ? { ...item, isHidden: !item.isHidden } : item
        ));
    };

    const removeAdjunto = (index: number) => {
        setAdjuntos(prev => prev.filter((_, i) => i !== index));
    };

    const uploadFiles = async (items: { file?: File; url?: string; name?: string; isHidden: boolean }[]) => {
        const uploadPromises = items.map(async (item) => {
            const { file, url, isHidden } = item;
            
            // If it already has a URL, no need to upload
            if (url) {
                return { url, isHidden };
            }

            if (!file) return null;

            try {
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

                const folderPath = sanitizePath(consecutivo || 'temp');
                const filePath = `${folderPath}/documentos/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('servicios')
                    .upload(filePath, file);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('servicios')
                    .getPublicUrl(filePath);

                return { url: publicUrl, isHidden };
            } catch (error) {
                console.error('Error uploading file:', error);
                return null;
            }
        });

        const results = await Promise.all(uploadPromises);
        const validResults = results.filter((r): r is { url: string; isHidden: boolean } => r !== null);
        
        return {
            allUrls: validResults.map(r => r.url),
            hiddenUrls: validResults.filter(r => r.isHidden).map(r => r.url)
        };
    };

    const handleSave = async () => {
        if (!tipoServicio) {
            alert('Por favor complete el campo obligatorio: Tipo de servicio');
            tipoServicioRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            tipoServicioRef.current?.focus();
            return;
        }

        if (!observaciones || observaciones.trim() === '') {
            alert('Por favor complete el campo obligatorio: Comentarios / Observaciones');
            observacionesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            observacionesRef.current?.focus();
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
                // Requieren aprobación del director si no son facturados
                if ((t === 'visita_instalacion' || t === 'mantenimiento_con_kit') && !facturado) {
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
            const { allUrls, hiddenUrls } = await uploadFiles(adjuntos);

            // 2. Prepare Approval Logic & Coordinator Assignment
            const aprobacionDirector = determineApproval(tipoServicio, facturado, 'director');
            const aprobacionLogistica = determineApproval(tipoServicio, facturado, 'logistica');
            const aprobacionMac = determineApproval(tipoServicio, facturado, 'mac');
            const aplicaTecnico = determineAplicaTecnico(tipoServicio);

            let finalCoordinadorId = null;
            let zoneId = clienteFinalSeleccionado?.zona_id || clienteSeleccionado?.zona_id;

            // Auto-create Consumidor if it doesn't have an ID
            let finalConsumidorId = llevaClienteFinal ? (clienteFinalSeleccionado?.id || null) : null;
            if (llevaClienteFinal && clienteFinalSeleccionado && !clienteFinalSeleccionado.id) {
                let ciudadId = null;
                if (clienteFinalSeleccionado.ciudad) {
                    const { data: cityData } = await supabase
                        .from('ciudades')
                        .select('id, zona_id')
                        .ilike('ciudad', `%${clienteFinalSeleccionado.ciudad}%`)
                        .limit(1)
                        .single();
                    if (cityData) {
                        ciudadId = cityData.id;
                        if (!zoneId && cityData.zona_id) {
                            zoneId = cityData.zona_id;
                        }
                    }
                }

                const { data: savedId, error: saveError } = await supabase
                    .rpc('upsert_consumidor_with_return', {
                        p_cedula: clienteFinalSeleccionado.cedula,
                        p_contacto: clienteFinalSeleccionado.contacto,
                        p_telefono: clienteFinalSeleccionado.telefono,
                        p_direccion: clienteFinalSeleccionado.direccion,
                        p_correo_electronico: clienteFinalSeleccionado.correo_electronico,
                        p_ciudad_id: ciudadId,
                        p_barrio: null,
                        p_descripcion_direccion: null
                    });

                if (!saveError && savedId) {
                    finalConsumidorId = savedId;
                } else if (saveError) {
                    console.error("Error al auto-crear consumidor:", saveError);
                }
            }

            // Determine Coordinator based on Zone (as requested)
            let zoneId = clienteFinalSeleccionado?.zona_id || clienteSeleccionado?.zona_id;

            if (!zoneId && clienteSeleccionado?.ciudad_id) {
                const { data: cityData } = await supabase.from('ciudades').select('zona_id').eq('id', clienteSeleccionado.ciudad_id).single();
                if (cityData?.zona_id) zoneId = cityData.zona_id;
            }

            // Fallback for Ecommerce if no client zone
            if (!zoneId && isEcommerce) {
                zoneId = 985; // Antioquia/Firplak B2C
            }

            if (zoneId) {
                const { data: zonaData } = await supabase
                    .from('Zonas')
                    .select('coordinador_id')
                    .eq('id', zoneId)
                    .single();
                
                if (zonaData) {
                    finalCoordinadorId = zonaData.coordinador_id;
                }
            }

            // Last resort fallback to the ID present in the view if lookup failed
            if (!finalCoordinadorId) {
                finalCoordinadorId = clienteFinalSeleccionado?.coordinador_id || clienteFinalSeleccionado?.coordinadorId || 
                                     clienteSeleccionado?.coordinador_id || clienteSeleccionado?.coordinadorId;
            }

            // --- FIX POWER AUTOMATE ERROR ---
            // Si después de todo el coordinador sigue siendo null, asignamos un coordinador por defecto 
            // (ej: 26) para evitar que el flujo de Power Automate falle esperando un string.
            if (!finalCoordinadorId) {
                finalCoordinadorId = 26; // Coordinador MAC por defecto
            }

            // 3. Insert Servicio
            const { data: servicioData, error: servicioError } = await supabase
                .from('Servicios')
                .insert({
                    consecutivo: consecutivo,
                    numero_de_pedido: numeroPedido,
                    comercial_id: currentUser?.id,
                    consumidor_id: finalConsumidorId,
                    estado: true,
                    ubicacion_id: canalVenta === 'canal_propio_ecommerce' ? 2126 : clienteSeleccionado?.id,
                    coordinador_id: finalCoordinadorId,
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
                    service_parent_id: parentServiceId ? parseInt(parentServiceId) : null,
                    soportes_pago: hiddenUrls
                })
                .select()
                .single();

            if (servicioError) throw servicioError;

            // 4, 5 & 6. Execute remaining inserts in parallel for better performance
            const postCreationTasks = [];

            // Add Comment task
            if (observaciones || allUrls.length > 0) {
                postCreationTasks.push(
                    supabase.from('Comentarios').insert({
                        servicio_id: servicioData.id,
                        contenido: observaciones || 'Anexos adjuntos',
                        documentos: allUrls,
                        usuario_id: currentUser?.id,
                        tipo: 'solicitud_servicio'
                    })
                );
            }

            // Add Products task
            if (productosSeleccionados.length > 0) {
                const productosToInsert = productosSeleccionados.map(p => ({
                    servicio_id: servicioData.id,
                    producto_id: p.id,
                    cantidad: p.cantidad || 1
                }));
                postCreationTasks.push(
                    supabase.from('productos_servicios').insert(productosToInsert)
                );
            }

            // Add Repuestos task
            if (repuestosSeleccionados.length > 0) {
                const repuestosToInsert = repuestosSeleccionados.map(r => ({
                    servicio_id: servicioData.id,
                    repuesto_id: r.id,
                    cantidad: r.cantidad || 1
                }));
                postCreationTasks.push(
                    supabase.from('Repuestos_Servicios').insert(repuestosToInsert)
                );
            }

            // Execute all secondary tasks in parallel
            if (postCreationTasks.length > 0) {
                const results = await Promise.all(postCreationTasks);
                // Check for errors in parallel tasks
                const taskError = results.find(r => r.error);
                if (taskError) throw taskError.error;
            }

            alert('Servicio creado correctamente');
            handleClear();
            if (onSuccess) {
                onSuccess();
            } else {
                router.push('/');
            }

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
        <div className={isInline ? "pb-10" : "min-h-screen bg-[#F1F5F9] text-slate-800 font-sans pb-10"}>
            {!isInline && (
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
            )}

            <main className={`${isInline ? "" : "pt-24 px-4 max-w-4xl mx-auto"}`}>
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

                            <div className="space-y-1.5">
                                <label className="text-sm font-bold text-brand ml-1">Canal de venta *</label>
                                <select
                                    ref={canalVentaRef}
                                    value={canalVenta}
                                    onChange={(e) => {
                                        const newVal = e.target.value;
                                        setCanalVenta(newVal);
                                        setClienteSeleccionado(null);
                                        setClienteFinalSeleccionado(null);
                                        setLlevaClienteFinal(newVal === 'canal_propio_ecommerce');
                                    }}
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
                    {canalVenta && canalVenta !== 'canal_propio_ecommerce' && (
                        <div ref={clienteRef} className="bg-white p-6 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-white flex flex-col gap-4">
                            <div className="flex items-center justify-between">
                                <h3 className="font-black text-brand uppercase text-sm tracking-widest flex items-center gap-2">
                                    <User className="w-4 h-4" />
                                    {!canalVenta 
                                        ? 'Seleccione Canal' 
                                        : canalVenta === 'canal_constructor' 
                                            ? 'Cliente Constructor' 
                                            : canalVenta === 'canal_propio_firplakhome'
                                                ? 'Cliente Firplakhome'
                                                : 'Cliente Distribuidor'
                                    }
                                </h3>
                                {clienteSeleccionado && (
                                    <div className="flex items-center gap-2">
                                        <button 
                                            onClick={() => setShowEditSala(true)}
                                            className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
                                            title="Editar datos de ubicación"
                                        >
                                            <Pencil className="w-3.5 h-3.5" />
                                            Editar
                                        </button>
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={() => canalVenta && setShowBuscadorClientes(true)}
                                disabled={!canalVenta}
                                className={`w-full p-4 border-2 rounded-2xl transition-all font-black text-sm flex items-center justify-center gap-2 ${!canalVenta
                                    ? 'bg-slate-50 border-slate-100 text-slate-300 border-dashed'
                                    : clienteSeleccionado
                                        ? 'bg-brand/5 border-brand text-brand shadow-md'
                                        : 'border-slate-200 border-dashed hover:bg-slate-50 text-slate-400'
                                    }`}
                            >
                                {clienteSeleccionado ? clienteSeleccionado.nombre : canalVenta ? 'Presione para buscar cliente...' : 'Seleccione canal de venta primero'}
                            </button>

                            {clienteSeleccionado && (
                                <div className="space-y-3 bg-slate-50/80 p-4 rounded-2xl border border-slate-100/50">
                                    <div className="flex items-center justify-between group">
                                        <div className="flex items-center gap-2 text-slate-400">
                                            <MapPin className="w-3.5 h-3.5" />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Dirección</span>
                                        </div>
                                        <span className="text-xs font-bold text-slate-700 text-right max-w-[60%] line-clamp-1">{clienteSeleccionado?.direccion || '---'}</span>
                                    </div>
                                    <div className="flex items-center justify-between group">
                                        <div className="flex items-center gap-2 text-slate-400">
                                            <Phone className="w-3.5 h-3.5" />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Teléfono</span>
                                        </div>
                                        <span className="text-xs font-bold text-slate-700">{clienteSeleccionado?.telefono || '---'}</span>
                                    </div>
                                    <div className="flex items-center justify-between group">
                                        <div className="flex items-center gap-2 text-slate-400">
                                            <User className="w-3.5 h-3.5" />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Contacto</span>
                                        </div>
                                        <span className="text-xs font-bold text-slate-700 text-right max-w-[60%] line-clamp-1">{clienteSeleccionado?.nombre_contacto || clienteSeleccionado?.contacto || '---'}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Cliente Final Selection */}
                    {canalVenta && (
                        <div className="bg-white p-6 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-white flex flex-col gap-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-colors ${llevaClienteFinal ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                                    <User className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest">
                                        Cliente Final
                                    </h3>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                                        {llevaClienteFinal ? 'Información del consumidor' : 'Sin cliente final'}
                                    </p>
                                </div>
                            </div>

                            {clienteFinalSeleccionado && (
                                <button 
                                    onClick={() => setShowEditClienteFinal(true)}
                                    className="p-2 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
                                    title="Editar datos de cliente final"
                                >
                                    <Pencil className="w-3.5 h-3.5" />
                                    Editar
                                </button>
                            )}

                            <button 
                                onClick={() => {
                                    setLlevaClienteFinal(!llevaClienteFinal);
                                    if (llevaClienteFinal) setClienteFinalSeleccionado(null);
                                }}
                                className={`w-14 h-8 rounded-full transition-all flex items-center p-1 shadow-inner ${llevaClienteFinal ? 'bg-emerald-500' : 'bg-slate-200'}`}
                            >
                                <motion.div 
                                    animate={{ x: llevaClienteFinal ? 24 : 0 }}
                                    className="w-6 h-6 bg-white rounded-full shadow-md"
                                />
                            </button>
                        </div>

                        {llevaClienteFinal && (
                            <motion.div 
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="space-y-4"
                            >
                                <button
                                    onClick={() => setShowBuscadorClienteFinal(true)}
                                    className={`w-full p-4 border-2 rounded-2xl transition-all font-black text-sm flex items-center justify-center gap-2 ${clienteFinalSeleccionado
                                        ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm'
                                        : 'border-2 border-dashed border-slate-200 hover:bg-slate-50 text-slate-400'
                                        }`}
                                >
                                    {clienteFinalSeleccionado ? (clienteFinalSeleccionado._search_type === 'ubicacion' ? (clienteFinalSeleccionado.nombre || clienteFinalSeleccionado.cliente_nombre) : clienteFinalSeleccionado.contacto) : 'Presione para buscar cliente final...'}
                                </button>

                                <div className="space-y-3 bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100/50">
                                    <div className="flex items-center justify-between group">
                                        <div className="flex items-center gap-2 text-emerald-600/60">
                                            <Building2 className="w-3.5 h-3.5" />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Ciudad</span>
                                        </div>
                                        <span className="text-xs font-bold text-emerald-800">{clienteFinalSeleccionado?.ciudad || '---'}</span>
                                    </div>
                                    <div className="flex items-center justify-between group">
                                        <div className="flex items-center gap-2 text-emerald-600/60">
                                            <MapPin className="w-3.5 h-3.5" />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Dirección</span>
                                        </div>
                                        <span className="text-xs font-bold text-emerald-800 text-right max-w-[60%] line-clamp-1">{clienteFinalSeleccionado?.direccion || '---'}</span>
                                    </div>
                                    <div className="flex items-center justify-between group">
                                        <div className="flex items-center gap-2 text-emerald-600/60">
                                            <Phone className="w-3.5 h-3.5" />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Teléfono</span>
                                        </div>
                                        <span className="text-xs font-bold text-emerald-800">{clienteFinalSeleccionado?.telefono || '---'}</span>
                                    </div>
                                </div>
                            </motion.div>
                        )}
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
                                    <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group gap-4">
                                        <div className="flex flex-col flex-1 min-w-0">
                                            <span className="text-[10px] font-black text-brand uppercase tracking-wider">{prod.sku}</span>
                                            <span className="text-xs font-bold text-slate-700 uppercase leading-tight">{prod.nombre}</span>
                                            {(prod.color_base || prod.color_mueble) && (
                                                <span className="text-[9px] text-slate-400 font-medium uppercase mt-1">
                                                    {prod.color_base && `Base: ${prod.color_base}`}
                                                    {prod.color_base && prod.color_mueble && ' | '}
                                                    {prod.color_mueble && `Mueble: ${prod.color_mueble}`}
                                                </span>
                                            )}
                                        </div>
                                        
                                        <div className="flex items-center bg-white rounded-xl border border-slate-200 p-1 shadow-sm">
                                            <button 
                                                onClick={() => {
                                                    const newQty = Math.max(1, (prod.cantidad || 1) - 1);
                                                    setProductosSeleccionados(prev => prev.map((p, i) => i === idx ? { ...p, cantidad: newQty } : p));
                                                }}
                                                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors"
                                            >
                                                <Minus className="w-3.5 h-3.5" />
                                            </button>
                                            <span className="px-3 text-xs font-black text-brand min-w-[2rem] text-center">
                                                {prod.cantidad || 1}
                                            </span>
                                            <button 
                                                onClick={() => {
                                                    const newQty = (prod.cantidad || 1) + 1;
                                                    setProductosSeleccionados(prev => prev.map((p, i) => i === idx ? { ...p, cantidad: newQty } : p));
                                                }}
                                                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors"
                                            >
                                                <Plus className="w-3.5 h-3.5" />
                                            </button>
                                        </div>

                                        <button
                                            onClick={() => setProductosSeleccionados(prev => prev.filter((_, i) => i !== idx))}
                                            className="p-2 text-slate-300 hover:text-red-500 transition-colors flex-shrink-0"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Repuestos Section - Conditional Visibility */}
                    <AnimatePresence>
                        {(tipoServicio.toLowerCase().includes('kit') || 
                          tipoServicio.toLowerCase().includes('repuesto') || 
                          tipoServicio.toLowerCase().includes('reposicion')) && (
                            <motion.div 
                                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                animate={{ opacity: 1, height: 'auto', marginTop: 24 }}
                                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                                className="md:col-span-2 overflow-hidden"
                            >
                                <div ref={repuestosRef} className="bg-white p-6 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-white">
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
                                                <div key={idx} className="flex items-center justify-between p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 group gap-4">
                                                    <div className="flex flex-col flex-1 min-w-0">
                                                        <span className="text-[10px] font-black text-indigo-600 uppercase tracking-wider">{rep.sku}</span>
                                                        <span className="text-xs font-bold text-slate-700 uppercase leading-tight">{rep.nombre}</span>
                                                    </div>

                                                    <div className="flex items-center bg-white rounded-xl border border-indigo-100 p-1 shadow-sm">
                                                        <button 
                                                            onClick={() => {
                                                                const newQty = Math.max(1, (rep.cantidad || 1) - 1);
                                                                setRepuestosSeleccionados(prev => prev.map((p, i) => i === idx ? { ...p, cantidad: newQty } : p));
                                                            }}
                                                            className="p-1 hover:bg-indigo-50 rounded-lg text-indigo-400 transition-colors"
                                                        >
                                                            <Minus className="w-3.5 h-3.5" />
                                                        </button>
                                                        <span className="px-3 text-xs font-black text-indigo-600 min-w-[2rem] text-center">
                                                            {rep.cantidad || 1}
                                                        </span>
                                                        <button 
                                                            onClick={() => {
                                                                const newQty = (rep.cantidad || 1) + 1;
                                                                setRepuestosSeleccionados(prev => prev.map((p, i) => i === idx ? { ...p, cantidad: newQty } : p));
                                                            }}
                                                            className="p-1 hover:bg-indigo-50 rounded-lg text-indigo-400 transition-colors"
                                                        >
                                                            <Plus className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>

                                                    <button
                                                        onClick={() => setRepuestosSeleccionados(prev => prev.filter((_, i) => i !== idx))}
                                                        className="p-2 text-slate-300 hover:text-red-500 transition-colors flex-shrink-0"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

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
                            accept="image/*,video/*,.pdf"
                        />

                        <div
                            onClick={handleFileClick}
                            className="border-2 border-dashed border-slate-200 rounded-[1.5rem] p-8 flex flex-col items-center justify-center gap-3 hover:bg-slate-50 transition-all cursor-pointer group mb-4"
                        >
                            <div className="w-12 h-12 bg-slate-100 group-hover:bg-indigo-50 rounded-full flex items-center justify-center transition-colors">
                                <Upload className="w-6 h-6 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                            </div>
                            <p className="text-slate-400 group-hover:text-slate-600 font-bold text-sm transition-colors">Presione para cargar archivos...</p>
                            <p className="text-xs text-slate-300 font-medium">Imágenes, Videos, PDF</p>
                        </div>

                        {/* File Preview List */}
                        {adjuntos.length > 0 && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                {adjuntos.map((item, idx) => {
                                    const { file, url, name, isHidden } = item;
                                    const isImage = file ? file.type.startsWith('image/') : url?.match(/\.(jpeg|jpg|gif|png|webp|jfif)(\?.*)?$/i) != null;
                                    const isVideo = file ? file.type.startsWith('video/') : url?.match(/\.(mp4|webm|ogg|mov)(\?.*)?$/i) != null;
                                    const previewUrl = file ? URL.createObjectURL(file) : url;
                                    const displayName = file ? file.name : name;
                                    const displaySize = file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : 'Enlace adjunto';

                                    return (
                                        <div key={idx} className={`relative group bg-slate-50 rounded-xl border overflow-hidden transition-all ${isHidden ? 'border-amber-200 ring-2 ring-amber-500/20' : 'border-slate-200'}`}>
                                            {/* Preview/Icon */}
                                            <div className="h-24 w-full flex items-center justify-center bg-slate-100 overflow-hidden relative">
                                                {isImage && previewUrl ? (
                                                    <img
                                                        src={previewUrl}
                                                        alt="preview"
                                                        className={`w-full h-full object-cover ${isHidden ? 'grayscale opacity-50' : ''}`}
                                                    />
                                                ) : isVideo ? (
                                                    <div className={`flex flex-col items-center gap-1 ${isHidden ? 'opacity-40' : ''}`}>
                                                        <Video className="w-10 h-10 text-brand" />
                                                        <span className="text-[8px] font-black uppercase text-brand/60">Video</span>
                                                    </div>
                                                ) : (
                                                    <div className={`${isHidden ? 'opacity-40' : ''}`}>
                                                        <FileText className="w-10 h-10 text-slate-400" />
                                                    </div>
                                                )}

                                                {/* Visibility Status Badge */}
                                                {isHidden && (
                                                    <div className="absolute top-2 left-2 px-2 py-0.5 bg-amber-500 text-white text-[8px] font-black uppercase rounded-lg shadow-lg z-10 flex items-center gap-1">
                                                        <EyeOff className="w-2.5 h-2.5" />
                                                        Privado
                                                    </div>
                                                )}

                                                {/* Overlay with Actions */}
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            toggleVisibility(idx);
                                                        }}
                                                        className={`p-2 rounded-full transition-colors shadow-lg ${isHidden ? 'bg-amber-500 text-white hover:bg-amber-600' : 'bg-white/20 backdrop-blur-md text-white hover:bg-white/40'}`}
                                                        title={isHidden ? "Hacer visible para técnico" : "Ocultar para técnico"}
                                                    >
                                                        {isHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (file) setPreviewFile(file);
                                                            else window.open(url, '_blank');
                                                        }}
                                                        className="bg-white/20 backdrop-blur-md text-white p-2 rounded-full hover:bg-white/40 transition-colors shadow-lg"
                                                        title="Ver archivo"
                                                    >
                                                        <Maximize2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            removeAdjunto(idx);
                                                        }}
                                                        className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors shadow-lg"
                                                        title="Eliminar"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* File Info */}
                                            <div className="p-2 bg-white">
                                                <p className="text-[10px] font-bold text-slate-700 truncate" title={displayName}>{displayName}</p>
                                                <p className="text-[9px] text-slate-400 font-medium">{displaySize}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Observaciones */}
                    <div className="md:col-span-2 bg-white p-8 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-white">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">
                            Comentarios / Observaciones
                        </label>
                        <textarea
                            ref={observacionesRef}
                            value={observaciones}
                            onChange={(e) => setObservaciones(e.target.value)}
                            rows={4}
                            className={`w-full p-6 bg-slate-50 border rounded-2xl focus:outline-none transition-all font-medium text-slate-700 resize-none ${
                                !observaciones.trim() ? 'border-rose-200 focus:border-rose-300' : 'border-slate-100 focus:border-brand/20 focus:ring-4 focus:ring-brand/5'
                            }`}
                            placeholder="Escriba aquí los detalles adicionales del servicio..."
                        />
                        {!observaciones.trim() && (
                            <p className="mt-2 text-[10px] font-bold text-rose-500 uppercase tracking-widest">
                                Este campo es obligatorio
                            </p>
                        )}
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
                {showEditSala && (
                    <ModalEditSala
                        isOpen={showEditSala}
                        initialData={clienteSeleccionado}
                        onClose={() => setShowEditSala(false)}
                        onSuccess={async () => {
                            // Refresh selected client data
                            const { data } = await supabase
                                .from('query_ubicaciones_fast')
                                .select('*')
                                .eq('id', clienteSeleccionado.id)
                                .single();
                            if (data) setClienteSeleccionado(data);
                            setShowEditSala(false);
                        }}
                    />
                )}
                {showEditClienteFinal && (
                    <ModalCrearClienteFinal
                        isOpen={showEditClienteFinal}
                        initialData={{
                            ...clienteFinalSeleccionado,
                            // Map fields if necessary (ModalCrearClienteFinal uses specific names)
                            contacto: clienteFinalSeleccionado.contacto,
                            cedula: clienteFinalSeleccionado.cedula,
                            correo_electronico: clienteFinalSeleccionado.correo_electronico,
                            telefono: clienteFinalSeleccionado.telefono
                        }}
                        onClose={() => setShowEditClienteFinal(false)}
                        onSuccess={async () => {
                            // Refresh selected consumer data
                            const { data } = await supabase
                                .from('query_consumidores')
                                .select('*')
                                .eq('id', clienteFinalSeleccionado.id)
                                .single();
                            if (data) setClienteFinalSeleccionado(data);
                            setShowEditClienteFinal(false);
                        }}
                    />
                )}

                {/* Attachment Preview Modal */}
                {previewFile && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-sm"
                        onClick={() => setPreviewFile(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="relative max-w-4xl w-full bg-white rounded-[2rem] overflow-hidden shadow-2xl"
                        >
                            <button
                                onClick={() => setPreviewFile(null)}
                                className="absolute top-4 right-4 z-10 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>

                            <div className="p-8">
                                <div className="mb-4">
                                    <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight truncate pr-12">
                                        {previewFile.name}
                                    </h3>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                                        {(previewFile.size / 1024 / 1024).toFixed(2)} MB • {previewFile.type}
                                    </p>
                                </div>

                                <div className="bg-slate-100 rounded-2xl overflow-hidden flex items-center justify-center min-h-[300px] max-h-[70vh]">
                                    {previewFile.type.startsWith('image/') ? (
                                        <img
                                            src={URL.createObjectURL(previewFile)}
                                            alt="Preview"
                                            className="max-w-full max-h-full object-contain shadow-inner"
                                        />
                                    ) : previewFile.type.startsWith('video/') ? (
                                        <video
                                            controls
                                            autoPlay
                                            className="max-w-full max-h-full shadow-inner"
                                            src={URL.createObjectURL(previewFile)}
                                        />
                                    ) : previewFile.type === 'application/pdf' ? (
                                        <iframe
                                            src={URL.createObjectURL(previewFile)}
                                            className="w-full h-[60vh] border-none shadow-inner rounded-xl"
                                            title="PDF Preview"
                                        />
                                    ) : (
                                        <div className="flex flex-col items-center gap-4 text-slate-400">
                                            <FileText className="w-20 h-20" />
                                            <p className="font-bold">No hay vista previa disponible para este formato</p>
                                            <a
                                                href={URL.createObjectURL(previewFile)}
                                                download={previewFile.name}
                                                className="px-6 py-2 bg-brand text-white rounded-full font-black text-xs uppercase"
                                            >
                                                Descargar para ver
                                            </a>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
