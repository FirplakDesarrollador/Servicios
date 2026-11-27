'use client';

import { useEffect } from 'react';

// Reemplaza la pagina de error por defecto de Next ("This page couldn't load"),
// que aparece cuando el error escapa de app/error.tsx (p. ej. en el layout raiz).
export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error('Error global no controlado:', error);
    }, [error]);

    return (
        <html lang="es" translate="no">
            <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#f8fafc' }}>
                <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
                    <div style={{ background: '#fff', borderRadius: 24, padding: 32, maxWidth: 420, width: '100%', textAlign: 'center', boxShadow: '0 10px 30px rgba(0,0,0,.08)' }}>
                        <h2 style={{ margin: '0 0 8px', color: '#1e293b', fontSize: 20 }}>Ocurrió un inconveniente</h2>
                        <p style={{ margin: '0 0 24px', color: '#64748b', fontSize: 14 }}>
                            Los cambios que ya guardaste no se perdieron. Recarga la página para continuar.
                        </p>
                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                            <button
                                onClick={() => window.location.reload()}
                                style={{ flex: 1, padding: '12px 16px', borderRadius: 12, border: 0, background: '#0f172a', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
                            >
                                Recargar
                            </button>
                            <button
                                onClick={() => reset()}
                                style={{ flex: 1, padding: '12px 16px', borderRadius: 12, border: 0, background: '#f1f5f9', color: '#334155', fontWeight: 700, cursor: 'pointer' }}
                            >
                                Reintentar
                            </button>
                        </div>
                    </div>
                </div>
            </body>
        </html>
    );
}
