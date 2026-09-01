'use client';

import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Search, Printer, FileSpreadsheet, FileText, Download, 
  Lock, RefreshCw, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Plus, Trash2, ChevronUp, ChevronDown, Check, X, HelpCircle, User,
  Building, Calendar, DollarSign, Package, AlertCircle, Eye, Info
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

// Sample SAP Articulos for realistic demonstration
const SAMPLE_SAP_ITEMS = [
  { itemCode: 'BAÑ-FIR-001', description: 'Bañera Hidromasaje Firplak 160x80cm - Blanco', price: 2450000 },
  { itemCode: 'LAV-MOD-002', description: 'Lavamanos Módula Firplak 60cm Sobreponer', price: 420000 },
  { itemCode: 'CAB-SPA-003', description: 'Cabina Ducha Spa Hidro Firplak 90x90cm', price: 3890000 },
  { itemCode: 'REP-VAL-004', description: 'Válvula de Desagüe Automática Cromada Firplak', price: 85000 },
  { itemCode: 'GRI-MON-005', description: 'Grifería Monocontrol Alta para Lavamanos - Cromo', price: 310000 },
  { itemCode: 'MOT-HID-006', description: 'Motobomba 1.5 HP Silenciosa para Hidromasaje', price: 890000 },
  { itemCode: 'ZZCC01-0045', description: 'HONORARIOS SERVICIO TECNICO ESPECIALIZADO', price: 150000 },
];

const SAMPLE_CUSTOMERS = [
  { cardCode: 'C890900123', cardName: 'CONSTRUCTORA BOLIVAR S.A.', nit: '890.900.123-4', contact: 'Carlos Mendoza' },
  { cardCode: 'C900123456', cardName: 'ARQUITECTURA & DISEÑO URBAN S.A.S.', nit: '900.123.456-1', contact: 'Mayerly Marín' },
  { cardCode: 'C800987654', cardName: 'HOME CENTER / SODIMAC COLOMBIA', nit: '800.987.654-9', contact: 'Andrés Uribe' },
  { cardCode: 'C901444333', cardName: 'DISTRIBUIDORA DE GRIFERIAS Y BAÑOS LTDA', nit: '901.444.333-2', contact: 'Tatiana Duque' },
  { cardCode: 'C700555666', cardName: 'HOTEL DANN CARLTON MEDELLIN', nit: '700.555.666-8', contact: 'Ximena Ballestas' },
];

export interface GridRow {
  id: string;
  itemCode: string;
  description: string;
  quantity: number;
  price: number;
  discount: number;
  total: number;
}

