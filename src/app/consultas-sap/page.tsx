'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Server, ArrowLeft, FileText, Factory, Package, Truck, Receipt, Boxes, ChevronRight, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import OfertaDeVenta from '@/components/sap/OfertaDeVenta';

export default function ConsultasSapPage() {
  const router = useRouter();
  const [selectedModule, setSelectedModule] = useState<string | null>(null);

  const sapModules = [
    {
      id: 'oferta-venta',
      title: 'Oferta de Venta',
      description: 'Creación y consulta de ofertas de ventas en SAP Business One.',
      icon: FileText,
      color: 'bg-gradient-to-tr from-amber-500 to-orange-500 text-white',
      badge: 'Disponible',
      badgeColor: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      active: true
    },
    {
      id: 'orden-fabricacion',
      title: 'Orden de Fabricación',
      description: 'Seguimiento y estado de órdenes de fabricación (OF) en planta.',
      icon: Factory,
      color: 'bg-gradient-to-tr from-purple-600 to-indigo-600 text-white',
      badge: 'Disponible',
      badgeColor: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      active: true
    },
    {
      id: 'orden-venta',
      title: 'Orden de Venta',
      description: 'Seguimiento y detalle de órdenes de venta en SAP B1.',
      icon: Package,
      color: 'bg-gradient-to-tr from-blue-500 to-indigo-500 text-white',
      badge: 'Disponible',
      badgeColor: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      active: true
    },
    {
      id: 'entrega-despacho',
      title: 'Entrega',
      description: 'Registro y control de documentos de entrega y guías de despacho.',
      icon: Truck,
      color: 'bg-gradient-to-tr from-teal-500 to-emerald-600 text-white',
      badge: 'Disponible',
      badgeColor: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      active: true
    },
    {
      id: 'factura-cliente',
      title: 'Factura de Clientes',
      description: 'Histórico de facturación y comprobantes fiscales SAP.',
      icon: Receipt,
      color: 'bg-gradient-to-tr from-pink-500 to-rose-500 text-white',
      badge: 'Próximamente',
      badgeColor: 'bg-slate-100 text-slate-500 border-slate-200',
      active: false
    },
    {
      id: 'inventario-sap',
      title: 'Stock e Inventario SAP',
      description: 'Consulta de stock por almacenes y artículos en SAP.',
      icon: Boxes,
      color: 'bg-gradient-to-tr from-emerald-500 to-teal-500 text-white',
      badge: 'Próximamente',
      badgeColor: 'bg-slate-100 text-slate-500 border-slate-200',
      active: false
    }
  ];

  return (
    <div className={`min-h-screen font-sans pb-12 transition-colors duration-200 ${
      selectedModule ? 'bg-[#CBD5E1]' : 'bg-[#F1F5F9]'
    }`}>
      {/* App Top Bar */}
      <header className="fixed top-0 left-0 w-full bg-brand text-white z-50 h-[3.5rem] flex items-center px-6 shadow-lg justify-between">
        <div className="flex items-center">
          <button
            onClick={() => {
              if (selectedModule) {
                setSelectedModule(null);
              } else {
                router.push('/');
              }
            }}
            className="mr-4 p-2 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            title={selectedModule ? "Volver a Módulos SAP" : "Volver al Menú Principal"}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Server className="w-5 h-5 opacity-70" />
            <h1 className="font-black text-xl tracking-tight uppercase">
              {selectedModule === 'orden-fabricacion'
                ? 'Consultas SAP — Orden de Fabricación'
                : selectedModule === 'orden-venta' 
                ? 'Consultas SAP — Orden de Venta' 
                : selectedModule === 'entrega-despacho'
                ? 'Consultas SAP — Entrega'
                : selectedModule === 'oferta-venta'
                ? 'Consultas SAP — Oferta de Ventas' 
                : 'Consultas SAP'}
            </h1>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="pt-20 px-4 max-w-[1700px] mx-auto">
        {!selectedModule ? (
          /* ── Sub-menu Dashboard Cards (Cuadritos) ────────────────────────── */
          <div className="max-w-6xl mx-auto pt-6">
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8 text-center"
            >
              <span className="px-3 py-1 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold uppercase tracking-widest rounded-full inline-flex items-center gap-1.5 mb-3 shadow-xs">
                <Sparkles className="w-3.5 h-3.5" />
                Módulos de Integración SAP Business One
              </span>
              <h2 className="text-3xl font-black text-slate-800 tracking-tight uppercase">
                Seleccione un Módulo SAP
              </h2>
              <p className="text-slate-500 font-medium text-sm mt-1 max-w-md mx-auto">
                Acceda a las pantallas operativas y consultas oficiales de SAP Business One.
              </p>
            </motion.div>

            {/* Grid Cards (Cuadritos) - 3 Columns Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sapModules.map((mod, idx) => (
                <motion.div
                  key={mod.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.08 }}
                  whileHover={mod.active ? { y: -4, scale: 1.01 } : {}}
                  onClick={() => {
                    if (mod.active) setSelectedModule(mod.id);
                  }}
                  className={`bg-white rounded-3xl p-6 border shadow-sm transition-all relative overflow-hidden flex flex-col justify-between ${
                    mod.active 
                      ? 'border-slate-200 hover:border-brand/40 hover:shadow-xl hover:shadow-brand/5 cursor-pointer group' 
                      : 'border-slate-100 opacity-60 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-md ${mod.color}`}>
                      <mod.icon className="w-7 h-7" />
                    </div>
                    <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full border ${mod.badgeColor}`}>
                      {mod.badge}
                    </span>
                  </div>

                  <div>
                    <h3 className={`text-xl font-black tracking-tight mb-1 ${
                      mod.active ? 'text-slate-800 group-hover:text-brand transition-colors' : 'text-slate-500'
                    }`}>
                      {mod.title}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed mb-4">
                      {mod.description}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold">
                    <span className={mod.active ? 'text-brand' : 'text-slate-400'}>
                      {mod.active ? 'Abrir pantalla SAP' : 'En desarrollo'}
                    </span>
                    <ChevronRight className={`w-4 h-4 transition-transform ${
                      mod.active ? 'text-brand group-hover:translate-x-1' : 'text-slate-300'
                    }`} />
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        ) : (
          /* ── Full SAP Business One Screen ────────────────────────────────── */
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.15 }}
          >
            <OfertaDeVenta 
              mode={
                selectedModule === 'orden-fabricacion' ? 'ProductionOrder' :
                selectedModule === 'orden-venta' ? 'Order' :
                selectedModule === 'entrega-despacho' ? 'Delivery' :
                'Quotation'
              } 
            />
          </motion.div>
        )}
      </main>
    </div>
  );
}
