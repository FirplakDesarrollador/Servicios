'use client';

import { useRouter } from 'next/navigation';
import { Server, ArrowLeft } from 'lucide-react';
import OfertaDeVenta from '@/components/sap/OfertaDeVenta';

export default function ConsultasSapPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#CBD5E1] text-slate-800 font-sans pb-12">
      {/* App Top Bar */}
      <header className="fixed top-0 left-0 w-full bg-brand text-white z-50 h-[3.5rem] flex items-center px-6 shadow-lg justify-between">
        <div className="flex items-center">
          <button
            onClick={() => router.push('/')}
            className="mr-4 p-2 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            title="Volver al Menú Principal"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Server className="w-5 h-5 opacity-70" />
            <h1 className="font-black text-xl tracking-tight uppercase">Consultas SAP - Oferta de Ventas</h1>
          </div>
        </div>
      </header>

      {/* Main SAP B1 Container */}
      <main className="pt-16 px-2 max-w-[1700px] mx-auto">
        <OfertaDeVenta />
      </main>
    </div>
  );
}
