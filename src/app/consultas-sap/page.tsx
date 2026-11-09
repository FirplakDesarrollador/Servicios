'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, FileText, Factory, ClipboardList, Truck, Receipt, ReceiptText, Boxes, ChevronRight, Loader2, Search, Warehouse, Users, RotateCcw } from 'lucide-react';
import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import type { ClassicSapMode } from '@/components/sap/ExploradorSap';

const cargandoModulo = () => (
  <div className="flex items-center justify-center gap-2 py-16 text-sm text-stone-500">
    <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> Abriendo módulo…
  </div>
);
const OfertaDeVenta = dynamic(() => import('@/components/sap/OfertaDeVenta'), { ssr: false, loading: cargandoModulo });
const LDMCostos = dynamic(() => import('@/components/sap/LDMCostos'), { ssr: false, loading: cargandoModulo });
const InventarioSap = dynamic(() => import('@/components/sap/InventarioSap'), { ssr: false, loading: cargandoModulo });
const ExploradorSap = dynamic(() => import('@/components/sap/ExploradorSap'), { ssr: false, loading: cargandoModulo });
const SocioNegociosSap = dynamic(() => import('@/components/sap/SocioNegociosSap'), { ssr: false, loading: cargandoModulo });

const CLASSIC_MODULE_BY_MODE: Record<ClassicSapMode, string> = {
  Quotation: 'oferta-venta',
  Order: 'orden-venta',
  Delivery: 'entrega-despacho',
  Invoice: 'factura-cliente',
  ProductionOrder: 'orden-fabricacion',
};

// En el orden de los menús de SAP: Ventas - Clientes, Socios de negocios, Inventario y Producción
const SAP_MODULES = [
  { id: 'oferta-venta', title: 'Oferta de venta', description: 'Creación y consulta de ofertas de ventas.', icon: FileText, active: true },
  { id: 'orden-venta', title: 'Orden de venta', description: 'Seguimiento y detalle de pedidos de clientes.', icon: ClipboardList, active: true },
  { id: 'entrega-despacho', title: 'Entrega', description: 'Documentos de entrega y guías de despacho.', icon: Truck, active: true },
  { id: 'factura-cliente', title: 'Factura de deudores', description: 'Histórico de facturación de clientes.', icon: Receipt, active: true },
  { id: 'nota-debito', title: 'Nota de débito de clientes', description: 'Notas débito emitidas a clientes.', icon: ReceiptText, active: true },
  { id: 'socio-negocios', title: 'Datos maestros socio de negocios', description: 'Ficha del cliente o proveedor: contactos, direcciones y saldos.', icon: Users, active: true },
  { id: 'inventario-sap', title: 'Datos maestros de artículo', description: 'Stock por almacén, precios y planificación.', icon: Warehouse, active: true },
  { id: 'orden-fabricacion', title: 'Orden de fabricación', description: 'Estado de las órdenes de fabricación en planta.', icon: Factory, active: true },
  { id: 'ldm-costos', title: 'LDM Costos', description: 'Costo de producto terminado por lista de materiales.', icon: Boxes, active: true },
];

const MODULE_TITLES: Record<string, string> = {
  explorador: 'Explorador',
  ...Object.fromEntries(SAP_MODULES.map((m) => [m.id, m.title])),
};

const SEARCH_EXAMPLES = [
  { label: 'Cédula / NIT', value: '71619197' },
  { label: 'Nombre', value: 'gomez zuluaga' },
  { label: 'Documento', value: '165165' },
  { label: 'Orden de compra', value: '83118' },
];

