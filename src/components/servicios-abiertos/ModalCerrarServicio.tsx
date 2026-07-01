'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Eraser, CheckCircle, AlertCircle, Loader2, Camera, FileText, ChevronLeft, ChevronRight, PenTool, } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface ModalCerrarServicioProps {
    isOpen: boolean;
    onClose: () => void;
    service: any;
    onSuccess?: () => void;
    currentUser?: any;
}

export default function ModalCerrarServicio({ isOpen, onClose, service, onSuccess, currentUser }: ModalCerrarServicioProps) {
    const [step, setStep] = useState(1);
    const [razonCierre, setRazonCierre] = useState('');
            
    const [isSaving, setIsSaving] = useState(false);
    const [hasSignature, setHasSignature] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const isDrawing = useRef(false);

    // Reset steps and files when opening
    useEffect(() => {
        if (isOpen) {
            setStep(1);
            setError(null);
            setHasSignature(false);
            setRazonCierre('');
        }
    }, [isOpen]);

    // Canvas Logic
    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        isDrawing.current = true;
        draw(e);
    };

    const stopDrawing = () => {
        isDrawing.current = false;
        if (canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            ctx?.beginPath();
        }
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing.current || !canvasRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        let x, y;
        if ('touches' in e) {
            x = e.touches[0].clientX - rect.left;
            y = e.touches[0].clientY - rect.top;
        } else {
            x = e.clientX - rect.left;
            y = e.clientY - rect.top;
        }

        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#000';
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y);
        setHasSignature(true);
    };

    const clearSignature = () => {
        if (!canvasRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            setHasSignature(false);
        }
    };

    const handleNextStep = () => {
        if (!razonCierre.trim()) return setError('Las observaciones son obligatorias');
        setError(null);
        setStep(2);
    };

    const handleSave = async () => {
        if (!hasSignature || !canvasRef.current) {
            setError('La firma del cliente es obligatoria');
            return;
        }

        setIsSaving(true);
        setError(null);

        try {
            const signatureData = canvasRef.current.toDataURL('image/png');

            // 1. Guardar firma
            const { error: firmaError } = await supabase
                .from('firmas_digitales')
                .insert([{
                    servicio_id: service.id,
                    firma_base64: signatureData,
                    fecha_firma: new Date().toISOString()
                }]);

            if (firmaError) throw firmaError;

            // 2. Cerrar servicio
            const { error: updateError } = await supabase
                .from('Servicios')
                .update({
                    estado: false,
                    razon_cierre: razonCierre,
                    fecha_cierre: new Date().toISOString()
                })
                .eq('id', service.id);

            if (updateError) throw updateError;

            // 3. Registrar comentario de cierre
            const { data: commentData, error: commentError } = await supabase
                .from('Comentarios')
                .insert([{
                    servicio_id: service.id,
                    contenido: `SERVICIO CERRADO - Observaciones: ${razonCierre}.`,
                    tipo: 'cierre',
                    usuario_id: currentUser?.id
                }])
                .select()
                .single();

            if (commentError) throw commentError;

            onSuccess?.();
            onClose();
        } catch (err: any) {
            console.error('Error al cerrar servicio:', err);
            setError(err.message || 'Error al procesar el cierre');
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />

            <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="relative w-full max-w-2xl bg-white rounded-[40px] overflow-hidden shadow-2xl"
            >
                {/* Header */}
                <div className="px-10 py-8 flex items-center justify-between border-b border-slate-50">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 tracking-tight">
                            {step === 1 ? 'Cierre de Servicio' : 'Firma del Cliente'}
                        </h2>
                        <p className="text-[10px] font-bold text-brand uppercase tracking-[0.2em] mt-1">
                            Paso {step} de 2 • {service?.codigo_servicio || 'Servicio'}
                        </p>
                    </div>
                    <button onClick={onClose} className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center hover:bg-slate-100 transition-colors">
                        <X className="w-6 h-6 text-slate-400" />
                    </button>
                </div>

                <div className="p-10 space-y-8 max-h-[75vh] overflow-y-auto custom-scrollbar">
                    {error && (
                        <motion.div 
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-600"
                        >
                            <AlertCircle className="w-5 h-5 flex-shrink-0" />
                            <p className="text-xs font-bold uppercase tracking-wider">{error}</p>
                        </motion.div>
                    )}

                    {step === 1 ? (
                        <div className="space-y-8">
                            {/* Observaciones Finales */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Observaciones del servicio</label>
                                <textarea
                                    value={razonCierre}
                                    onChange={(e) => setRazonCierre(e.target.value)}
                                    placeholder="Observaciones finales o recomendaciones..."
                                    rows={4}
                                    className="w-full p-5 bg-slate-50 border border-slate-100 rounded-[24px] focus:outline-none focus:ring-4 focus:ring-brand/5 focus:border-brand/20 transition-all font-medium text-slate-700 resize-none"
                                />
                            </div>

                            </div>
                    ) : (
                        <div className="space-y-8">
                            <div className="p-8 bg-brand/5 rounded-[32px] border border-brand/10">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-12 h-12 bg-brand/10 rounded-2xl flex items-center justify-center">
                                        <PenTool className="w-6 h-6 text-brand" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-black text-slate-800">Firma de Conformidad</p>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Documento de Cierre</p>
                                    </div>
                                </div>

                                <div className="relative aspect-[4/3] bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-inner cursor-crosshair">
                                    <canvas
                                        ref={canvasRef}
                                        width={600}
                                        height={450}
                                        className="w-full h-full"
                                        onMouseDown={startDrawing}
                                        onMouseMove={draw}
                                        onMouseUp={stopDrawing}
                                        onMouseLeave={stopDrawing}
                                        onTouchStart={startDrawing}
                                        onTouchMove={draw}
                                        onTouchEnd={stopDrawing}
                                    />
                                    {!hasSignature && (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none opacity-20">
                                            <Eraser className="w-12 h-12 mb-2" />
                                            <p className="text-xs font-black uppercase tracking-[0.2em]">Firme aquí</p>
                                        </div>
                                    )}
                                    <button
                                        onClick={clearSignature}
                                        className="absolute bottom-4 right-4 p-3 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors flex items-center gap-2 text-[10px] font-black uppercase tracking-widest shadow-sm"
                                    >
                                        <Eraser className="w-4 h-4" />
                                        Limpiar
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Buttons */}
                <div className="p-10 bg-slate-50/50 border-t border-slate-100 flex gap-4">
                    {step === 2 && (
                        <button
                            onClick={() => setStep(1)}
                            className="px-8 py-5 bg-white border border-slate-200 text-slate-600 font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm"
                        >
                            <ChevronLeft className="w-4 h-4" />
                            Atrás
                        </button>
                    )}
                    
                    <button
                        onClick={step === 1 ? handleNextStep : handleSave}
                        disabled={isSaving}
                        className={`flex-1 py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] transition-all flex items-center justify-center gap-3 shadow-xl ${
                            step === 1 
                                ? 'bg-slate-800 text-white hover:bg-slate-900 shadow-slate-200' 
                                : 'bg-brand text-white hover:bg-brand-dark shadow-brand/20'
                        }`}
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Procesando...
                            </>
                        ) : step === 1 ? (
                            <>
                                Continuar a Firma
                                <ChevronRight className="w-4 h-4" />
                            </>
                        ) : (
                            <>
                                Finalizar Servicio
                                <CheckCircle className="w-4 h-4" />
                            </>
                        )}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
