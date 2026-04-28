'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Camera, FileText, Upload, Trash2, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface CommentModalProps {
    isOpen: boolean;
    onClose: () => void;
    serviceId: string;
    onSuccess?: () => void;
}

export default function CommentModal({ isOpen, onClose, serviceId, onSuccess }: CommentModalProps) {
    const [content, setContent] = useState('');
    const [files, setFiles] = useState<File[]>([]);
    const [uploading, setUploading] = useState(false);
    const [showError, setShowError] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFiles([...files, ...Array.from(e.target.files)]);
        }
    };

    const removeFile = (index: number) => {
        setFiles(files.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        if (!content.trim()) {
            setShowError(true);
            return;
        }

        setUploading(true);
        try {
            // 1. Crear el comentario
            const { data: commentData, error: commentError } = await supabase
                .from('Comentarios')
                .insert([{
                    servicio_id: serviceId,
                    contenido: content,
                    autor_id: (await supabase.auth.getUser()).data.user?.id,
                    tipo: 'seguimiento'
                }])
                .select()
                .single();

            if (commentError) throw commentError;

            // 2. Subir archivos si existen
            if (files.length > 0 && commentData) {
                for (const file of files) {
                    const fileExt = file.name.split('.').pop();
                    const fileName = `${Math.random()}.${fileExt}`;
                    const filePath = `comentarios/${serviceId}/${fileName}`;

                    const { error: uploadError } = await supabase.storage
                        .from('archivos_servicios')
                        .upload(filePath, file);

                    if (uploadError) throw uploadError;

                    // Registrar adjunto
                    await supabase
                        .from('Adjuntos')
                        .insert([{
                            comentario_id: commentData.id,
                            url: filePath,
                            nombre: file.name,
                            tipo: file.type
                        }]);
                }
            }

            onSuccess?.();
            onClose();
            setContent('');
            setFiles([]);
            setShowError(false);
        } catch (error) {
            console.error('Error al guardar comentario:', error);
            alert('Error al guardar el comentario');
        } finally {
            setUploading(false);
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
                                    {files.map((file, index) => (
                                        <motion.div
                                            key={index}
                                            initial={{ x: -20, opacity: 0 }}
                                            animate={{ x: 0, opacity: 1 }}
                                            className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100"
                                        >
                                            <div className="flex items-center gap-3">
                                                <FileText className="w-4 h-4 text-slate-400" />
                                                <span className="text-xs font-bold text-slate-600 truncate max-w-[200px]">
                                                    {file.name}
                                                </span>
                                            </div>
                                            <button 
                                                onClick={() => removeFile(index)}
                                                className="p-1 hover:bg-rose-50 rounded-lg text-rose-500 transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </motion.div>
                                    ))}
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