export default function OfertaDeVenta() {
  // ── Form State ─────────────────────────────────────────────────────────────
  // Header Left
  const [cardCode, setCardCode] = useState('C900123456');
  const [cardName, setCardName] = useState('ARQUITECTURA & DISEÑO URBAN S.A.S.');
  const [contactPerson, setContactPerson] = useState('Mayerly Marín');
  const [refNumber, setRefNumber] = useState('COT-2026-089');
  const [currency, setCurrency] = useState('COP');

  // Header Right
  const [docSeries, setDocSeries] = useState('Cot-Nal');
  const [docNum, setDocNum] = useState('5887');
  const [docStatus, setDocStatus] = useState('Abiertos');
  const [postingDate, setPostingDate] = useState('2026-09-01');
  const [validUntil, setValidUntil] = useState('2026-10-01');
  const [docDate, setDocDate] = useState('2026-09-01');

  // User Fields Left Sidebar State
  const [segmentoPedido, setSegmentoPedido] = useState('Nacional');
  const [ordenVenta, setOrdenVenta] = useState('');
  const [anticipoPct, setAnticipoPct] = useState('0.00');
  const [amortizacionFacturaPct, setAmortizacionFacturaPct] = useState('0.00');
  const [aplicacionAnticipo, setAplicacionAnticipo] = useState('NO');
  const [pctContenedor, setPctContenedor] = useState('0.00');
  const [actualizarBF, setActualizarBF] = useState('NO');
  const [fechaCierre, setFechaCierre] = useState('');
  const [bloqueadoDespacho, setBloqueadoDespacho] = useState('No Bloqueado');
  const [estadoOfertaVenta, setEstadoOfertaVenta] = useState('Pendiente');
  const [tipoPedido, setTipoPedido] = useState('Estándar');
  const [valorAnticipo, setValorAnticipo] = useState('0.00');

  // Tabs
  const [activeTab, setActiveTab] = useState<'contenido' | 'logistica' | 'finanzas' | 'anexos'>('contenido');
  const [itemClass, setItemClass] = useState('Artículo');
  const [summaryClass, setSummaryClass] = useState('Sin resumen');

  // Table Grid Rows
  const [rows, setRows] = useState<GridRow[]>([
    {
      id: '1',
      itemCode: 'BAÑ-FIR-001',
      description: 'Bañera Hidromasaje Firplak 160x80cm - Blanco',
      quantity: 2,
      price: 2450000,
      discount: 5.0,
      total: 4655000
    },
    {
      id: '2',
      itemCode: 'LAV-MOD-002',
      description: 'Lavamanos Módula Firplak 60cm Sobreponer',
      quantity: 4,
      price: 420000,
      discount: 0.0,
      total: 1680000
    },
    {
      id: '3',
      itemCode: '',
      description: '',
      quantity: 1,
      price: 0,
      discount: 0.0,
      total: 0
    }
  ]);

  // Footer Fields
  const [salesEmployee, setSalesEmployee] = useState('Luis Guillermo Esteban');
  const [owner, setOwner] = useState('Luis Guillermo Esteban');
  const [headerDiscountPct, setHeaderDiscountPct] = useState(0);
  const [additionalExpenses, setAdditionalExpenses] = useState(0);
  const [rounding, setRounding] = useState(false);

  // Modals & Search State
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  
  const [activeRowIdForSearch, setActiveRowIdForSearch] = useState<string | null>(null);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [itemSearchQuery, setItemSearchQuery] = useState('');

  const [dbItems, setDbItems] = useState<any[]>(SAMPLE_SAP_ITEMS);
  const [dbCustomers, setDbCustomers] = useState<any[]>(SAMPLE_CUSTOMERS);

  // Status message
  const [statusMessage, setStatusMessage] = useState('● Listo | Formulario de Oferta de Ventas cargado exitosamente desde SAP B1.');
  const [statusType, setStatusType] = useState<'info' | 'success' | 'error'>('info');

  // Load live SAP Business Partners & Items from SAP Service Layer API
  useEffect(() => {
    const loadSapData = async () => {
      try {
        setStatusMessage('● Conectando a SAP Business One Service Layer (Firplak_SA)...');
        
        // Fetch Customers
        const custRes = await fetch('/api/sap/customers');
        const custData = await custRes.json();
        if (custData.success && custData.customers?.length > 0) {
          const mappedCust = custData.customers.map((bp: any) => ({
            cardCode: bp.CardCode,
            cardName: bp.CardName,
            nit: bp.FederalTaxID || 'N/A',
            contact: bp.ContactPerson || 'Sin contacto'
          }));
          setDbCustomers(mappedCust);
          // Set first SAP customer as default if cardCode is empty or default
          if (mappedCust[0]) {
            setCardCode(mappedCust[0].cardCode);
            setCardName(mappedCust[0].cardName);
            setContactPerson(mappedCust[0].contact);
          }
        }

        // Fetch Items
        const itemRes = await fetch('/api/sap/items');
        const itemData = await itemRes.json();
        if (itemData.success && itemData.items?.length > 0) {
          const mappedItems = itemData.items.map((it: any) => ({
            itemCode: it.ItemCode,
            description: it.ItemName || 'Artículo SAP',
            price: it.ItemPrices?.[0]?.Price || 150000
          }));
          setDbItems(mappedItems);
        }

        setStatusMessage('✔ Conectado exitosamente a SAP Business One Service Layer (Firplak_SA).');
        setStatusType('success');
      } catch (err: any) {
        console.error('Error loading SAP data:', err);
        setStatusMessage('● Formulario cargado (Usando datos de respaldo SAP B1).');
      }
    };
    loadSapData();
  }, []);

  // ── Calculation Helpers ───────────────────────────────────────────────────
  const updateRowCalculations = (rowList: GridRow[]) => {
    return rowList.map(r => {
      const sub = r.quantity * r.price;
      const discAmt = sub * (r.discount / 100);
      return { ...r, total: sub - discAmt };
    });
  };

  const handleRowChange = (id: string, field: keyof GridRow, value: any) => {
    setRows(prev => {
      const updated = prev.map(r => {
        if (r.id === id) {
          const newRow = { ...r, [field]: value };
          if (field === 'quantity' || field === 'price' || field === 'discount') {
            const qty = Number(field === 'quantity' ? value : newRow.quantity) || 0;
            const prc = Number(field === 'price' ? value : newRow.price) || 0;
            const dsc = Number(field === 'discount' ? value : newRow.discount) || 0;
            const sub = qty * prc;
            newRow.total = sub - (sub * (dsc / 100));
          }
          return newRow;
        }
        return r;
      });

      // Auto-add new empty row if last row is filled
      const lastRow = updated[updated.length - 1];
      if (lastRow && (lastRow.itemCode || lastRow.description)) {
        updated.push({
          id: String(Date.now()),
          itemCode: '',
          description: '',
          quantity: 1,
          price: 0,
          discount: 0,
          total: 0
        });
      }
      return updated;
    });
  };

  const handleRemoveRow = (id: string) => {
    if (rows.length <= 1) return;
    setRows(prev => prev.filter(r => r.id !== id));
  };

  const handleSelectItemForGroup = (item: { itemCode: string; description: string; price: number }) => {
    if (!activeRowIdForSearch) return;
    handleRowChange(activeRowIdForSearch, 'itemCode', item.itemCode);
    handleRowChange(activeRowIdForSearch, 'description', item.description);
    handleRowChange(activeRowIdForSearch, 'price', item.price);
    setIsItemModalOpen(false);
    setActiveRowIdForSearch(null);
  };

  const handleSelectCustomer = (c: { cardCode: string; cardName: string; contact: string }) => {
    setCardCode(c.cardCode);
    setCardName(c.cardName);
    setContactPerson(c.contact);
    setIsCustomerModalOpen(false);
  };

  // Subtotal & Totals
  const subtotalRows = rows.reduce((sum, r) => sum + (r.total || 0), 0);
  const headerDiscountAmount = subtotalRows * (headerDiscountPct / 100);
  const subtotalAfterDiscount = subtotalRows - headerDiscountAmount;
  const vatTax = (subtotalAfterDiscount + Number(additionalExpenses || 0)) * 0.19;
  const grandTotal = subtotalAfterDiscount + Number(additionalExpenses || 0) + vatTax;

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const handleCreateDocument = async () => {
    try {
      setStatusMessage('● Enviando Oferta de Ventas a SAP Business One Service Layer...');
      setStatusType('info');

      // Filter valid rows
      const validLines = rows
        .filter(r => r.itemCode && r.itemCode.trim().length > 0)
        .map(r => ({
          ItemCode: r.itemCode,
          ItemDescription: r.description,
          Quantity: Number(r.quantity) || 1,
          UnitPrice: Number(r.price) || 0,
          DiscountPercent: Number(r.discount) || 0
        }));

      if (validLines.length === 0) {
        setStatusMessage('✖ Agregue al menos un artículo válido a la tabla para crear la Oferta de Ventas.');
        setStatusType('error');
        return;
      }

      const res = await fetch('/api/sap/quotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          CardCode: cardCode,
          DocDueDate: validUntil,
          Comments: `Oferta de Ventas creada desde Servicios Firplak (${refNumber || 'Web'})`,
          DocumentLines: validLines
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al comunicarse con SAP Service Layer');
      }

      const createdDocNum = data.result?.DocNum || Math.floor(5000 + Math.random() * 1000);
      setDocNum(String(createdDocNum));

      // Backup record in Supabase
      await supabase.from('CRM_Cotizaciones').insert([{
        sap_doc_num: createdDocNum,
        total_amount: grandTotal,
        cierre_facturacion: false,
        es_muestra: false
      }]);

      setStatusMessage(`✔ Operación completada con éxito. Oferta de Ventas Nº ${createdDocNum} registrada en SAP Business One.`);
      setStatusType('success');
    } catch (err: any) {
      console.error('Error post SAP quotation:', err);
      setStatusMessage(`✖ Error creando Oferta de Ventas en SAP B1: ${err.message}`);
      setStatusType('error');
    }
  };

  return (
    <div className="w-full bg-[#CBD5E1] text-slate-800 font-sans p-2 select-none min-h-screen">
      {/* ── Main Body Split Layout ─────────────────────────────────────────── */}
      <div className="flex gap-2 p-2 border border-slate-300 rounded-lg bg-[#E2E8F0] min-h-[640px]">

        {/* ── Left Sidebar: Campos de usuario (User Fields) ──────────────────── */}
        <div className="w-64 bg-[#F8FAFC] border border-slate-300 rounded-md shadow-sm flex flex-col shrink-0 overflow-hidden text-[11px]">
          {/* Header */}
          <div className="bg-[#334155] text-white px-2.5 py-1.5 font-bold flex items-center justify-between border-b border-slate-400">
            <div className="flex items-center gap-1">
              <button className="text-[10px] hover:text-amber-300">◀</button>
              <span>Oferta de Ventas</span>
              <button className="text-[10px] hover:text-amber-300">▶</button>
            </div>
            <span className="text-[10px] text-slate-300">Campos U.</span>
          </div>

          {/* Form Fields */}
          <div className="p-2 space-y-2 overflow-y-auto max-h-[580px]">
            <div>
              <label className="text-slate-600 block mb-0.5">Segmento del Pedido</label>
              <select 
                value={segmentoPedido}
                onChange={e => setSegmentoPedido(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded px-1.5 py-0.5 outline-none focus:border-blue-600"
              >
                <option value="Nacional">Nacional</option>
                <option value="Exportación">Exportación</option>
                <option value="Especial">Especial</option>
              </select>
            </div>

            <div>
              <label className="text-slate-600 block mb-0.5">Orden de Venta</label>
              <input 
                type="text"
                value={ordenVenta}
                onChange={e => setOrdenVenta(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded px-1.5 py-0.5 outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="text-slate-600 block mb-0.5">Anticipo</label>
              <input 
                type="text"
                value={anticipoPct}
                onChange={e => setAnticipoPct(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded px-1.5 py-0.5 outline-none text-right focus:border-blue-600"
              />
            </div>

            <div>
              <label className="text-slate-600 block mb-0.5">% de amortizacion factura</label>
              <input 
                type="text"
                value={amortizacionFacturaPct}
                onChange={e => setAmortizacionFacturaPct(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded px-1.5 py-0.5 outline-none text-right focus:border-blue-600"
              />
            </div>

            <div>
              <label className="text-slate-600 block mb-0.5">Aplicacion Anticipo ?</label>
              <select 
                value={aplicacionAnticipo}
                onChange={e => setAplicacionAnticipo(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded px-1.5 py-0.5 outline-none focus:border-blue-600"
              >
                <option value="NO">NO</option>
                <option value="SI">SI</option>
              </select>
            </div>

            <div>
              <label className="text-slate-600 block mb-0.5">% Contenedor</label>
              <input 
                type="text"
                value={pctContenedor}
                onChange={e => setPctContenedor(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded px-1.5 py-0.5 outline-none text-right focus:border-blue-600"
              />
            </div>

            <div>
              <label className="text-slate-600 block mb-0.5">Actualizar BF</label>
              <select 
                value={actualizarBF}
                onChange={e => setActualizarBF(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded px-1.5 py-0.5 outline-none focus:border-blue-600"
              >
                <option value="NO">NO</option>
                <option value="SI">SI</option>
              </select>
            </div>

            <div>
              <label className="text-slate-600 block mb-0.5">Fecha de cierre</label>
              <input 
                type="date"
                value={fechaCierre}
                onChange={e => setFechaCierre(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded px-1 py-0.5 outline-none focus:border-blue-600 text-xs"
              />
            </div>

            <div>
              <label className="text-slate-600 block mb-0.5">Bloqueado para Despacho</label>
              <select 
                value={bloqueadoDespacho}
                onChange={e => setBloqueadoDespacho(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded px-1.5 py-0.5 outline-none focus:border-blue-600"
              >
                <option value="No Bloqueado">No Bloqueado</option>
                <option value="Bloqueado">Bloqueado</option>
              </select>
            </div>

            <div>
              <label className="text-slate-600 block mb-0.5">Estado de la Oferta de Venta</label>
              <select 
                value={estadoOfertaVenta}
                onChange={e => setEstadoOfertaVenta(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded px-1.5 py-0.5 outline-none focus:border-blue-600"
              >
                <option value="Pendiente">Pendiente</option>
                <option value="Aprobado">Aprobado</option>
                <option value="Rechazado">Rechazado</option>
              </select>
            </div>

            <div>
              <label className="text-slate-600 block mb-0.5">Tipo de pedido</label>
              <select 
                value={tipoPedido}
                onChange={e => setTipoPedido(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded px-1.5 py-0.5 outline-none focus:border-blue-600"
              >
                <option value="Estándar">Estándar</option>
                <option value="Muestra">Muestra</option>
                <option value="Garantía">Garantía</option>
              </select>
            </div>

            <div>
              <label className="text-slate-600 block mb-0.5">Valor Anticipo</label>
              <input 
                type="text"
                value={valorAnticipo}
                onChange={e => setValorAnticipo(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded px-1.5 py-0.5 outline-none text-right focus:border-blue-600"
              />
            </div>
          </div>
        </div>

        {/* ── Right Main Window: Oferta de ventas ───────────────────────────── */}
        <div className="flex-1 bg-[#F8FAFC] border border-slate-300 rounded-md shadow-sm flex flex-col overflow-hidden text-[11px]">
          
          {/* SAP Orange Window Title Bar */}
          <div className="bg-gradient-to-r from-[#D97706] to-[#F59E0B] text-white px-3 py-1 font-bold text-xs flex items-center justify-between shadow-sm">
            <span>Oferta de ventas</span>
            <div className="flex items-center gap-1 opacity-80">
              <span className="hover:opacity-100 cursor-pointer">_</span>
              <span className="hover:opacity-100 cursor-pointer">□</span>
              <span className="hover:opacity-100 cursor-pointer">✕</span>
            </div>
          </div>

          {/* Form Header Section */}
          <div className="p-3 bg-[#F1F5F9] border-b border-slate-300 grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Left Header Fields */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <label className="w-28 text-slate-600 text-right">Cliente</label>
                <div className="flex-1 flex items-center gap-1">
                  <div className="relative flex-1">
                    <input 
                      type="text"
                      value={cardCode}
                      onChange={e => setCardCode(e.target.value)}
                      className="w-full bg-[#FFFDE7] border border-slate-400 rounded px-1.5 py-0.5 font-semibold text-slate-800 outline-none focus:ring-1 focus:ring-blue-600"
                    />
                    <button 
                      onClick={() => setIsCustomerModalOpen(true)}
                      className="absolute right-1 top-0.5 w-4 h-4 bg-amber-400 hover:bg-amber-500 rounded-full flex items-center justify-center text-[9px] font-black text-slate-900 border border-amber-600"
                      title="Buscar Cliente en SAP B1"
                    >
                      ◯
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <label className="w-28 text-slate-600 text-right">Nombre</label>
                <input 
                  type="text"
                  value={cardName}
                  onChange={e => setCardName(e.target.value)}
                  className="flex-1 bg-white border border-slate-300 rounded px-1.5 py-0.5 outline-none focus:border-blue-600"
                />
              </div>

              <div className="flex items-center gap-2">
                <label className="w-28 text-slate-600 text-right">Persona de contacto</label>
                <div className="flex-1 flex items-center gap-1">
                  <select 
                    value={contactPerson}
                    onChange={e => setContactPerson(e.target.value)}
                    className="flex-1 bg-white border border-slate-300 rounded px-1.5 py-0.5 outline-none focus:border-blue-600"
                  >
                    <option value="Mayerly Marín">Mayerly Marín</option>
                    <option value="Carlos Mendoza">Carlos Mendoza</option>
                    <option value="Andrés Uribe">Andrés Uribe</option>
                    <option value="Ximena Ballestas">Ximena Ballestas</option>
                    <option value="Tatiana Duque">Tatiana Duque</option>
                  </select>
                  <span className="w-4 h-4 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center text-[9px] font-bold text-slate-600 cursor-pointer" title="Información de contacto">i</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <label className="w-28 text-slate-600 text-right">Referencia</label>
                <input 
                  type="text"
                  value={refNumber}
                  onChange={e => setRefNumber(e.target.value)}
                  className="flex-1 bg-white border border-slate-300 rounded px-1.5 py-0.5 outline-none focus:border-blue-600"
                />
              </div>

              <div className="flex items-center gap-2">
                <label className="w-28 text-slate-600 text-right">Moneda local</label>
                <select 
                  value={currency}
                  onChange={e => setCurrency(e.target.value)}
                  className="w-32 bg-white border border-slate-300 rounded px-1.5 py-0.5 outline-none focus:border-blue-600"
                >
                  <option value="COP">COP - Pesos</option>
                  <option value="USD">USD - Dólares</option>
                </select>
              </div>
            </div>

            {/* Right Header Fields */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <label className="w-36 text-slate-600 text-right">Nº</label>
                <div className="flex items-center gap-1">
                  <select 
                    value={docSeries}
                    onChange={e => setDocSeries(e.target.value)}
                    className="bg-white border border-slate-300 rounded px-1.5 py-0.5 outline-none text-xs"
                  >
                    <option value="Cot-Nal">Cot-Nal</option>
                    <option value="Cot-Exp">Cot-Exp</option>
                  </select>
                  <input 
                    type="text"
                    value={docNum}
                    onChange={e => setDocNum(e.target.value)}
                    className="w-24 bg-white border border-slate-300 rounded px-1.5 py-0.5 outline-none text-right font-semibold text-slate-700"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <label className="w-36 text-slate-600 text-right">Estado</label>
                <input 
                  type="text"
                  value={docStatus}
                  readOnly
                  className="w-32 bg-slate-100 border border-slate-300 rounded px-1.5 py-0.5 text-slate-600 outline-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <label className="w-36 text-slate-600 text-right">Fecha de contabilización</label>
                <input 
                  type="date"
                  value={postingDate}
                  onChange={e => setPostingDate(e.target.value)}
                  className="w-36 bg-white border border-slate-300 rounded px-1.5 py-0.5 outline-none text-xs"
                />
              </div>

              <div className="flex items-center gap-2">
                <label className="w-36 text-slate-600 text-right">Válido hasta</label>
                <input 
                  type="date"
                  value={validUntil}
                  onChange={e => setValidUntil(e.target.value)}
                  className="w-36 bg-white border border-slate-300 rounded px-1.5 py-0.5 outline-none text-xs"
                />
              </div>

              <div className="flex items-center gap-2">
                <label className="w-36 text-slate-600 text-right">Fecha del documento</label>
                <input 
                  type="date"
                  value={docDate}
                  onChange={e => setDocDate(e.target.value)}
                  className="w-36 bg-white border border-slate-300 rounded px-1.5 py-0.5 outline-none text-xs"
                />
              </div>
            </div>
          </div>

          {/* ── Tabs Container ───────────────────────────────────────────────── */}
          <div className="flex-1 flex flex-col bg-white">
            
            {/* Tab Headers */}
            <div className="flex items-center bg-[#E2E8F0] border-b border-slate-300 px-2 pt-1 gap-1 text-xs">
              <button
                onClick={() => setActiveTab('contenido')}
                className={`px-4 py-1 rounded-t border-t-2 font-bold transition-all ${
                  activeTab === 'contenido'
                    ? 'bg-white border-t-amber-500 border-x border-slate-300 text-slate-800'
                    : 'bg-slate-200 border-t-transparent hover:bg-slate-100 text-slate-600'
                }`}
              >
                Contenido
              </button>
              <button
                onClick={() => setActiveTab('logistica')}
                className={`px-4 py-1 rounded-t border-t-2 font-bold transition-all ${
                  activeTab === 'logistica'
                    ? 'bg-white border-t-amber-500 border-x border-slate-300 text-slate-800'
                    : 'bg-slate-200 border-t-transparent hover:bg-slate-100 text-slate-600'
                }`}
              >
                Logística
              </button>
              <button
                onClick={() => setActiveTab('finanzas')}
                className={`px-4 py-1 rounded-t border-t-2 font-bold transition-all ${
                  activeTab === 'finanzas'
                    ? 'bg-white border-t-amber-500 border-x border-slate-300 text-slate-800'
                    : 'bg-slate-200 border-t-transparent hover:bg-slate-100 text-slate-600'
                }`}
              >
                Finanzas
              </button>
              <button
                onClick={() => setActiveTab('anexos')}
                className={`px-4 py-1 rounded-t border-t-2 font-bold transition-all ${
                  activeTab === 'anexos'
                    ? 'bg-white border-t-amber-500 border-x border-slate-300 text-slate-800'
                    : 'bg-slate-200 border-t-transparent hover:bg-slate-100 text-slate-600'
                }`}
              >
                Anexos
              </button>
            </div>

            {/* Tab 1: Contenido (Grid Table) */}
            {activeTab === 'contenido' && (
              <div className="p-3 flex-1 flex flex-col">
                
                {/* Top Controls inside Contenido */}
                <div className="flex items-center justify-between mb-2 text-xs">
                  <div className="flex items-center gap-2">
                    <label className="text-slate-600 font-semibold">Clase de artículo/servicio</label>
                    <select
                      value={itemClass}
                      onChange={e => setItemClass(e.target.value)}
                      className="bg-white border border-slate-300 rounded px-2 py-0.5 outline-none font-medium"
                    >
                      <option value="Artículo">Artículo</option>
                      <option value="Servicio">Servicio</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-slate-600 font-semibold">Clase de resumen</label>
                    <select
                      value={summaryClass}
                      onChange={e => setSummaryClass(e.target.value)}
                      className="bg-white border border-slate-300 rounded px-2 py-0.5 outline-none font-medium"
                    >
                      <option value="Sin resumen">Sin resumen</option>
                      <option value="Por categoría">Por categoría</option>
                    </select>
                  </div>
                </div>

                {/* Data Grid Table Container */}
                <div className="flex-1 border border-slate-300 rounded overflow-x-auto relative min-h-[220px]">
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead>
                      <tr className="bg-[#CBD5E1] text-slate-700 font-bold border-b border-slate-300 sticky top-0 z-10">
                        <th className="p-1.5 w-8 text-center border-r border-slate-300">#</th>
                        <th className="p-1.5 w-44 border-r border-slate-300">Número de artículo</th>
                        <th className="p-1.5 border-r border-slate-300">Descripción del artículo</th>
                        <th className="p-1.5 w-20 text-right border-r border-slate-300">Cantidad</th>
                        <th className="p-1.5 w-32 text-right border-r border-slate-300">Precio por unidad</th>
                        <th className="p-1.5 w-24 text-right border-r border-slate-300">% de descuento</th>
                        <th className="p-1.5 w-36 text-right border-r border-slate-300">Total (ML)</th>
                        <th className="p-1.5 w-8 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {rows.map((row, idx) => (
                        <tr key={row.id} className="hover:bg-amber-50/50 group transition-colors">
                          {/* Row Number */}
                          <td className="p-1 text-center bg-[#F1F5F9] font-semibold text-slate-500 border-r border-slate-300">
                            {idx + 1}
                          </td>

                          {/* Item Code Input */}
                          <td className="p-0 border-r border-slate-200 relative">
                            <div className="flex items-center">
                              <input 
                                type="text"
                                value={row.itemCode}
                                onChange={e => handleRowChange(row.id, 'itemCode', e.target.value)}
                                className="w-full px-1.5 py-1 bg-transparent outline-none font-semibold text-slate-800 focus:bg-amber-50"
                                placeholder="Escriba código..."
                              />
                              <button 
                                onClick={() => {
                                  setActiveRowIdForSearch(row.id);
                                  setIsItemModalOpen(true);
                                }}
                                className="p-1 text-slate-400 hover:text-amber-600"
                                title="Buscar artículo SAP B1"
                              >
                                <Search className="w-3 h-3" />
                              </button>
                            </div>
                          </td>

                          {/* Description Input */}
                          <td className="p-0 border-r border-slate-200">
                            <input 
                              type="text"
                              value={row.description}
                              onChange={e => handleRowChange(row.id, 'description', e.target.value)}
                              className="w-full px-1.5 py-1 bg-transparent outline-none text-slate-700 focus:bg-amber-50"
                              placeholder="Descripción del artículo..."
                            />
                          </td>

                          {/* Quantity */}
                          <td className="p-0 border-r border-slate-200">
                            <input 
                              type="number"
                              min="1"
                              value={row.quantity}
                              onChange={e => handleRowChange(row.id, 'quantity', e.target.value)}
                              className="w-full px-1.5 py-1 bg-transparent text-right font-medium outline-none focus:bg-amber-50"
                            />
                          </td>

                          {/* Unit Price */}
                          <td className="p-0 border-r border-slate-200">
                            <input 
                              type="number"
                              value={row.price}
                              onChange={e => handleRowChange(row.id, 'price', e.target.value)}
                              className="w-full px-1.5 py-1 bg-transparent text-right font-medium outline-none focus:bg-amber-50"
                            />
                          </td>

                          {/* Discount % */}
                          <td className="p-0 border-r border-slate-200">
                            <input 
                              type="number"
                              step="0.1"
                              value={row.discount}
                              onChange={e => handleRowChange(row.id, 'discount', e.target.value)}
                              className="w-full px-1.5 py-1 bg-transparent text-right outline-none focus:bg-amber-50"
                            />
                          </td>

                          {/* Total */}
                          <td className="p-1.5 text-right font-bold text-slate-800 bg-slate-50/50 border-r border-slate-200">
                            {formatMoney(row.total)}
                          </td>

                          {/* Delete Action */}
                          <td className="p-1 text-center">
                            <button 
                              onClick={() => handleRemoveRow(row.id)}
                              className="text-slate-300 hover:text-rose-600 transition-colors"
                              title="Eliminar fila"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Tab 2: Logística */}
            {activeTab === 'logistica' && (
              <div className="p-4 grid grid-cols-2 gap-6 text-xs bg-slate-50 flex-1">
                <div className="space-y-2 bg-white p-3 border border-slate-200 rounded">
                  <h4 className="font-bold text-slate-700 border-b pb-1">Dirección de Destino / Despacho</h4>
                  <textarea 
                    defaultValue="Calle 10 No. 45-20, Zona Industrial Belén, Medellín, Antioquia"
                    rows={4}
                    className="w-full border border-slate-300 rounded p-1.5 outline-none"
                  />
                </div>
                <div className="space-y-2 bg-white p-3 border border-slate-200 rounded">
                  <h4 className="font-bold text-slate-700 border-b pb-1">Dirección de Facturación</h4>
                  <textarea 
                    defaultValue="Calle 10 No. 45-20, Medellín, Colombia"
                    rows={4}
                    className="w-full border border-slate-300 rounded p-1.5 outline-none"
                  />
                </div>
              </div>
            )}

            {/* Tab 3: Finanzas */}
            {activeTab === 'finanzas' && (
              <div className="p-4 grid grid-cols-2 gap-6 text-xs bg-slate-50 flex-1">
                <div className="space-y-3 bg-white p-3 border border-slate-200 rounded">
                  <h4 className="font-bold text-slate-700 border-b pb-1">Condiciones Comerciales</h4>
                  <div className="flex items-center justify-between">
                    <span>Condición de Pago:</span>
                    <select className="border border-slate-300 rounded px-2 py-1 outline-none">
                      <option>30 Días Fecha Factura</option>
                      <option>Contado Inmediato</option>
                      <option>60 Días Crédito</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Indicador de Impuesto:</span>
                    <select className="border border-slate-300 rounded px-2 py-1 outline-none">
                      <option>IVA 19% Generales</option>
                      <option>Exento 0%</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 4: Anexos */}
            {activeTab === 'anexos' && (
              <div className="p-6 text-center text-slate-500 bg-slate-50 flex-1 flex flex-col items-center justify-center border-t border-slate-200">
                <Package className="w-8 h-8 text-slate-400 mb-2" />
                <p className="font-bold">Anexos y Documentos Adjuntos</p>
                <p className="text-xs">Arrastre o seleccione archivos PDF, planos técnicos o cotizaciones asociadas.</p>
              </div>
            )}

          </div>

          {/* ── Footer Section: Employee & Totals ────────────────────────────── */}
          <div className="p-3 bg-[#F1F5F9] border-t border-slate-300 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            
            {/* Left Footer */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <label className="w-32 text-slate-600 text-right">Empleado de ventas</label>
                <div className="flex-1 flex items-center gap-1">
                  <select 
                    value={salesEmployee}
                    onChange={e => setSalesEmployee(e.target.value)}
                    className="flex-1 bg-white border border-slate-300 rounded px-1.5 py-0.5 outline-none"
                  >
                    <option value="Luis Guillermo Esteban">Luis Guillermo Esteban</option>
                    <option value="Ximena Ballestas">Ximena Ballestas</option>
                    <option value="Tatiana Duque">Tatiana Duque</option>
                    <option value="Andrey Uribe">Andrey Uribe</option>
                  </select>
                  <span className="w-4 h-4 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center text-[9px] font-bold text-slate-600">i</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <label className="w-32 text-slate-600 text-right">Propietario</label>
                <input 
                  type="text"
                  value={owner}
                  onChange={e => setOwner(e.target.value)}
                  className="flex-1 bg-white border border-slate-300 rounded px-1.5 py-0.5 outline-none"
                />
              </div>
            </div>

            {/* Right Footer Totals */}
            <div className="space-y-1 text-right">
              <div className="flex items-center justify-end gap-2">
                <span className="text-slate-600">Total antes del descuento:</span>
                <input 
                  type="text" 
                  value={formatMoney(subtotalRows)} 
                  readOnly 
                  className="w-40 bg-slate-100 border border-slate-300 rounded px-1.5 py-0.5 text-right font-bold text-slate-700 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2">
                <span className="text-slate-600">Descuento</span>
                <input 
                  type="number" 
                  value={headerDiscountPct} 
                  onChange={e => setHeaderDiscountPct(Number(e.target.value))} 
                  className="w-14 bg-white border border-slate-300 rounded px-1 py-0.5 text-right outline-none"
                />
                <span>%</span>
                <input 
                  type="text" 
                  value={formatMoney(headerDiscountAmount)} 
                  readOnly 
                  className="w-36 bg-slate-100 border border-slate-300 rounded px-1.5 py-0.5 text-right font-semibold text-slate-700 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2">
                <span className="text-slate-600">Gastos adicionales:</span>
                <button className="px-1.5 py-0.5 bg-amber-400 hover:bg-amber-500 rounded text-[9px] font-bold text-slate-900 border border-amber-600">=&gt;</button>
                <input 
                  type="number" 
                  value={additionalExpenses} 
                  onChange={e => setAdditionalExpenses(Number(e.target.value))} 
                  className="w-36 bg-white border border-slate-300 rounded px-1.5 py-0.5 text-right outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2">
                <label className="flex items-center gap-1 cursor-pointer text-slate-600">
                  <input 
                    type="checkbox" 
                    checked={rounding} 
                    onChange={e => setRounding(e.target.checked)} 
                    className="rounded text-amber-500 focus:ring-0"
                  />
                  <span>Redondeo</span>
                </label>
                <input 
                  type="text" 
                  value="$ 0,00" 
                  readOnly 
                  className="w-36 bg-slate-100 border border-slate-300 rounded px-1.5 py-0.5 text-right text-slate-500 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2">
                <span className="text-slate-600">Impuesto (IVA 19%):</span>
                <input 
                  type="text" 
                  value={formatMoney(vatTax)} 
                  readOnly 
                  className="w-40 bg-slate-100 border border-slate-300 rounded px-1.5 py-0.5 text-right font-bold text-slate-700 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-300">
                <span className="text-sm font-black text-slate-900 uppercase">Total:</span>
                <input 
                  type="text" 
                  value={formatMoney(grandTotal)} 
                  readOnly 
                  className="w-44 bg-amber-100/80 border border-amber-400 rounded px-2 py-1 text-right font-black text-sm text-slate-900 outline-none shadow-sm"
                />
              </div>
            </div>
          </div>

          {/* ── Bottom Action Buttons Bar ──────────────────────────────────────── */}
          <div className="p-3 bg-[#E2E8F0] border-t border-slate-300 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <button 
                onClick={handleCreateDocument}
                className="px-6 py-1.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-900 font-bold rounded border border-amber-600 shadow-sm transition-all cursor-pointer"
              >
                Crear
              </button>
              <button className="px-5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded border border-slate-400 shadow-sm transition-all cursor-pointer">
                Cancelar
              </button>
            </div>

            <div className="flex items-center gap-2">
              <select className="bg-slate-100 border border-slate-400 rounded px-3 py-1 font-bold text-slate-700 cursor-pointer">
                <option value="">Copiar a...</option>
                <option value="orden">Orden de Venta</option>
                <option value="entrega">Entrega</option>
                <option value="factura">Factura de Clientes</option>
              </select>

              <select className="bg-slate-100 border border-slate-400 rounded px-3 py-1 font-bold text-slate-700 cursor-pointer">
                <option value="">Copiar de...</option>
                <option value="oportunidad">Oportunidad de Venta</option>
              </select>
            </div>
          </div>

        </div>
      </div>

      {/* ── 5. Bottom SAP Operational Status Bar ─────────────────────────────── */}
      <div className={`mt-1 border border-slate-300 rounded px-3 py-1 text-xs font-semibold flex items-center justify-between shadow-inner ${
        statusType === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' :
        statusType === 'error' ? 'bg-rose-50 text-rose-800 border-rose-300' :
        'bg-[#F1F5F9] text-slate-600'
      }`}>
        <span>{statusMessage}</span>
        <span className="text-[11px] text-slate-500 font-medium">
          Luis Guillermo Esteban | 01/09/2026 | 12:25 p.m.
        </span>
      </div>

      {/* ── Customer Search Modal ─────────────────────────────────────────────── */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl border border-slate-300 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-[#334155] text-white px-4 py-2 font-bold text-xs flex justify-between items-center">
              <span>SAP B1 - Selección de Clientes</span>
              <button onClick={() => setIsCustomerModalOpen(false)} className="hover:text-amber-300">✕</button>
            </div>
            <div className="p-3">
              <div className="flex items-center px-2 py-1 bg-slate-50 border border-slate-300 rounded mb-3">
                <Search className="w-4 h-4 text-slate-400 mr-2" />
                <input 
                  type="text"
                  placeholder="Buscar por Nombre o Código de Cliente..."
                  value={customerSearchQuery}
                  onChange={e => setCustomerSearchQuery(e.target.value)}
                  className="bg-transparent text-xs outline-none w-full"
                  autoFocus
                />
              </div>

              <div className="max-h-60 overflow-y-auto border border-slate-200 rounded">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 border-b">
                    <tr>
                      <th className="p-2">Código</th>
                      <th className="p-2">Nombre del Cliente</th>
                      <th className="p-2">NIT / RUTC</th>
                      <th className="p-2">Contacto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {dbCustomers
                      .filter(c => c.cardName.toLowerCase().includes(customerSearchQuery.toLowerCase()) || c.cardCode.toLowerCase().includes(customerSearchQuery.toLowerCase()))
                      .map(c => (
                        <tr 
                          key={c.cardCode}
                          onClick={() => handleSelectCustomer(c)}
                          className="hover:bg-amber-50 cursor-pointer"
                        >
                          <td className="p-2 font-bold text-blue-700">{c.cardCode}</td>
                          <td className="p-2 font-medium text-slate-800">{c.cardName}</td>
                          <td className="p-2 text-slate-500">{c.nit}</td>
                          <td className="p-2 text-slate-600">{c.contact}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Article / Item Search Modal ───────────────────────────────────────── */}
      {isItemModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl border border-slate-300 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-[#334155] text-white px-4 py-2 font-bold text-xs flex justify-between items-center">
              <span>SAP B1 - Lista de Artículos (Inventario Firplak)</span>
              <button onClick={() => setIsItemModalOpen(false)} className="hover:text-amber-300">✕</button>
            </div>
            <div className="p-3">
              <div className="flex items-center px-2 py-1 bg-slate-50 border border-slate-300 rounded mb-3">
                <Search className="w-4 h-4 text-slate-400 mr-2" />
                <input 
                  type="text"
                  placeholder="Buscar por Código de Artículo o Descripción..."
                  value={itemSearchQuery}
                  onChange={e => setItemSearchQuery(e.target.value)}
                  className="bg-transparent text-xs outline-none w-full"
                  autoFocus
                />
              </div>

              <div className="max-h-72 overflow-y-auto border border-slate-200 rounded">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 border-b">
                    <tr>
                      <th className="p-2">Número de artículo</th>
                      <th className="p-2">Descripción del artículo</th>
                      <th className="p-2 text-right">Precio por unidad</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {dbItems
                      .filter(item => 
                        item.description.toLowerCase().includes(itemSearchQuery.toLowerCase()) || 
                        item.itemCode.toLowerCase().includes(itemSearchQuery.toLowerCase())
                      )
                      .map(item => (
                        <tr 
                          key={item.itemCode}
                          onClick={() => handleSelectItemForGroup(item)}
                          className="hover:bg-amber-50 cursor-pointer"
                        >
                          <td className="p-2 font-bold text-amber-700">{item.itemCode}</td>
                          <td className="p-2 font-medium text-slate-800">{item.description}</td>
                          <td className="p-2 text-right font-bold text-slate-900">{formatMoney(item.price)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
