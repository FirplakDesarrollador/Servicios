'use client';

import { useEffect } from 'react';
import { AlertCircle, RefreshCw, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function GlobalErrorBoundary({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error('Error no controlado en la aplicación:', error);
    }, [error]);

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
            <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-xl border border-slate-100 flex flex-col items-center">
                <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mb-4">
                    <AlertCircle className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-2">
                    Ocurrió un inconveniente
                </h2>
                <p className="text-sm text-slate-500 mb-6">
                    {error?.message || 'Hubo un error al cargar la página. Por favor intenta recargar o regresar al inicio.'}
                </p>
                <div className="flex flex-col sm:flex-row gap-3 w-full">
                    <button
                        onClick={() => reset()}
                        className="flex-1 bg-brand text-white py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-brand/90 transition-all shadow-md active:scale-95"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Reintentar
                    </button>
                    <Link
                        href="/"
                        className="flex-1 bg-slate-100 text-slate-700 py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-slate-200 transition-all active:scale-95"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Ir al Inicio
                    </Link>
                </div>
            </div>
        </div>
    );
}
