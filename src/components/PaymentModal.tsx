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

    const handleFileUpload = async () => {
        if (!file) {
            setError('Debe adjuntar el soporte de pago');
            return;
        }

        try {
            setUploading(true);
            setError(null);

            const fileExt = file.name.split('.').pop();
            const fileName = `${consecutivo}_soporte_pago.${fileExt}`;
            const filePath = `${consecutivo}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('solicitudesclientes')
                .upload(filePath, file);

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
                                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                                        className="hidden"
                                        id="payment-proof-upload"
                                    />
                                    <label
                                        htmlFor="payment-proof-upload"
                                        className={`flex items-center justify-center gap-2 w-full p-3 rounded-lg border-2 border-dashed cursor-pointer transition-colors ${file ? 'border-emerald-500 bg-emerald-50' : 'border-slate-300 hover:border-blue-400 hover:bg-white'
                                            }`}
                                    >
                                        {file ? (
                                            <>
                                                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                                                <span className="text-emerald-700 font-medium truncate max-w-[200px]">{file.name}</span>
                                            </>
                                        ) : (
                                            <>
                                                <Upload className="w-5 h-5 text-slate-400" />
                                                <span className="text-slate-600 font-medium">Seleccionar archivo</span>
                                            </>
                                        )}
                                    </label>
                                </div>

                                <button
                                    onClick={handleFileUpload}
                                    disabled={!file || uploading}
                                    className={`mt-4 w-full py-3 px-4 rounded-lg font-bold text-white transition-all ${!file || uploading
                                        ? 'bg-slate-300 cursor-not-allowed'
                                        : 'bg-brand hover:bg-brand/90 shadow-lg hover:shadow-xl'
                                        }`}
                                >
                                    {uploading ? 'Subiendo...' : 'Adjuntar soporte de pago'}
                                </button>
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