export default function ConsultasSapPage() {
  const router = useRouter();
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [, setIsAppMinimized] = useState(false);
  // Explorador SAP: búsqueda inicial y documento abierto desde él en una pantalla clásica
  const [heroQuery, setHeroQuery] = useState('');
  const [explorerQuery, setExplorerQuery] = useState<string | null>(null);
  const [classicDocNum, setClassicDocNum] = useState<string | undefined>(undefined);
  const [openedFromExplorer, setOpenedFromExplorer] = useState(false);

  const openExplorer = (query: string) => {
    setExplorerQuery(query);
    setSelectedModule('explorador');
  };

  const goBack = () => {
    if (openedFromExplorer && selectedModule !== 'explorador') {
      setOpenedFromExplorer(false);
      setClassicDocNum(undefined);
      setSelectedModule('explorador');
    } else if (selectedModule) {
      setSelectedModule(null);
      setExplorerQuery(null);
      setClassicDocNum(undefined);
      setOpenedFromExplorer(false);
    } else {
      router.push('/');
    }
  };

  // Nueva búsqueda: deja la pantalla abierta en blanco (se vuelve a montar) para consultar otro documento o código.
  // En el Explorador vuelve al buscador principal.
  const [reinicio, setReinicio] = useState(0);
  const nuevaBusqueda = () => {
    setClassicDocNum(undefined);
    setOpenedFromExplorer(false);
    if (selectedModule === 'explorador') {
      setSelectedModule(null);
      setExplorerQuery(null);
      setHeroQuery('');
    } else {
      setReinicio((n) => n + 1);
    }
  };

  const backLabel = openedFromExplorer && selectedModule !== 'explorador'
    ? 'Volver al Explorador SAP'
    : selectedModule ? 'Volver a Consultas SAP' : 'Volver al Menú Principal';

  return (
    <div className="min-h-screen bg-cream font-sans text-brand-dark pb-12">
      {/* Barra superior */}
      <header className="fixed top-0 left-0 w-full h-14 z-50 bg-white/90 backdrop-blur border-b border-border flex items-center gap-3 px-4 sm:px-6">
        <button
          onClick={goBack}
          className="w-9 h-9 flex items-center justify-center rounded-lg text-stone-500 hover:text-brand hover:bg-cream-light transition-colors cursor-pointer"
          title={backLabel}
          aria-label={backLabel}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <button onClick={() => { setSelectedModule(null); setExplorerQuery(null); setOpenedFromExplorer(false); setClassicDocNum(undefined); }} className="flex flex-col cursor-pointer" title="Inicio de Consultas SAP">
          <img src="/logo-firplak-wordmark.png" alt="FIRPLAK" className="h-[15px] w-auto self-start" />
          <span className="text-[10px] font-medium tracking-[0.2em] uppercase text-brand-light mt-1">Consultas SAP</span>
        </button>
        {selectedModule && (
          <>
            <span className="w-px h-6 bg-border mx-1" />
            <span className="text-sm font-semibold text-brand truncate">{MODULE_TITLES[selectedModule] || ''}</span>
            <button
              onClick={nuevaBusqueda}
              className="ml-auto shrink-0 inline-flex items-center gap-2 h-9 px-3 sm:px-4 rounded-lg bg-brand text-white text-sm font-semibold hover:bg-brand-hover transition-colors cursor-pointer"
              title="Limpiar la pantalla para hacer una búsqueda nueva"
              aria-label="Nueva búsqueda"
            >
              <RotateCcw className="w-4 h-4" aria-hidden />
              <span className="hidden sm:inline">Nueva búsqueda</span>
            </button>
          </>
        )}
      </header>

      <main className="pt-14 px-4 max-w-[1700px] mx-auto">
        {explorerQuery !== null && (
          <div className={selectedModule === 'explorador' ? '' : 'hidden'}>
            <ExploradorSap
              initialQuery={explorerQuery}
              onOpenClassic={(mode, docNum) => {
                setClassicDocNum(docNum);
                setOpenedFromExplorer(true);
                setSelectedModule(CLASSIC_MODULE_BY_MODE[mode]);
              }}
            />
          </div>
        )}

        {selectedModule === 'explorador' ? null : !selectedModule ? (
          <div className="max-w-5xl mx-auto">
            {/* Buscador principal */}
            <motion.section
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="pt-3 sm:pt-5 pb-6 flex flex-col items-center text-center"
            >
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-brand-dark">
                ¿Qué necesitas consultar en SAP?
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-ink-muted max-w-2xl">
                Busca un cliente por cédula o nombre, o cualquier documento por su número u orden de compra. Todo lo relacionado aparece junto.
              </p>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  openExplorer(heroQuery);
                }}
                className="mt-3 w-full max-w-2xl flex items-center gap-2 bg-white rounded-2xl border border-border shadow-[0_8px_30px_-12px_rgba(37,65,83,0.18)] pl-4 pr-1.5 h-12 focus-within:border-brand-light transition-colors"
              >
                <Search className="w-5 h-5 text-brand-light shrink-0" />
                <input
                  autoFocus
                  value={heroQuery}
                  onChange={(e) => setHeroQuery(e.target.value)}
                  placeholder="Cédula, NIT, nombre, documento u orden de compra"
                  className="flex-1 min-w-0 bg-transparent outline-none text-sm sm:text-base text-brand-dark placeholder:text-stone-400"
                />
                <button type="submit" className="h-9 px-5 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand-hover transition-colors cursor-pointer">
                  Buscar
                </button>
              </form>

              <div className="mt-2.5 flex flex-wrap justify-center gap-2">
                {SEARCH_EXAMPLES.map((ex) => (
                  <button
                    key={ex.value}
                    onClick={() => openExplorer(ex.value)}
                    className="h-7 px-2.5 rounded-full border border-border bg-white/70 text-[11px] text-stone-600 hover:border-brand-light hover:text-brand transition-colors cursor-pointer"
                  >
                    <span className="text-stone-400">{ex.label}:</span> <span className="font-medium">{ex.value}</span>
                  </button>
                ))}
              </div>
            </motion.section>

            {/* Pantallas SAP */}
            <section>
              <p className="text-[11px] font-medium tracking-[0.2em] uppercase text-brand-light mb-3 px-1">Pantallas SAP</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {SAP_MODULES.map((mod, idx) => (
                  <motion.button
                    key={mod.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 + idx * 0.04 }}
                    disabled={!mod.active}
                    onClick={() => setSelectedModule(mod.id)}
                    className={`group text-left flex items-center gap-4 bg-white rounded-2xl border border-border p-4 transition-all ${
                      mod.active ? 'hover:border-brand-light hover:shadow-[0_8px_24px_-14px_rgba(37,65,83,0.35)] cursor-pointer' : 'opacity-55 cursor-not-allowed'
                    }`}
                  >
                    <span className="w-11 h-11 shrink-0 rounded-xl bg-sage-soft text-brand flex items-center justify-center group-hover:bg-brand group-hover:text-white transition-colors">
                      <mod.icon className="w-5 h-5" />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="flex items-center gap-2">
                        <span className="font-semibold text-brand-dark">{mod.title}</span>
                        {!mod.active && <span className="text-[10px] px-1.5 py-px rounded-full bg-stone-100 text-stone-500">Próximamente</span>}
                      </span>
                      <span className="block text-xs text-ink-muted mt-0.5 leading-snug">{mod.description}</span>
                    </span>
                    {mod.active && <ChevronRight className="w-4 h-4 text-stone-300 group-hover:text-brand group-hover:translate-x-0.5 transition-all" />}
                  </motion.button>
                ))}
              </div>
            </section>
          </div>
        ) : (
          /* Pantalla clásica SAP */
          <motion.div key={reinicio} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15 }} className="pt-6">
            {selectedModule === 'ldm-costos' ? (
              <LDMCostos onMinimizeChange={setIsAppMinimized} />
            ) : selectedModule === 'inventario-sap' ? (
              <InventarioSap />
            ) : selectedModule === 'socio-negocios' ? (
              <SocioNegociosSap onVerDocumentos={(codigo) => openExplorer(codigo)} />
            ) : (
              <OfertaDeVenta
                key={`${selectedModule}-${classicDocNum || ''}`}
                initialDocNum={classicDocNum}
                mode={
                  selectedModule === 'orden-fabricacion' ? 'ProductionOrder' :
                  selectedModule === 'orden-venta' ? 'Order' :
                  selectedModule === 'entrega-despacho' ? 'Delivery' :
                  selectedModule === 'factura-cliente' ? 'Invoice' :
                  selectedModule === 'nota-debito' ? 'DebitNote' :
                  'Quotation'
                }
                onMinimizeChange={setIsAppMinimized}
              />
            )}
          </motion.div>
        )}
      </main>
    </div>
  );
}
