'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import PaymentModal from '@/components/PaymentModal';
import { FormularioClienteModel } from '@/types/formulario_cliente_model';
import { motion } from 'framer-motion';
import {
    Upload,
    CheckCircle2,
    AlertCircle,
    Loader2,
    FileText,
    User,
    MapPin,
    Package
} from 'lucide-react';

export default function FormularioClientePage() {
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form State
    const [formData, setFormData] = useState<FormularioClienteModel>({
        tipoPersona: 'Persona Natural',
        numeroId: '',
        razonSocial: '',
        personaContacto: '',
        correo_electronico: '',
        telefono: '',
        ciudad: '',
        direccion: '',
        puntoReferencia: '',
        tipoServicio: 'Instalación',
        grupo: '',
        medida: '',
        observaciones: '',
        confirmaRecepcion: true, // Default to true as requested
        valorPagar: 0,
    });

    // Data from database
    const [ciudades, setCiudades] = useState<any[]>([]);
    const [preciosZonas, setPreciosZonas] = useState<any[]>([]);
    const [grupos, setGrupos] = useState<string[]>([]);
    const [zonasMedidas, setZonasMedidas] = useState<any[]>([]); // All records from zonas_medidas
    const [medidas, setMedidas] = useState<any[]>([]); // Filtered medidas based on selected grupo


    // File uploads
    const [rutFile, setRutFile] = useState<File | null>(null);
    const [facturaFile, setFacturaFile] = useState<File | null>(null);
    const [uploadingRut, setUploadingRut] = useState(false);
    const [uploadingFactura, setUploadingFactura] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);

    // Consecutivo
    const [consecutivo, setConsecutivo] = useState<string>('');

    useEffect(() => {
        loadInitialData();
        generateConsecutivo();
    }, []);

    const generateConsecutivo = () => {
        const random = Math.floor(10000 + Math.random() * 90000);
        setConsecutivo(`Fpagina${random}`);
    };

    const loadInitialData = async () => {
        setLoading(true);
        try {
            console.log('Fetching initial data...');
            // Load precios zonas
            const { data: preciosData, error: preciosError } = await supabase
                .from('precioszonas')
                .select('*')
                .order('Ciudad');

            if (preciosData) {
                console.log('Precios loaded:', preciosData.length);
                setPreciosZonas(preciosData);

                // Extract unique cities from precioszonas
                const ciudadesUnicas = [...new Set(preciosData.map(item => item.Ciudad || item.ciudad))].filter(Boolean);
                setCiudades(ciudadesUnicas.map((ciudad, index) => ({ id: index, ciudad })));
            }

            // Load grupos from vw_zonas_medidas_descripciones view
            const { data: gruposData } = await supabase
                .from('vw_zonas_medidas_descripciones')
                .select('descripcion');

            if (gruposData) {
                const gruposUnicos = gruposData.map((item: any) => item.descripcion || item.description || item.Descripcion).filter(Boolean);
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

        } catch (err) {
            console.error('Error loading data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (file: File, type: 'rut' | 'factura') => {
        if (!file) return null;

        const fileExt = file.name.split('.').pop();
        const fileName = `${consecutivo}_${type}.${fileExt}`;
        const filePath = `${consecutivo}/${fileName}`;

        try {
            if (type === 'rut') setUploadingRut(true);
            if (type === 'factura') setUploadingFactura(true);

            const { data, error } = await supabase.storage
                .from('solicitudesclientes')
                .upload(filePath, file, { upsert: true });

            if (error) throw error;

            const { data: { publicUrl } } = supabase.storage
                .from('solicitudesclientes')
                .getPublicUrl(filePath);

            return publicUrl;
        } catch (err) {
            console.error(`Error uploading ${type}:`, err);
            return null;
        } finally {
            if (type === 'rut') setUploadingRut(false);
            if (type === 'factura') setUploadingFactura(false);
        }
    };



    // Filter medidas when grupo or cantidadPersonas changes
    useEffect(() => {
        if (formData.grupo && zonasMedidas.length > 0) {
            let medidasFiltradas = zonasMedidas.filter((zm: any) => (zm.descripcion || zm.Descripcion) === formData.grupo);

            // For Hidromasajes, also filter by cantidad_personas
            if (formData.grupo === 'Hidromasajes' && formData.cantidadPersonas) {
                medidasFiltradas = medidasFiltradas.filter((zm: any) => (zm.cantidad_personas || zm.cantidadPersonas) === formData.cantidadPersonas);
            }

            setMedidas(medidasFiltradas.map((zm: any) => ({
                medida: zm.medida || zm.Medida,
                precio: zm.precio || zm.Precio
            })));
            // Reset medida when grupo or cantidadPersonas changes
            setFormData(prev => ({ ...prev, medida: '' }));
        } else {
            setMedidas([]);
        }
    }, [formData.grupo, formData.cantidadPersonas, zonasMedidas]);

    // Calculate price when dependencies change
    useEffect(() => {
        // Guard: Don't calculate if data isn't loaded yet
        if (preciosZonas.length === 0 && zonasMedidas.length === 0) return;

        console.log('Calculating price...', {
            ciudad: formData.ciudad,
            medida: formData.medida,
            tipo: formData.tipoServicio,
            preciosLoaded: preciosZonas.length,
            medidasLoaded: zonasMedidas.length
        });

        if (formData.ciudad || formData.medida || formData.tipoServicio) {
            let precio = 0;

            // Get precio from ciudad using the Ciudad column from precioszonas
            const ciudadPrecio = preciosZonas.find((p: any) => (p.Ciudad || p.ciudad) === formData.ciudad);
            const tarifaRaw = ciudadPrecio ? (ciudadPrecio.Tarifa || ciudadPrecio.tarifa) : 0;
            let tarifaCiudad = tarifaRaw ? (parseFloat(tarifaRaw) || 0) : 0;

            // Rule: Double surcharge for Tubs and Whirlpools
            if (formData.grupo === 'Hidromasajes' || formData.grupo === 'Tinas') {
                tarifaCiudad = tarifaCiudad * 2;
            }

            // Get medida price from zonas_medidas
            let precioProducto = 0;
            if (formData.grupo && formData.medida) {
                const medidaData = zonasMedidas.find(
                    (zm: any) => (zm.descripcion || zm.Descripcion) === formData.grupo && (zm.medida || zm.Medida) === formData.medida
                );
                // Check possible price keys
                const precioVal = medidaData ? (medidaData.precio || medidaData.Precio) : 0;
                if (precioVal) {
                    precioProducto = precioVal;
                }
            }

            // Apply logic based on service type
            if (formData.tipoServicio === 'Visita de Asesoría') {
                // Rule: 60000 + City Surcharge
                precio = 60000 + tarifaCiudad;
            } else if (formData.tipoServicio === 'Instalación') {
                // Rule: Product Price + City Surcharge
                precio = precioProducto + tarifaCiudad;

                // Rule: Add 175,000 if Hidromasaje has gas heater
                if (formData.grupo === 'Hidromasajes' && formData.tieneCalentadorGas) {
                    precio += 175000;
                }
            } else {
                // Default fallback
                precio = tarifaCiudad + precioProducto;
            }

            setFormData(prev => {
                // Avoid infinite loop if price is same
                if (prev.valorPagar === precio) return prev;
                return { ...prev, valorPagar: precio };
            });
        }
    }, [formData.ciudad, formData.medida, formData.tipoServicio, formData.grupo, preciosZonas, zonasMedidas]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);

        try {
            // Validations
            if (!formData.numeroId || !formData.razonSocial || !formData.correo_electronico || !formData.telefono) {
                throw new Error('Por favor complete todos los campos obligatorios');
            }

            if (!formData.ciudad || !formData.direccion) {
                throw new Error('Por favor complete la información del servicio');
            }

            /*
            if (!formData.confirmaRecepcion) {
                throw new Error('Debe confirmar que recibió el producto');
            }
            */

            /* 
            if (!facturaFile) {
                throw new Error('Debe subir la factura (PDF o Imagen)');
            }
            */

            if (formData.tipoPersona === 'Persona Jurídica' && !rutFile) {
                throw new Error('Debe subir el RUT para personas jurídicas');
            }

            // Upload files
            let rutUrl = null;
            let facturaUrl = null;

            if (rutFile) {
                rutUrl = await handleFileUpload(rutFile, 'rut');
            }

            if (facturaFile) {
                facturaUrl = await handleFileUpload(facturaFile, 'factura');
                if (!facturaUrl) throw new Error('Error al subir la factura');
            }

            // Save to database
            const { error: dbError } = await supabase
                .from('solicitudes_clientes')
                .insert({
                    consecutivo,
                    tipo_persona: formData.tipoPersona,
                    numeroid: parseInt(formData.numeroId), // Table expects bigint
                    nombre_razon_social: formData.razonSocial,
                    persona_contacto: formData.personaContacto,
                    correo_electronico: formData.correo_electronico,
                    telefono: parseInt(formData.telefono), // Table expects bigint
                    ciudad: formData.ciudad,
                    direccion: formData.direccion,
                    punto_referencia: formData.puntoReferencia,
                    tipodeservicio: formData.tipoServicio,
                    grupo_producto: formData.grupo,
                    medidas: formData.medida,
                    observaciones: formData.observaciones,
                    rut_url: rutUrl,
                    factura_url: facturaUrl,
                    recibio_producto: formData.confirmaRecepcion,
                    valor_pagar: formData.valorPagar,
                });

            if (dbError) throw dbError;

            // Open Payment Modal instead of direct success
            setSubmitting(false);
            setShowPaymentModal(true);

        } catch (err: any) {
            setError(err.message || 'Error al enviar el formulario');
            setSubmitting(false);
        }
    };

    const handlePaymentSuccess = async (url: string) => {
        try {
            // Update the record with the payment proof URL
            const { error } = await supabase
                .from('solicitudes_clientes')
                .update({ soporte_pago_url: url })
                .eq('consecutivo', consecutivo);

            if (error) throw error;

            setShowPaymentModal(false);
            setSuccess(true);
        } catch (err: any) {
            console.error('Error updating payment proof:', err);
            setError('Error al guardar el soporte de pago, pero su solicitud fue creada.');
            setShowPaymentModal(false);
            setSuccess(true); // Still show success as the main request was created
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 flex items-center justify-center p-6">
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-white p-12 rounded-3xl shadow-2xl max-w-lg w-full text-center"
                >
                    <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-8">
                        <CheckCircle2 className="w-14 h-14 text-white" />
                    </div>
                    <h2 className="text-4xl font-bold text-slate-900 mb-6">¡Solicitud Enviada!</h2>
                    <p className="text-lg text-slate-700 mb-4 leading-relaxed">
                        Gracias por completar el formulario. Hemos recibido su solicitud y soporte de pago correctamente.
                    </p>
                    <p className="text-base text-slate-600 mb-8">
                        Número de seguimiento: <span className="font-mono font-bold text-brand text-lg">{consecutivo}</span>
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-8 py-4 bg-brand text-white text-lg rounded-xl font-semibold hover:bg-brand/90 transition-colors shadow-lg"
                    >
                        Enviar otra solicitud
                    </button>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-6 px-4">
            <PaymentModal
                isOpen={showPaymentModal}
                onClose={() => setShowPaymentModal(false)}
                consecutivo={consecutivo}
                onPaymentSuccess={handlePaymentSuccess}
            />

            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <motion.div
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="text-center mb-6"
                >
                    <h1 className="text-3xl font-black text-brand mb-2 tracking-tight">Registro de Cliente</h1>
                    <p className="text-base text-slate-700 font-medium">Complete el formulario con sus datos para procesar su solicitud</p>
                </motion.div>

                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-4 p-3 bg-red-50 border-2 border-red-300 rounded-xl flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                        <p className="text-red-800 text-sm font-semibold">{error}</p>
                    </motion.div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Información Personal */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white p-6 rounded-2xl shadow-lg border-2 border-slate-200"
                    >
                        <div className="flex items-center gap-3 mb-5 pb-3 border-b-2 border-slate-100">
                            <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center shadow-md">
                                <User className="w-6 h-6 text-white" />
                            </div>
                            <h2 className="text-xl font-bold text-slate-900">Información Personal</h2>
                        </div>

                        {/* Tipo de Persona */}
                        <div className="mb-4">
                            <label className="block text-sm font-bold text-slate-800 mb-2">
                                Tipo de Persona *
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                {['Persona Natural', 'Persona Jurídica'].map((tipo) => (
                                    <button
                                        key={tipo}
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, tipoPersona: tipo as any }))}
                                        className={`py-3 px-4 rounded-xl font-bold text-sm transition-all ${formData.tipoPersona === tipo
                                            ? 'bg-brand text-white shadow-lg scale-105'
                                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:shadow-md'
                                            }`}
                                    >
                                        {tipo}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Grid de 2 columnas para campos */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                            {/* Cédula o NIT */}
                            <div>
                                <label className="block text-sm font-bold text-slate-800 mb-2">
                                    Cédula o NIT *
                                </label>
                                <input
                                    type="text"
                                    value={formData.numeroId}
                                    onChange={(e) => setFormData(prev => ({ ...prev, numeroId: e.target.value.replace(/\D/g, '') }))}
                                    placeholder="Ingrese su cédula o NIT"
                                    className="w-full px-4 py-3 text-sm text-slate-900 border-2 border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-all"
                                    required
                                />
                            </div>

                            {/* Nombre o Razón Social */}
                            <div>
                                <label className="block text-sm font-bold text-slate-800 mb-2">
                                    Nombre o Razón Social *
                                </label>
                                <input
                                    type="text"
                                    value={formData.razonSocial}
                                    onChange={(e) => setFormData(prev => ({ ...prev, razonSocial: e.target.value }))}
                                    placeholder="Ingrese su nombre completo o razón social"
                                    className="w-full px-4 py-3 text-sm text-slate-900 border-2 border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-all"
                                    required
                                />
                            </div>
                        </div>

                        {/* Persona de Contacto (solo para Jurídica) */}
                        {formData.tipoPersona === 'Persona Jurídica' && (
                            <div className="mb-4">
                                <label className="block text-sm font-bold text-slate-800 mb-2">
                                    Persona de Contacto
                                </label>
                                <input
                                    type="text"
                                    value={formData.personaContacto}
                                    onChange={(e) => setFormData(prev => ({ ...prev, personaContacto: e.target.value }))}
                                    placeholder="Nombre de la persona de contacto"
                                    className="w-full px-4 py-3 text-sm text-slate-900 border-2 border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-all"
                                />
                            </div>
                        )}

                        {/* Grid de 2 columnas para correo y teléfono */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">

                            {/* Correo */}
                            <div>
                                <label className="block text-sm font-bold text-slate-800 mb-2">
                                    Correo Electrónico *
                                </label>
                                <input
                                    type="email"
                                    value={formData.correo_electronico}
                                    onChange={(e) => setFormData(prev => ({ ...prev, correo_electronico: e.target.value }))}
                                    placeholder="correo@ejemplo.com"
                                    className="w-full px-4 py-3 text-sm text-slate-900 border-2 border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-all"
                                    required
                                />
                            </div>

                            {/* Teléfono */}
                            <div>
                                <label className="block text-sm font-bold text-slate-800 mb-2">
                                    Teléfono *
                                </label>
                                <input
                                    type="tel"
                                    value={formData.telefono}
                                    onChange={(e) => setFormData(prev => ({ ...prev, telefono: e.target.value.replace(/\D/g, '') }))}
                                    placeholder="3001234567"
                                    className="w-full px-4 py-3 text-sm text-slate-900 border-2 border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-all"
                                    required
                                />
                            </div>
                        </div>

                        {/* RUT Upload (solo para Jurídica) */}
                        {formData.tipoPersona === 'Persona Jurídica' && (
                            <div className="p-4 bg-blue-50 border-2 border-blue-300 rounded-xl">
                                <div className="flex items-center gap-2 mb-2">
                                    <FileText className="w-5 h-5 text-brand" />
                                    <label className="text-sm font-bold text-slate-800">
                                        Subir RUT (PDF o Imagen) *
                                    </label>
                                </div>
                                <p className="text-xs text-slate-700 mb-3 font-medium">Archivo requerido para personas jurídicas</p>

                                <label className="block">
                                    <div className="relative cursor-pointer">
                                        <div className="flex items-center justify-center gap-3 px-6 py-3 bg-white border-2 border-blue-400 rounded-xl hover:bg-blue-100 hover:border-blue-500 transition-all shadow-sm hover:shadow-md">
                                            <FileText className="w-5 h-5 text-blue-600" />
                                            <span className="font-bold text-blue-700 text-sm">
                                                {rutFile ? 'Cambiar archivo' : 'Haz clic aquí para seleccionar archivo'}
                                            </span>
                                        </div>
                                        <input
                                            type="file"
                                            accept="image/*,.pdf"
                                            onChange={(e) => setRutFile(e.target.files?.[0] || null)}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        />
                                    </div>
                                </label>

                                {rutFile && (
                                    <p className="text-sm text-emerald-600 mt-3 flex items-center gap-2 font-medium">
                                        <CheckCircle2 className="w-5 h-5" />
                                        Archivo seleccionado: {rutFile.name}
                                    </p>
                                )}
                            </div>
                        )}
                    </motion.div>

                    {/* Información del Servicio */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-white p-6 rounded-2xl shadow-lg border-2 border-slate-200"
                    >
                        <div className="flex items-center gap-3 mb-5 pb-3 border-b-2 border-slate-100">
                            <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center shadow-md">
                                <MapPin className="w-6 h-6 text-white" />
                            </div>
                            <h2 className="text-xl font-bold text-slate-900">Información del Servicio</h2>
                        </div>

                        {/* Grid de 2 columnas */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                            {/* Ciudad */}
                            <div className="mb-6">
                                <label className="block text-base font-bold text-slate-800 mb-3">
                                    Ciudad *
                                </label>
                                <select
                                    value={formData.ciudad}
                                    onChange={(e) => setFormData(prev => ({ ...prev, ciudad: e.target.value }))}
                                    className="w-full px-5 py-4 text-base text-slate-900 border-2 border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-all"
                                    required
                                >
                                    <option value="">Seleccione su ciudad</option>
                                    {ciudades.map((ciudad) => (
                                        <option key={ciudad.id} value={ciudad.ciudad}>
                                            {ciudad.ciudad}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Dirección */}
                            <div className="mb-6">
                                <label className="block text-base font-bold text-slate-800 mb-3">
                                    Dirección *
                                </label>
                                <input
                                    type="text"
                                    value={formData.direccion}
                                    onChange={(e) => setFormData(prev => ({ ...prev, direccion: e.target.value }))}
                                    placeholder="Calle, carrera, número"
                                    className="w-full px-5 py-4 text-base text-slate-900 border-2 border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-all"
                                    required
                                />
                            </div>

                            {/* Punto de Referencia */}
                            <div className="mb-6">
                                <label className="block text-base font-bold text-slate-800 mb-3">
                                    Punto de Referencia
                                </label>
                                <input
                                    type="text"
                                    value={formData.puntoReferencia}
                                    onChange={(e) => setFormData(prev => ({ ...prev, puntoReferencia: e.target.value }))}
                                    placeholder="Ej: Frente al parque principal"
                                    className="w-full px-5 py-4 text-base text-slate-900 border-2 border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-all"
                                />
                            </div>

                            {/* Tipo de Servicio */}
                            <div className="mb-6">
                                <label className="block text-base font-bold text-slate-800 mb-3">
                                    Tipo de Servicio *
                                </label>
                                <select
                                    value={formData.tipoServicio}
                                    onChange={(e) => setFormData(prev => ({ ...prev, tipoServicio: e.target.value }))}
                                    className="w-full px-5 py-4 text-base text-slate-900 border-2 border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-all"
                                    required
                                >
                                    <option value="Instalación">Instalación</option>
                                    <option value="Visita de Asesoría">Visita de Asesoría</option>
                                </select>
                            </div>
                        </div>
                    </motion.div>




                    {/* Información del Producto */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-white p-8 rounded-3xl shadow-xl border-2 border-slate-200"
                    >
                        <div className="flex items-center gap-4 mb-8 pb-4 border-b-2 border-slate-100">
                            <div className="w-14 h-14 bg-purple-500 rounded-2xl flex items-center justify-center shadow-lg">
                                <Package className="w-7 h-7 text-white" />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900">Información del Producto</h2>
                        </div>

                        {/* Grupo */}
                        <div className="mb-6">
                            <label className="block text-base font-bold text-slate-800 mb-3">
                                Grupo de Producto
                            </label>
                            <select
                                value={formData.grupo}
                                onChange={(e) => setFormData(prev => ({ ...prev, grupo: e.target.value }))}
                                className="w-full px-5 py-4 text-base text-slate-900 border-2 border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-all"
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
                        {formData.grupo === 'Hidromasajes' && (
                            <div className="mb-6 p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
                                <label className="block text-base font-bold text-slate-800 mb-3">
                                    ¿Cuántas personas es el hidromasaje? *
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    {[2, 4].map((cantidad) => (
                                        <button
                                            key={cantidad}
                                            type="button"
                                            onClick={() => setFormData(prev => ({
                                                ...prev,
                                                cantidadPersonas: cantidad,
                                                medida: '', // Reset medida when changing cantidad
                                                // Reset calentador if changing from 4 to 2
                                                tieneCalentadorGas: cantidad === 2 ? undefined : prev.tieneCalentadorGas
                                            }))}
                                            className={`py-3 px-4 rounded-xl font-bold text-sm transition-all ${formData.cantidadPersonas === cantidad
                                                ? 'bg-brand text-white shadow-lg scale-105'
                                                : 'bg-white text-slate-700 hover:bg-slate-100 hover:shadow-md border-2 border-slate-300'
                                                }`}
                                        >
                                            {cantidad} Personas
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Hidromasajes - Calentador a Gas (ANTES de medidas, solo para 4 personas) */}
                        {formData.grupo === 'Hidromasajes' && formData.cantidadPersonas === 4 && (
                            <div className="mb-6 p-4 bg-amber-50 border-2 border-amber-200 rounded-xl">
                                <label className="block text-base font-bold text-slate-800 mb-3">
                                    ¿Tiene calentador a gas? *
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    {[
                                        { value: true, label: 'Sí' },
                                        { value: false, label: 'No' }
                                    ].map((option) => (
                                        <button
                                            key={option.label}
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, tieneCalentadorGas: option.value, medida: '' }))}
                                            className={`py-3 px-4 rounded-xl font-bold text-sm transition-all ${formData.tieneCalentadorGas === option.value
                                                ? 'bg-brand text-white shadow-lg scale-105'
                                                : 'bg-white text-slate-700 hover:bg-slate-100 hover:shadow-md border-2 border-slate-300'
                                                }`}
                                        >
                                            {option.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Medidas - Moved after gas heater for 4-person Hidromasajes */}
                        <div className="mb-6">
                            <label className="block text-base font-bold text-slate-800 mb-3">
                                Medidas del Producto
                            </label>
                            <select
                                value={formData.medida}
                                onChange={(e) => setFormData(prev => ({ ...prev, medida: e.target.value }))}
                                className="w-full px-5 py-4 text-base text-slate-900 border-2 border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-all"
                                disabled={
                                    !formData.grupo ||
                                    medidas.length === 0 ||
                                    (formData.grupo === 'Hidromasajes' && !formData.cantidadPersonas) ||
                                    (formData.grupo === 'Hidromasajes' && formData.cantidadPersonas === 4 && formData.tieneCalentadorGas === undefined)
                                }
                            >
                                <option value="">Seleccione una medida</option>
                                {medidas.map((m, index) => (
                                    <option key={index} value={m.medida}>
                                        {m.medida}
                                    </option>
                                ))}
                            </select>
                            {!formData.grupo && (
                                <p className="text-xs text-slate-600 mt-2">Primero seleccione un grupo de producto</p>
                            )}
                            {formData.grupo === 'Hidromasajes' && !formData.cantidadPersonas && (
                                <p className="text-xs text-slate-600 mt-2">Primero seleccione la cantidad de personas</p>
                            )}
                            {formData.grupo === 'Hidromasajes' && formData.cantidadPersonas === 4 && formData.tieneCalentadorGas === undefined && (
                                <p className="text-xs text-slate-600 mt-2">Primero indique si tiene calentador a gas</p>
                            )}
                        </div>

                        {/* Observaciones */}
                        <div className="mb-6">
                            <label className="block text-base font-bold text-slate-800 mb-3">
                                Observaciones
                            </label>
                            <textarea
                                value={formData.observaciones}
                                onChange={(e) => setFormData(prev => ({ ...prev, observaciones: e.target.value }))}
                                placeholder="Información adicional..."
                                rows={4}
                                className="w-full px-5 py-4 text-base text-slate-900 border-2 border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-all resize-none"
                            />
                        </div>

                        {/* Factura Upload */}
                        <div className="p-6 bg-amber-50 border-2 border-amber-300 rounded-2xl">
                            <div className="flex items-center gap-3 mb-3">
                                <Upload className="w-6 h-6 text-amber-600" />
                                <label className="text-base font-bold text-slate-800">
                                    Subir Factura (PDF o Imagen)
                                </label>
                            </div>
                            <p className="text-sm text-slate-700 mb-4 font-medium">Archivo opcional</p>

                            <label className="block">
                                <div className="relative cursor-pointer">
                                    <div className="flex items-center justify-center gap-3 px-6 py-4 bg-white border-2 border-amber-400 rounded-xl hover:bg-amber-100 hover:border-amber-500 transition-all shadow-sm hover:shadow-md">
                                        <Upload className="w-5 h-5 text-amber-600" />
                                        <span className="font-bold text-amber-700">
                                            {facturaFile ? 'Cambiar archivo' : 'Haz clic aquí para seleccionar archivo'}
                                        </span>
                                    </div>
                                    <input
                                        type="file"
                                        accept="image/*,.pdf"
                                        onChange={(e) => setFacturaFile(e.target.files?.[0] || null)}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    />
                                </div>
                            </label>

                            {facturaFile && (
                                <p className="text-sm text-emerald-600 mt-3 flex items-center gap-2 font-medium">
                                    <CheckCircle2 className="w-5 h-5" />
                                    Archivo seleccionado: {facturaFile.name}
                                </p>
                            )}
                        </div>
                    </motion.div>

                    {/* Confirmación y Valor */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="bg-white p-8 rounded-3xl shadow-xl border-2 border-slate-200"
                    >
                        {/* Checkbox Confirmación */}
                        <div className="mb-8">
                            <label className="flex items-start gap-4 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={formData.confirmaRecepcion}
                                    onChange={(e) => setFormData(prev => ({ ...prev, confirmaRecepcion: e.target.checked }))}
                                    className="mt-1 w-6 h-6 text-brand focus:ring-brand rounded"
                                />
                                <span className="text-base font-bold text-slate-800 group-hover:text-brand transition-colors">
                                    Confirmo que recibí el producto
                                </span>
                            </label>
                        </div>

                        {/* Valor a Pagar */}
                        <div className="p-6 bg-gradient-to-r from-brand/10 to-blue-500/10 rounded-2xl border-2 border-brand/30">
                            <label className="block text-base font-bold text-slate-800 mb-3">
                                Valor a Pagar
                            </label>
                            <div className="text-4xl font-black text-brand">
                                ${formData.valorPagar?.toLocaleString('es-CO') || '0'}
                            </div>
                            <p className="text-sm text-slate-700 mt-2 font-medium">Calculado automáticamente</p>
                        </div>
                    </motion.div>

                    {/* Submit Button */}
                    <motion.button
                        type="submit"
                        disabled={submitting || uploadingRut || uploadingFactura}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full py-5 bg-gradient-to-r from-brand to-blue-600 text-white font-bold text-xl rounded-2xl shadow-2xl hover:shadow-3xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                    >
                        {submitting ? (
                            <>
                                <Loader2 className="w-6 h-6 animate-spin" />
                                <span className="text-lg">Enviando...</span>
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="w-6 h-6" />
                                <span className="text-lg">Enviar Solicitud</span>
                            </>
                        )}
                    </motion.button>
                </form>
            </div>
        </div >
    );
}
