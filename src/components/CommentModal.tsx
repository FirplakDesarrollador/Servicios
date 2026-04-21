'use client';

import { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { X, Loader2, MessageSquare, Send, Paperclip, Camera, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/** Removes accents and special chars that are invalid in storage paths */
const sanitizePath = (path: string): string =>
    path
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/ñ/g, 'n')
        .replace(/Ñ/g, 'N')
        .replace(/[^a-zA-Z0-9\/\-_.]/g, '_');


interface CommentModalProps {
    isOpen: boolean;
    onClose: () => void;
    servicioId: number;
    consecutivo?: string;
    currentUser: any;
    onSuccess: () => void;
}

export default function CommentModal({ isOpen, onClose, servicioId, consecutivo, currentUser, onSuccess }: CommentModalProps) {
    const [content, setContent] = useState('');
    const [files, setFiles] = useState<File[]>([]);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
        }
    };

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const uploadFiles = async () => {
        const uploadPromises = files.map(async (file) => {
            const fileExt = file.name.split('.').pop();
            const fileName = `${crypto.randomUUID()}.${fileExt}`;
            const folderPath = sanitizePath(consecutivo || servicioId.toString());
            const filePath = `${folderPath}/documentos/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('servicios')
                .upload(filePath, file);

            if (uploadError) {
                console.error('Upload error:', uploadError);
                throw uploadError;
            }

            const { data: { publicUrl } } = supabase.storage
                .from('servicios')
                .getPublicUrl(filePath);

            return publicUrl;
        });

        return Promise.all(uploadPromises);
    };

    const handleSubmit = async () => {
        if (!content && files.length === 0) return;

        setUploading(true);
        try {
            const urls = await uploadFiles();

            const { error } = await supabase.from('Comentarios').insert({
                servicio_id: servicioId,
                contenido: content || 'Archivo adjunto',
                documentos: urls,
                usuario_id: currentUser?.id,
                tipo: 'observacion_general'
            });

            if (error) {
                console.error('Database Insert Error:', error);
                throw error;
            }

            setContent('');
            setFiles([]);
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error('Detailed Error adding comment:', error);
            const errorMsg = error.message || error.error_description || JSON.stringify(error);
            alert(`Error al añadir observación: ${errorMsg}`);
        } finally {
            setUploading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-4 bg-black/60 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, y: 100 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 100 }}
                        className="bg-white w-full max-w-lg rounded-t-[2.5rem] md:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                    >
                        {/* Header */}
                        <div className="p-8 pb-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-brand/10 rounded-2xl flex items-center justify-center">
                                    <MessageSquare className="w-5 h-5 text-brand" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-slate-800 tracking-tight">Observación</h2>
                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Seguimiento de servicio</p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all"
                            >
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>

                        {/* Form */}
                        <div className="p-8 pt-4 space-y-6">
                            <div className="relative group">
                                <textarea
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    placeholder="Escribe aquí tu observación..."
                                    rows={5}
                                    className="w-full p-6 bg-slate-50 border border-slate-100 rounded-3xl focus:outline-none focus:ring-4 focus:ring-brand/5 focus:border-brand/20 transition-all font-medium text-slate-700 resize-none"
                                />
                            </div>

                            {/* Adjuntos */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between px-2">
                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Archivos adjuntos</h3>
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="text-brand text-xs font-black uppercase tracking-widest hover:underline flex items-center gap-1.5"
                                    >
                                        <Paperclip className="w-3 h-3" />
                                        Añadir
                                    </button>
                                </div>

                                <input
                                    type="file"
                                    multiple
                                    hidden
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    accept="image/*,.pdf"
                                />

                                {files.length > 0 ? (
                                    <div className="grid grid-cols-2 gap-3">
                                        {files.map((file, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100 group">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    {file.type.startsWith('image/') ? <Camera className="w-3.5 h-3.5 text-slate-400" /> : <FileText className="w-3.5 h-3.5 text-slate-400" />}
                                                    <span className="text-[10px] font-bold text-slate-600 truncate">{file.name}</span>
                                                </div>
                                                <button onClick={() => removeFile(idx)} className="p-1 hover:text-rose-500 transition-colors">
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        className="border-2 border-dashed border-slate-100 rounded-3xl p-8 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-slate-50 transition-all group"
                                    >
                                        <Paperclip className="w-6 h-6 text-slate-200 group-hover:text-brand transition-colors" />
                                        <p className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.2em]">Seleccionar archivos</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-8 bg-slate-50/50 border-t border-slate-100 flex gap-4">
                            <button
                                onClick={onClose}
                                className="flex-1 py-4 text-slate-400 font-black uppercase tracking-widest text-xs hover:text-slate-600 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                disabled={uploading || (!content && files.length === 0)}
                                onClick={handleSubmit}
                                className="flex-[2] py-4 bg-brand text-white font-black uppercase tracking-widest text-xs rounded-2xl shadow-xl shadow-brand/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                            >
                                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                Guardar observación
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
