'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, CheckCircle2, CreditCard, Lock, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    consecutivo: string;
    onPaymentSuccess: (url: string) => void;
}

export default function PaymentModal({ isOpen, onClose, consecutivo, onPaymentSuccess }: PaymentModalProps) {
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFileUpload = async (selectedFile: File) => {
        try {
            setUploading(true);
            setError(null);

            const fileExt = selectedFile.name.split('.').pop();
            const fileName = `${consecutivo}_soporte_pago.${fileExt}`;
            const filePath = `${consecutivo}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('solicitudesclientes')
                .upload(filePath, selectedFile, { upsert: true });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('solicitudesclientes')
                .getPublicUrl(filePath);

            onPaymentSuccess(publicUrl);
        } catch (err: any) {
            console.error('Error uploading payment proof:', err);
            setError(err.message || 'Error al subir el comprobante');
        } finally {
            setUploading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
                    >
                        {/* Header */}
                        <div className="p-6 text-center border-b border-gray-100">
                            <h2 className="text-2xl font-bold text-slate-900">Finaliza tu pago</h2>
                            <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                                El pago se debe realizar a la cuenta <strong className="text-slate-700">CORRIENTE Bancolombia 24500020880</strong> a nombre de <strong className="text-slate-700">Viventta</strong>
                            </p>
                            <p className="text-xs text-slate-400 mt-2">
                                Este valor corresponde a una estimación inicial, sujeta a validación.
                            </p>
                        </div>

                        <div className="p-6 overflow-y-auto space-y-4">
                            {error && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
                                    <AlertCircle className="w-4 h-4" />
                                    {error}
                                </div>
                            )}

                            {/* Option 1: Upload Proof */}
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-xl">📎</span>
                                    <h3 className="font-bold text-slate-800">Adjuntar comprobante</h3>
                                </div>
                                <p className="text-sm text-slate-600 mb-4">
                                    Sube el soporte de tu pago (PDF o Imagen).
                                </p>

                                <div className="relative">
                                    <input
                                        type="file"
                                        accept="image/*,.pdf"
                                        onChange={(e) => {
                                            const selectedFile = e.target.files?.[0];
                                            if (selectedFile) {
                                                setFile(selectedFile);
                                                handleFileUpload(selectedFile);
                                            }
                                        }}
                                        disabled={uploading}
                                        className="hidden"
                                        id="payment-proof-upload"
                                    />
                                    <label
                                        htmlFor="payment-proof-upload"
                                        className={`flex items-center justify-center gap-2 w-full p-4 rounded-xl border-2 border-dashed transition-all duration-300 ${uploading ? 'bg-slate-100 border-slate-200 cursor-not-allowed' :
                                            file ? 'border-emerald-500 bg-emerald-50 hover:bg-emerald-100 cursor-pointer' :
                                                'border-slate-300 hover:border-brand hover:bg-white cursor-pointer'
                                            }`}
                                    >
                                        {uploading ? (
                                            <div className="flex items-center gap-3">
                                                <div className="w-5 h-5 border-2 border-brand border-t-transparent rounded-full animate-spin" />
                                                <span className="text-brand font-bold">Subiendo comprobante...</span>
                                            </div>
                                        ) : file ? (
                                            <div className="flex items-center gap-3">
                                                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                                                <div className="text-left">
                                                    <p className="text-emerald-700 font-bold truncate max-w-[200px]">{file.name}</p>
                                                    <p className="text-xs text-emerald-600">Soporte cargado exitosamente</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center gap-2 py-2">
                                                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100">
                                                    <Upload className="w-6 h-6 text-brand" />
                                                </div>
                                                <span className="text-slate-600 font-bold">Seleccionar archivo</span>
                                                <p className="text-[10px] text-slate-400 uppercase tracking-wider">PDF o Imagen (Máx 5MB)</p>
                                            </div>
                                        )}
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="bg-emerald-50 p-4 flex items-center gap-3">
                            <Lock className="w-5 h-5 text-emerald-600 shrink-0" />
                            <p className="text-xs text-emerald-800">
                                Tu información está protegida y tu transacción es totalmente segura.
                            </p>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
