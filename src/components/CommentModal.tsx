'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Camera, FileText, Upload, Trash2, Loader2, Video, ImageIcon, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface CommentModalProps {
    isOpen: boolean;
    onClose: () => void;
    serviceId: string;
    consecutivo?: string;
    currentUser?: any;
    onSuccess?: () => void;
}

export default function CommentModal({ isOpen, onClose, serviceId, onSuccess, currentUser, consecutivo }: CommentModalProps) {
    const [content, setContent] = useState('');
    const [files, setFiles] = useState<{ file: File; isHidden: boolean }[]>([]);
    const [uploading, setUploading] = useState(false);
    const [showError, setShowError] = useState(false);
    const isUploadingRef = useRef(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files).map(file => ({
                file,
                isHidden: false
            }));
            setFiles([...files, ...newFiles]);
        }
    };

    const toggleVisibility = (index: number) => {
        setFiles(prev => prev.map((item, i) => 
            i === index ? { ...item, isHidden: !item.isHidden } : item
        ));
    };

    const removeFile = (index: number) => {
        setFiles(files.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        if (isUploadingRef.current) return;

        if (!content.trim()) {
            setShowError(true);
            return;
        }

        isUploadingRef.current = true;
        setUploading(true);
        try {
            // 1. Crear el comentario
            const { data: commentData, error: commentError } = await supabase
                .from('Comentarios')
                .insert([{
                    servicio_id: serviceId,
                    contenido: content,
                    usuario_id: currentUser?.id,
                    tipo: 'seguimiento'
                }])
                .select()
                .single();

            if (commentError) throw commentError;

            // 2. Subir archivos si existen
            if (files.length > 0 && commentData) {
                const uploadedUrls = [];
                const hiddenUrls = [];

                for (const item of files) {
                    const { file, isHidden } = item;
                    const fileExt = file.name.split('.').pop() || '';
                    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
                    
                    const sanitizePath = (path: string) => {
                        return String(path)
                            .normalize("NFD")
                            .replace(/[\u0300-\u036f]/g, "")
                            .replace(/ñ/g, "n")
                            .replace(/Ñ/g, "N")
                            .replace(/[^a-zA-Z0-9\/\-_.]/g, "_");
                    };

                    const folderPath = sanitizePath(consecutivo || serviceId);
                    const filePath = `${folderPath}/comentarios/${fileName}`;

                    const { error: uploadError } = await supabase.storage
                        .from('servicios')
                        .upload(filePath, file);

                    if (uploadError) throw uploadError;

                    const { data: { publicUrl } } = supabase.storage
                        .from('servicios')
                        .getPublicUrl(filePath);

                    uploadedUrls.push(publicUrl);
                    if (isHidden) {
                        hiddenUrls.push(publicUrl);
                    }
                }

                // Actualizar el comentario con las URLs de los documentos
                const { error: updateCommentError } = await supabase
                    .from('Comentarios')
                    .update({ documentos: uploadedUrls })
                    .eq('id', commentData.id);
                
                if (updateCommentError) throw updateCommentError;

                // Si hay archivos ocultos, actualizar soportes_pago en la tabla Servicios
                if (hiddenUrls.length > 0) {
                    const { data: serviceData, error: selectServiceError } = await supabase
                        .from('Servicios')
                        .select('soportes_pago')
                        .eq('id', serviceId)
                        .single();

                    if (!selectServiceError) {
                        const currentSoportes = serviceData?.soportes_pago || [];
                        const { error: updateServiceError } = await supabase
                            .from('Servicios')
                            .update({ 
                                soportes_pago: [...currentSoportes, ...hiddenUrls] 
                            })
                            .eq('id', serviceId);
                            
                        if (updateServiceError) throw updateServiceError;
                    }
                }
            }

            onSuccess?.();
            onClose();
            setContent('');
            setFiles([]);
            setShowError(false);
        } catch (error: any) {
            console.error('Error al guardar comentario DETALLE COMPLETO:', error);
            const props = Object.getOwnPropertyNames(error);
            const errorDetails = props.length > 0 ? props.map(p => `${p}: ${error[p]}`).join(', ') : String(error);
            alert(`Error al guardar el comentario: ${error?.message || JSON.stringify(error)} | Detalles: ${errorDetails}`);
        } finally {
            setUploading(false);
            isUploadingRef.current = false;
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
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />

            <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="relative w-full max-w-lg bg-white rounded-[32px] overflow-hidden shadow-2xl"
            >
                {/* Header */}
                <div className="px-8 py-6 flex items-center justify-between border-b border-slate-50">
                    <h2 className="text-xl font-bold text-slate-800">Comentarios y archivos</h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-full transition-colors">
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                    {/* Observaciones Section */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            Observaciones generales
                        </label>
                        <div className="relative">
                            <textarea
                                value={content}
                                onChange={(e) => {
                                    setContent(e.target.value);
                                    if (e.target.value.trim()) setShowError(false);
                                }}
                                placeholder="Observaciones del servicio..."
                                rows={4}
                                className={`w-full p-4 bg-slate-50 border rounded-2xl focus:outline-none transition-all resize-none text-slate-700 font-medium ${
                                    showError ? 'border-rose-500 bg-rose-50/30' : 'border-slate-100 focus:border-brand/30 focus:ring-4 focus:ring-brand/5'
                                }`}
                            />
                            {showError && (
                                <p className="mt-1 text-[10px] font-bold text-rose-500 uppercase tracking-widest">
                                    Este campo es obligatorio
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Archivos Section */}
                    <div className="space-y-4">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            Archivos adjuntos
                        </label>
                        
                        <label className="flex flex-col items-center justify-center p-10 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[32px] hover:border-brand/30 hover:bg-brand/5 cursor-pointer transition-all group">
                            <div className="w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                <Upload className="w-7 h-7 text-brand" />
                            </div>
                            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-[0.2em] text-center">Tocar para adjuntar archivos</span>
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-2">Fotos, Videos o Documentos</p>
                            <input type="file" className="hidden" onChange={handleFileChange} multiple />
                        </label>

                        {/* List of files */}
                        <AnimatePresence>
                            {files.length > 0 && (
                                <motion.div 
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    className="space-y-2 pt-2"
                                >
                                    {files.map((item, index) => {
                                        const { file, isHidden } = item;
                                        const isImage = file.type.startsWith('image/');
                                        return (
                                            <motion.div 
                                                key={index}
                                                initial={{ x: -20, opacity: 0 }}
                                                animate={{ x: 0, opacity: 1 }}
                                                className={`flex items-center justify-between p-3 bg-slate-50 rounded-2xl border transition-all ${isHidden ? 'border-amber-200 bg-amber-50/30' : 'border-slate-100'}`}
                                            >
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    {isImage ? <ImageIcon className="w-4 h-4 text-brand flex-shrink-0" /> : <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />}
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="text-[10px] font-bold text-slate-700 truncate">{file.name}</span>
                                                        {isHidden && <span className="text-[8px] font-black text-amber-600 uppercase tracking-tighter">Solo Administrativo</span>}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            toggleVisibility(index);
                                                        }}
                                                        className={`p-1.5 rounded-lg transition-colors ${isHidden ? 'text-amber-500 hover:bg-amber-100' : 'text-slate-300 hover:bg-slate-200'}`}
                                                        title={isHidden ? "Visible para técnicos" : "Ocultar para técnicos"}
                                                    >
                                                        {isHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                    </button>
                                                    <button 
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            removeFile(index);
                                                        }}
                                                        className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Footer Buttons */}
                <div className="p-8 bg-slate-50/50 flex flex-col sm:flex-row gap-3 border-t border-slate-100">
                    <button
                        onClick={onClose}
                        className="flex-1 px-6 py-4 bg-white border border-slate-200 text-slate-600 font-bold uppercase tracking-widest text-xs rounded-2xl hover:bg-slate-50 transition-all shadow-sm"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={uploading}
                        className="flex-1 px-6 py-4 bg-brand text-white font-bold uppercase tracking-widest text-xs rounded-2xl hover:bg-brand-dark transition-all shadow-lg shadow-brand/20 flex items-center justify-center gap-2 disabled:opacity-70"
                    >
                        {uploading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Guardando...
                            </>
                        ) : (
                            <>
                                <Upload className="w-4 h-4" />
                                Guardar observación
                            </>
                        )}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
