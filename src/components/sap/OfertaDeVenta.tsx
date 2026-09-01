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
  barCode?: string;
  quantity: number;
  unitMsr?: string;
  price: number;
  discount: number;
  taxCode?: string;
  total: number;
  whsCode?: string;
  costingCode?: string;
  salesEmployee?: string;
  lineStatus?: string;
}

export default function OfertaDeVenta() {
  // ── Form State (Initially EMPTY for Consultation) ─────────────────────────────
  // Header Left
  const [cardCode, setCardCode] = useState('');
  const [cardName, setCardName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [refNumber, setRefNumber] = useState('');
  const [currency, setCurrency] = useState('COP');

  // Header Right
  const [docSeries, setDocSeries] = useState('Cot-Nal');
  const [docNum, setDocNum] = useState('');
  const [docStatus, setDocStatus] = useState('');
  const [postingDate, setPostingDate] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [docDate, setDocDate] = useState('');

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
  const [tipoPedido, setTipoPedido] = useState('Normal');
  const [valorAnticipo, setValorAnticipo] = useState('0.00');

  // Tabs
  const [activeTab, setActiveTab] = useState<'contenido' | 'logistica' | 'finanzas' | 'anexos'>('contenido');
  const [itemClass, setItemClass] = useState('Artículo');
  const [summaryClass, setSummaryClass] = useState('Sin resumen');

  // Table Grid Rows (Empty row initially)
  const [rows, setRows] = useState<GridRow[]>([
    {
      id: '1',
      itemCode: '',
      description: '',
      quantity: 1,
      price: 0,
      discount: 0,
      total: 0
    }
  ]);

  // Footer & Logistics Fields
  const [salesEmployee, setSalesEmployee] = useState('');
  const [owner, setOwner] = useState('');
  const [comments, setComments] = useState('');
  const [openingRemarks, setOpeningRemarks] = useState('');
  const [closingRemarks, setClosingRemarks] = useState('');
  const [shipToAddressText, setShipToAddressText] = useState('');
  const [payToAddressText, setPayToAddressText] = useState('');
  const [headerDiscountPct, setHeaderDiscountPct] = useState(0);
  const [additionalExpenses, setAdditionalExpenses] = useState(0);
  const [rounding, setRounding] = useState(false);

  // Context Menu & SAP Modals State
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [isComentariosModalOpen, setIsComentariosModalOpen] = useState(false);
  const [isMapaRelacionesModalOpen, setIsMapaRelacionesModalOpen] = useState(false);

  // Modals & Search State
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  
  const [activeRowIdForSearch, setActiveRowIdForSearch] = useState<string | null>(null);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [itemSearchQuery, setItemSearchQuery] = useState('');

  const [dbItems, setDbItems] = useState<any[]>(SAMPLE_SAP_ITEMS);
  const [dbCustomers, setDbCustomers] = useState<any[]>(SAMPLE_CUSTOMERS);

  // Status message
  const [statusMessage, setStatusMessage] = useState('● Ingrese un número de Orden de Venta u Oferta en el campo lateral y presione Consultar.');
  const [statusType, setStatusType] = useState<'info' | 'success' | 'error'>('info');

  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  // Load live SAP Business Partners & Items background cache
  const [costCentersList, setCostCentersList] = useState<Array<{ code: string; name: string }>>([]);

  useEffect(() => {
    const loadSapData = async () => {
      try {
        const custRes = await fetch('/api/sap/customers');
        const custData = await custRes.json();
        if (custData.success && custData.customers?.length > 0) {
          setDbCustomers(custData.customers.map((bp: any) => ({
            cardCode: bp.CardCode,
            cardName: bp.CardName,
            nit: bp.FederalTaxID || 'N/A',
            contact: bp.ContactPerson || 'Sin contacto'
          })));
        }

        const itemRes = await fetch('/api/sap/items');
        const itemData = await itemRes.json();
        if (itemData.success && itemData.items?.length > 0) {
          setDbItems(itemData.items.map((it: any) => ({
            itemCode: it.ItemCode,
            description: it.ItemName || 'Artículo SAP',
            price: it.ItemPrices?.[0]?.Price || 0
          })));
        }

        const ccRes = await fetch('/api/sap/cost-centers');
        const ccData = await ccRes.json();
        if (ccData.success && ccData.costCenters?.length > 0) {
          setCostCentersList(ccData.costCenters.map((cc: any) => ({
            code: cc.code,
            name: cc.name
          })));
        }
      } catch (err) {
        console.error('Error background pre-fetching SAP data:', err);
      }
    };
    loadSapData();
  }, []);

  // ── Search Real SAP Document by Orden de Venta / DocNum ──────────────────────
  const handleSearchSapDocument = async (queryNum?: string) => {
    const searchTarget = queryNum || ordenVenta || docNum;
    if (!searchTarget || searchTarget.trim().length === 0) {
      setStatusMessage('✖ Ingrese un número de Orden de Venta o Documento para consultar en SAP B1.');
      setStatusType('error');
      return;
    }

    try {
      setStatusMessage(`● Consultando documento Nº ${searchTarget} en SAP Business One Service Layer...`);
      setStatusType('info');

      const res = await fetch(`/api/sap/quotations?docNum=${encodeURIComponent(searchTarget.trim())}`);
      const data = await res.json();

      if (!res.ok || !data.success || !data.document) {
        setStatusMessage(`✖ No se encontró la Oferta u Orden de Venta Nº ${searchTarget} en SAP Business One.`);
        setStatusType('error');
        return;
      }

      const sapDoc = data.document.data;
      console.log('SAP Document fetched:', sapDoc);

      // Populate Header
      setCardCode(sapDoc.CardCode || '');
      setCardName(sapDoc.CardName || '');
      setContactPerson(sapDoc._ContactPersonName || sapDoc.ContactPerson || '');
      setRefNumber(sapDoc.NumAtCard || '');
      setCurrency(sapDoc.DocCurrency === '$' ? 'COP' : sapDoc.DocCurrency || 'COP');
      setDocNum(String(sapDoc.DocNum || searchTarget));
      setDocStatus(sapDoc.DocStatus === 'bost_Open' || sapDoc.DocStatus === 'O' ? 'Abiertos' : 'Cerrado');

      setPostingDate(sapDoc.DocDate ? sapDoc.DocDate.split('T')[0] : '');
      setValidUntil(sapDoc.DocDueDate ? sapDoc.DocDueDate.split('T')[0] : '');
      setDocDate(sapDoc.TaxDate ? sapDoc.TaxDate.split('T')[0] : '');

      // Populate User Fields
      const segVal = String(sapDoc.U_Segmentacion || sapDoc.U_Segmento_Pedido || sapDoc.U_Segmento || '').trim();
      setSegmentoPedido(segVal === '01' || segVal === '1' ? 'Nacional' : (segVal || 'N/A'));

      setOrdenVenta(String(sapDoc.U_OrdendeVenta || sapDoc.DocNum || searchTarget));
      
      const antRaw = String(sapDoc.U_Anticipo || '').trim();
      setAnticipoPct(antRaw === '02' || antRaw === '2' || antRaw === 'SI tiene anticipo' ? 'SI tiene anticipo' : (antRaw === '01' || antRaw === '1' ? 'NO tiene anticipo' : (antRaw || 'SI tiene anticipo')));
      
      setAmortizacionFacturaPct(String(sapDoc.U_PorcAmortizacionFa || '100.00'));
      setAplicacionAnticipo(sapDoc.U_AplicacionAnticipo === '02' || sapDoc.U_AplicacionAnticipo === '2' ? 'NO' : (sapDoc.U_AplicacionAnticipo || 'NO'));
      setPctContenedor(String(sapDoc.U_Porc_contenedor || '0.00'));
      setBloqueadoDespacho(sapDoc.U_Bloqueado === '01' || sapDoc.U_Bloqueado === '1' ? 'No Bloqueado' : (sapDoc.U_Bloqueado || 'No Bloqueado'));

      const estRaw = String(sapDoc.U_Estado_Oferta_Venta || sapDoc.U_Estado_Oferta || '').trim();
      setEstadoOfertaVenta(estRaw === '02' || estRaw === '2' || estRaw === 'Confirmada' ? 'Confirmada' : (estRaw === '01' || estRaw === '1' ? 'Pendiente' : (estRaw || 'Confirmada')));

      const TIPO_PEDIDO_MAP: Record<string, string> = {
        '1': 'Normal',
        '01': 'Normal',
        '2': 'Llenado Stock',
        '02': 'Llenado Stock',
        '3': 'Exportacion',
        '03': 'Exportacion',
        '4': 'Muestras y exhibiciones',
        '04': 'Muestras y exhibiciones',
        '5': 'Servicios',
        '05': 'Servicios',
        '6': 'Reposicion Producto',
        '06': 'Reposicion Producto',
        '7': 'Atención',
        '07': 'Atención',
        '8': 'Muestra Facturable',
        '08': 'Muestra Facturable',
        '9': 'FulFilment',
        '09': 'FulFilment',
        '10': 'Llenado Eventos',
        '11': 'Llenado Ferias',
        '12': 'Reposicion Repuesto',
        '13': 'Firplak.com',
        '14': 'Cliente Final',
        '15': 'Reabastecimiento Firplak Home',
      };
      const tipoRaw = String(sapDoc.U_TipoPedido || sapDoc.U_Tipo_Pedido || '').trim();
      setTipoPedido(TIPO_PEDIDO_MAP[tipoRaw] || tipoRaw || 'Normal');

      setValorAnticipo(String(sapDoc.U_VlorAnticipo || '0.00'));

      // Set Footer Empleado de Ventas, Propietario & Comentarios
      setSalesEmployee(sapDoc._SalesEmployeeName || 'Firplak');
      setOwner(sapDoc._OwnerName || (sapDoc.DocumentsOwner ? String(sapDoc.DocumentsOwner) : ''));
      setComments(sapDoc.Comments || '');
      setOpeningRemarks(sapDoc.OpeningRemarks || sapDoc.Comments || '');
      setClosingRemarks(sapDoc.ClosingRemarks || sapDoc.Comments || '');

      // Construct Logistics Addresses (Destino & Facturación)
      const shipName = sapDoc.ShipToCode || sapDoc.CardName || '';
      let shipAddrStr = '';
      if (sapDoc.Address) {
        shipAddrStr = sapDoc.Address;
      } else if (sapDoc.AddressExtension) {
        const parts = [
          sapDoc.AddressExtension.ShipToStreet,
          `${sapDoc.AddressExtension.ShipToZipCode || '000000'} ${sapDoc.AddressExtension.ShipToCity || ''}`.trim(),
          sapDoc.AddressExtension.ShipToCountry === 'CO' ? 'COLOMBIA' : (sapDoc.AddressExtension.ShipToCountry || '')
        ].filter(Boolean);
        shipAddrStr = parts.join('\n');
      }
      const fullShip = shipAddrStr ? (shipAddrStr.includes(shipName) ? shipAddrStr : `${shipName}\n${shipAddrStr}`) : shipName;
      setShipToAddressText(fullShip);

      const payName = sapDoc.PayToCode || sapDoc.CardName || '';
      let payAddrStr = '';
      if (sapDoc.Address2) {
        payAddrStr = sapDoc.Address2;
      } else if (sapDoc.AddressExtension) {
        const parts = [
          sapDoc.AddressExtension.BillToStreet,
          `${sapDoc.AddressExtension.BillToZipCode || '000000'} ${sapDoc.AddressExtension.BillToCity || ''}`.trim(),
          sapDoc.AddressExtension.BillToCountry === 'CO' ? 'COLOMBIA' : (sapDoc.AddressExtension.BillToCountry || '')
        ].filter(Boolean);
        payAddrStr = parts.join('\n');
      }
      const fullPay = payAddrStr ? (payAddrStr.includes(payName) ? payAddrStr : `${payName}\n${payAddrStr}`) : payName;
      setPayToAddressText(fullPay);

      // Populate Document Lines
      if (sapDoc.DocumentLines && sapDoc.DocumentLines.length > 0) {
        const mappedLines: GridRow[] = sapDoc.DocumentLines.map((line: any, idx: number) => ({
          id: String(idx + 1),
          itemCode: line.ItemCode || '',
          description: line.ItemDescription || line.ItemName || '',
          barCode: line.BarCode || 'N/A',
          quantity: line.Quantity || 1,
          unitMsr: line.MeasureUnit || line.SalUnitMsr || 'UND',
          price: line.UnitPrice || 0,
          discount: line.DiscountPercent || 0,
          taxCode: line.TaxCode || 'IVA 19%',
          total: line.LineTotal || (line.Quantity * line.UnitPrice),
          whsCode: line.WarehouseCode || 'PT-01',
          costingCode: line.CostingCode || line.CostingCode2 || line.CostingCode3 || '',
          salesEmployee: sapDoc._SalesEmployeeName || 'Firplak',
          lineStatus: line.LineStatus === 'bost_Open' || line.LineStatus === 'O' ? 'Abierto' : 'Cerrado'
        }));

        // Add 1 empty row at the end
        mappedLines.push({
          id: String(mappedLines.length + 1),
          itemCode: '',
          description: '',
          barCode: '',
          quantity: 1,
          unitMsr: 'UND',
          price: 0,
          discount: 0,
          taxCode: 'IVA 19%',
          total: 0,
          whsCode: 'PT-01',
          costingCode: '',
          salesEmployee: sapDoc._SalesEmployeeName || 'Firplak',
          lineStatus: 'Abierto'
        });

        setRows(mappedLines);
      } else {
        setRows([{ id: '1', itemCode: '', description: '', barCode: '', quantity: 1, unitMsr: 'UND', price: 0, discount: 0, taxCode: 'IVA 19%', total: 0, whsCode: 'PT-01', costingCode: '', salesEmployee: sapDoc._SalesEmployeeName || 'Firplak', lineStatus: 'Abierto' }]);
      }

      setHeaderDiscountPct(sapDoc.DiscountPercent || 0);

      setStatusMessage(`✔ Información de ${data.document.documentType === 'Order' ? 'Orden' : 'Oferta'} de Venta Nº ${sapDoc.DocNum} cargada exitosamente desde SAP B1.`);
      setStatusType('success');
    } catch (err: any) {
      console.error('Error fetching SAP doc:', err);
      setStatusMessage(`✖ Error consultando documento en SAP: ${err.message}`);
      setStatusType('error');
    }
  };

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
              <label className="text-slate-600 block mb-0.5 font-bold">Orden de Venta / Cotización</label>
              <div className="flex items-center gap-1">
                <input 
                  type="text"
                  placeholder="Ej: 2000001"
                  value={ordenVenta}
                  onChange={e => setOrdenVenta(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSearchSapDocument(); }}
                  className="w-full bg-[#FFFDE7] border border-amber-400 font-bold rounded px-1.5 py-0.5 outline-none focus:ring-1 focus:ring-amber-500 text-slate-900"
                />
                <button 
                  onClick={() => handleSearchSapDocument()}
                  className="px-2 py-0.5 bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold rounded text-[10px] shrink-0 border border-amber-600 cursor-pointer shadow-xs"
                  title="Consultar Orden u Oferta en SAP B1"
                >
                  🔍 Buscar
                </button>
              </div>
            </div>

            <div>
              <label className="text-slate-600 block mb-0.5">Anticipo</label>
              <select 
                value={anticipoPct}
                onChange={e => setAnticipoPct(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded px-1.5 py-0.5 outline-none focus:border-blue-600 text-xs"
              >
                <option value="SI tiene anticipo">SI tiene anticipo</option>
                <option value="NO tiene anticipo">NO tiene anticipo</option>
                <option value="0.00">0.00</option>
                {anticipoPct && !['SI tiene anticipo', 'NO tiene anticipo', '0.00'].includes(anticipoPct) && (
                  <option value={anticipoPct}>{anticipoPct}</option>
                )}
              </select>
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
                className="w-full bg-white border border-slate-300 rounded px-1.5 py-0.5 outline-none focus:border-blue-600 text-xs"
              >
                <option value="Confirmada">Confirmada</option>
                <option value="Pendiente">Pendiente</option>
                <option value="Aprobado">Aprobado</option>
                <option value="Rechazado">Rechazado</option>
                <option value="Anulada">Anulada</option>
                {estadoOfertaVenta && !['Confirmada', 'Pendiente', 'Aprobado', 'Rechazado', 'Anulada'].includes(estadoOfertaVenta) && (
                  <option value={estadoOfertaVenta}>{estadoOfertaVenta}</option>
                )}
              </select>
            </div>

            <div>
              <label className="text-slate-600 block mb-0.5">Tipo de pedido</label>
              <select 
                value={tipoPedido}
                onChange={e => setTipoPedido(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded px-1.5 py-0.5 outline-none focus:border-blue-600 text-xs"
              >
                <option value="Normal">Normal</option>
                <option value="Llenado Eventos">Llenado Eventos</option>
                <option value="Llenado Ferias">Llenado Ferias</option>
                <option value="Reposicion Repuesto">Reposicion Repuesto</option>
                <option value="Firplak.com">Firplak.com</option>
                <option value="Cliente Final">Cliente Final</option>
                <option value="Reabastecimiento Firplak Home">Reabastecimiento Firplak Home</option>
                <option value="Llenado Stock">Llenado Stock</option>
                <option value="Exportacion">Exportacion</option>
                <option value="Muestras y exhibiciones">Muestras y exhibiciones</option>
                <option value="Servicios">Servicios</option>
                <option value="Reposicion Producto">Reposicion Producto</option>
                <option value="Atención">Atención</option>
                <option value="Muestra Facturable">Muestra Facturable</option>
                <option value="FulFilment">FulFilment</option>
                {tipoPedido && !['Normal', 'Llenado Eventos', 'Llenado Ferias', 'Reposicion Repuesto', 'Firplak.com', 'Cliente Final', 'Reabastecimiento Firplak Home', 'Llenado Stock', 'Exportacion', 'Muestras y exhibiciones', 'Servicios', 'Reposicion Producto', 'Atención', 'Muestra Facturable', 'FulFilment'].includes(tipoPedido) && (
                  <option value={tipoPedido}>{tipoPedido}</option>
                )}
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
        <div 
          className="flex-1 bg-[#F8FAFC] border border-slate-300 rounded-md shadow-sm flex flex-col overflow-hidden text-[11px] relative"
          onContextMenu={(e) => {
            e.preventDefault();
            setContextMenu({ x: e.clientX, y: e.clientY });
          }}
        >
          
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
                  <input 
                    type="text"
                    value={contactPerson}
                    onChange={e => setContactPerson(e.target.value)}
                    className="flex-1 bg-white border border-slate-300 rounded px-1.5 py-0.5 outline-none focus:border-blue-600 font-medium text-slate-800 text-xs"
                  />
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
                    placeholder="DocNum..."
                    value={docNum}
                    onChange={e => setDocNum(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleSearchSapDocument(); }}
                    className="w-28 bg-[#FFFDE7] border border-amber-300 rounded px-1.5 py-0.5 outline-none text-right font-bold text-slate-800 focus:ring-1 focus:ring-amber-500"
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

                {/* Data Grid Table Container (Wide Horizontal Scrollbar) */}
                <div className="flex-1 border border-slate-300 rounded overflow-x-auto relative min-h-[280px] shadow-inner bg-slate-50">
                  <table className="min-w-[1750px] w-full text-left border-collapse text-[11px]">
                    <thead>
                      <tr className="bg-[#CBD5E1] text-slate-700 font-bold border-b border-slate-300 sticky top-0 z-10">
                        <th className="p-1.5 w-8 text-center border-r border-slate-300">#</th>
                        <th className="p-1.5 w-48 border-r border-slate-300">Número de artículo</th>
                        <th className="p-1.5 min-w-[320px] border-r border-slate-300">Descripción del artículo</th>
                        <th className="p-1.5 w-36 border-r border-slate-300">Código de barra</th>
                        <th className="p-1.5 w-20 text-right border-r border-slate-300">Cantidad</th>
                        <th className="p-1.5 w-24 text-center border-r border-slate-300">Unidad de medida</th>
                        <th className="p-1.5 w-32 text-right border-r border-slate-300">Precio por unidad</th>
                        <th className="p-1.5 w-24 text-right border-r border-slate-300">% de descuento</th>
                        <th className="p-1.5 w-28 text-center border-r border-slate-300">Indicador de impuesto</th>
                        <th className="p-1.5 w-36 text-right border-r border-slate-300">Total (ML)</th>
                        <th className="p-1.5 w-24 text-center border-r border-slate-300">Almacén</th>
                        <th className="p-1.5 w-36 text-center border-r border-slate-300">Centro de Costo</th>
                        <th className="p-1.5 w-44 text-center border-r border-slate-300">Empleado de ventas</th>
                        <th className="p-1.5 w-24 text-center border-r border-slate-300">Estado de Línea</th>
                        <th className="p-1.5 w-8 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
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
                                className="p-1 text-slate-400 hover:text-amber-600 cursor-pointer"
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

                          {/* BarCode */}
                          <td className="p-0 border-r border-slate-200">
                            <input 
                              type="text"
                              value={row.barCode || ''}
                              onChange={e => handleRowChange(row.id, 'barCode', e.target.value)}
                              className="w-full px-1.5 py-1 bg-transparent outline-none text-slate-500 text-center"
                              placeholder="Código de barra"
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

                          {/* Unit Measure */}
                          <td className="p-0 border-r border-slate-200">
                            <input 
                              type="text"
                              value={row.unitMsr || 'UND'}
                              onChange={e => handleRowChange(row.id, 'unitMsr', e.target.value)}
                              className="w-full px-1.5 py-1 bg-transparent text-center outline-none text-slate-600"
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

                          {/* Tax Code */}
                          <td className="p-0 border-r border-slate-200">
                            <input 
                              type="text"
                              value={row.taxCode || 'IVA 19%'}
                              onChange={e => handleRowChange(row.id, 'taxCode', e.target.value)}
                              className="w-full px-1.5 py-1 bg-transparent text-center outline-none text-slate-600"
                            />
                          </td>

                          {/* Total */}
                          <td className="p-1.5 text-right font-bold text-slate-800 bg-slate-50/50 border-r border-slate-200">
                            {formatMoney(row.total)}
                          </td>

                          {/* Warehouse Code */}
                          <td className="p-0 border-r border-slate-200">
                            <input 
                              type="text"
                              value={row.whsCode || 'PT-01'}
                              onChange={e => handleRowChange(row.id, 'whsCode', e.target.value)}
                              className="w-full px-1.5 py-1 bg-transparent text-center outline-none text-slate-700 font-semibold"
                            />
                          </td>

                          {/* Costing Code (Centro de costos - Real SAP DistributionRules) */}
                          <td className="p-0 border-r border-slate-200">
                            <select 
                              value={row.costingCode || ''}
                              onChange={e => handleRowChange(row.id, 'costingCode', e.target.value)}
                              className="w-full px-1 py-1 bg-transparent text-center outline-none text-slate-700 font-semibold text-[10px]"
                            >
                              <option value="">-- Sin asignar --</option>
                              {costCentersList.map((cc) => (
                                <option key={cc.code} value={cc.code}>
                                  {cc.code} - {cc.name}
                                </option>
                              ))}
                            </select>
                          </td>

                          {/* Empleado de ventas (Sales Employee) */}
                          <td className="p-0 border-r border-slate-200">
                            <input 
                              type="text"
                              value={row.salesEmployee || salesEmployee || 'Firplak'}
                              onChange={e => handleRowChange(row.id, 'salesEmployee', e.target.value)}
                              className="w-full px-1.5 py-1 bg-transparent text-center outline-none text-slate-700 font-medium"
                              placeholder="Empleado ventas"
                            />
                          </td>

                          {/* Line Status */}
                          <td className="p-1.5 text-center font-semibold text-slate-600 border-r border-slate-200">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                              row.lineStatus === 'Abierto' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {row.lineStatus || 'Abierto'}
                            </span>
                          </td>

                          {/* Delete Action */}
                          <td className="p-1 text-center">
                            <button 
                              onClick={() => handleRemoveRow(row.id)}
                              className="text-slate-300 hover:text-rose-600 transition-colors cursor-pointer"
                              title="Eliminar fila"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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
                <div className="space-y-2 bg-white p-3 border border-slate-200 rounded shadow-sm">
                  <h4 className="font-bold text-slate-700 border-b pb-1">Dirección de Destino / Despacho</h4>
                  <textarea 
                    value={shipToAddressText}
                    onChange={(e) => setShipToAddressText(e.target.value)}
                    rows={5}
                    placeholder="Dirección de Destino..."
                    className="w-full border border-slate-300 rounded p-2 outline-none font-sans text-xs leading-relaxed resize-none focus:ring-2 focus:ring-brand/20 bg-slate-50/50"
                  />
                </div>
                <div className="space-y-2 bg-white p-3 border border-slate-200 rounded shadow-sm">
                  <h4 className="font-bold text-slate-700 border-b pb-1">Dirección de Facturación</h4>
                  <textarea 
                    value={payToAddressText}
                    onChange={(e) => setPayToAddressText(e.target.value)}
                    rows={5}
                    placeholder="Dirección de Facturación..."
                    className="w-full border border-slate-300 rounded p-2 outline-none font-sans text-xs leading-relaxed resize-none focus:ring-2 focus:ring-brand/20 bg-slate-50/50"
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
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <label className="w-32 text-slate-600 text-right font-medium">Empleado de ventas</label>
                <div className="flex-1 flex items-center gap-1">
                  <input 
                    type="text"
                    value={salesEmployee}
                    onChange={e => setSalesEmployee(e.target.value)}
                    className="flex-1 bg-white border border-slate-300 rounded px-1.5 py-0.5 outline-none font-medium text-slate-800"
                  />
                  <span className="w-4 h-4 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center text-[9px] font-bold text-slate-600">i</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <label className="w-32 text-slate-600 text-right font-medium">Propietario</label>
                <input 
                  type="text"
                  value={owner}
                  onChange={e => setOwner(e.target.value)}
                  className="flex-1 bg-white border border-slate-300 rounded px-1.5 py-0.5 outline-none font-medium text-slate-800"
                />
              </div>

              <div className="flex items-start gap-2 pt-1">
                <label className="w-32 text-slate-600 text-right font-medium pt-1">Comentarios</label>
                <textarea 
                  value={comments}
                  onChange={e => setComments(e.target.value)}
                  rows={3}
                  placeholder="Comentarios u observaciones..."
                  className="flex-1 bg-white border border-slate-300 rounded p-1.5 outline-none font-sans text-xs text-slate-800 leading-relaxed resize-none focus:ring-2 focus:ring-brand/20"
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

      {/* ── Custom Context Menu (Right Click SAP Menu) ────────────────────────── */}
      {contextMenu && (
        <div 
          className="fixed bg-white border border-slate-300 shadow-2xl rounded py-1 z-50 text-xs text-slate-800 w-56 animate-in fade-in zoom-in-95"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button 
            className="w-full text-left px-3 py-1.5 hover:bg-amber-100 flex items-center gap-2 text-slate-700"
            onClick={() => { setContextMenu(null); alert('Duplicar documento SAP'); }}
          >
            <span className="w-4 text-center">📋</span> Duplicar
          </button>
          <button 
            className="w-full text-left px-3 py-1.5 hover:bg-amber-100 flex items-center gap-2 text-slate-700"
            onClick={() => { setContextMenu(null); alert('Documento destino'); }}
          >
            <span className="w-4 text-center">➡️</span> Documento destino...
          </button>
          <button 
            className="w-full text-left px-3 py-1.5 hover:bg-amber-100 flex items-center gap-2 text-slate-700"
            onClick={() => { setContextMenu(null); alert('Info detallada de fila'); }}
          >
            <span className="w-4 text-center">🔍</span> Info detallada de fila...
          </button>
          <div className="border-t border-slate-200 my-1"></div>
          <button 
            className="w-full text-left px-3 py-1.5 hover:bg-amber-100 flex items-center gap-2 text-slate-700"
            onClick={() => { setContextMenu(null); alert('Actividad nueva'); }}
          >
            <span className="w-4 text-center">📅</span> Actividad nueva
          </button>
          <button 
            className="w-full text-left px-3 py-1.5 hover:bg-amber-100 flex items-center gap-2 text-slate-700"
            onClick={() => { setContextMenu(null); alert('Ganancia bruta'); }}
          >
            <span className="w-4 text-center">📊</span> Ganancia bruta...
          </button>
          <button 
            className="w-full text-left px-3 py-1.5 hover:bg-amber-100 flex items-center gap-2 text-slate-700"
            onClick={() => { setContextMenu(null); alert('Cálculo de volumen y peso'); }}
          >
            <span className="w-4 text-center">⚖️</span> Cálculo de volumen y peso...
          </button>
          <div className="border-t border-slate-200 my-1"></div>
          <button 
            className="w-full text-left px-3 py-1.5 hover:bg-amber-100 font-bold text-amber-900 bg-amber-50/50 flex items-center gap-2"
            onClick={() => { setContextMenu(null); setIsComentariosModalOpen(true); }}
          >
            <span className="w-4 text-center">📝</span> Comentarios iniciales y finales...
          </button>
          <button 
            className="w-full text-left px-3 py-1.5 hover:bg-amber-100 flex items-center gap-2 text-slate-700"
            onClick={() => { setContextMenu(null); alert('Actividades relacionadas'); }}
          >
            <span className="w-4 text-center">📌</span> Actividades relacionadas
          </button>
          <button 
            className="w-full text-left px-3 py-1.5 hover:bg-amber-100 flex items-center gap-2 text-slate-700"
            onClick={() => { setContextMenu(null); alert('Oportunidades relacionadas'); }}
          >
            <span className="w-4 text-center">🎯</span> Oportunidades relacionadas
          </button>
          <button 
            className="w-full text-left px-3 py-1.5 hover:bg-amber-100 font-bold text-blue-900 bg-blue-50/50 flex items-center gap-2"
            onClick={() => { setContextMenu(null); setIsMapaRelacionesModalOpen(true); }}
          >
            <span className="w-4 text-center">🌿</span> Mapa de relaciones...
          </button>
        </div>
      )}

      {/* ── Modal: Comentarios Iniciales y Finales ───────────────────────────── */}
      {isComentariosModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl border border-slate-300 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-gradient-to-r from-amber-600 to-amber-700 text-white px-4 py-2 font-bold text-xs flex justify-between items-center shadow-sm">
              <span className="flex items-center gap-2">
                <span>📝</span> Comentarios iniciales y finales - Documento Nº {docNum || 'Nuevo'}
              </span>
              <button onClick={() => setIsComentariosModalOpen(false)} className="hover:text-amber-200 text-sm">✕</button>
            </div>

            <div className="p-4 space-y-4 text-xs bg-slate-50">
              <div className="bg-white p-3 border border-slate-200 rounded shadow-xs space-y-1">
                <label className="font-bold text-slate-700 block">Comentarios iniciales (Encabezado)</label>
                <textarea 
                  value={openingRemarks}
                  onChange={(e) => setOpeningRemarks(e.target.value)}
                  rows={4}
                  placeholder="Ingrese los comentarios iniciales del documento..."
                  className="w-full border border-slate-300 rounded p-2 outline-none font-sans text-xs text-slate-800 leading-relaxed resize-none focus:ring-2 focus:ring-brand/20 bg-slate-50/30"
                />
              </div>

              <div className="bg-white p-3 border border-slate-200 rounded shadow-xs space-y-1">
                <label className="font-bold text-slate-700 block">Comentarios finales (Pie de página / Observaciones)</label>
                <textarea 
                  value={closingRemarks}
                  onChange={(e) => setClosingRemarks(e.target.value)}
                  rows={4}
                  placeholder="Ingrese los comentarios finales del documento..."
                  className="w-full border border-slate-300 rounded p-2 outline-none font-sans text-xs text-slate-800 leading-relaxed resize-none focus:ring-2 focus:ring-brand/20 bg-slate-50/30"
                />
              </div>
            </div>

            <div className="p-3 bg-slate-100 border-t border-slate-200 flex justify-end gap-2 text-xs">
              <button 
                onClick={() => {
                  setComments(closingRemarks);
                  setIsComentariosModalOpen(false);
                }}
                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded border border-amber-600 shadow-xs"
              >
                OK
              </button>
              <button 
                onClick={() => setIsComentariosModalOpen(false)}
                className="px-4 py-1.5 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded border border-slate-300"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Mapa de Relaciones SAP ────────────────────────────────────── */}
      {isMapaRelacionesModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl border border-slate-300 w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in-95 flex flex-col max-h-[90vh]">
            <div className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white px-4 py-2 font-bold text-xs flex justify-between items-center shadow-sm">
              <span className="flex items-center gap-2">
                <span>🌿</span> Mapa de relaciones - Documento SAP B1 Nº {docNum || 'Consultado'}
              </span>
              <button onClick={() => setIsMapaRelacionesModalOpen(false)} className="hover:text-blue-200 text-sm">✕</button>
            </div>

            <div className="p-3 bg-slate-100 border-b border-slate-200 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-slate-600 font-semibold">
                <span>Vista de árbol de documentos vinculados</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded text-[10px] font-bold">● Válido / Confirmado</span>
                <span className="px-2 py-0.5 bg-blue-100 text-blue-800 border border-blue-300 rounded text-[10px] font-bold">● En Proceso</span>
              </div>
            </div>

            {/* Visual Relationship Diagram */}
            <div className="p-6 bg-slate-50 flex-1 overflow-auto flex items-center justify-center min-h-[360px]">
              <div className="flex items-center gap-4 max-w-full">
                
                {/* Card 1: Cliente / BP */}
                <div className="w-48 bg-white border-2 border-slate-300 rounded-xl p-3 shadow-md flex flex-col items-center text-center">
                  <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg mb-2">👤</div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cliente (OCRD)</span>
                  <h5 className="font-bold text-xs text-slate-800 mt-1 line-clamp-1">{cardCode || 'C890900123'}</h5>
                  <p className="text-[10px] text-slate-500 line-clamp-2 mt-0.5">{cardName || 'Cliente SAP'}</p>
                </div>

                <div className="text-slate-400 font-bold text-lg">➔</div>

                {/* Card 2: Oferta de Ventas */}
                <div className="w-52 bg-amber-50 border-2 border-amber-500 rounded-xl p-3 shadow-lg flex flex-col items-center text-center relative">
                  <span className="absolute -top-2.5 bg-amber-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase">Documento Actual</span>
                  <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-lg mb-2 mt-1">📋</div>
                  <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">Oferta de Ventas</span>
                  <h5 className="font-black text-sm text-slate-900 mt-0.5">Nº {docNum || '5800'}</h5>
                  <p className="text-[10px] text-slate-600 mt-1 font-semibold">Fecha: {postingDate || 'Fecha SAP'}</p>
                  <p className="text-xs font-extrabold text-amber-900 mt-1">{formatMoney(subtotalRows)}</p>
                  <span className="mt-2 px-2 py-0.5 bg-emerald-600 text-white text-[9px] font-bold rounded-full">{docStatus || 'Confirmada'}</span>
                </div>

                <div className="text-slate-400 font-bold text-lg">➔</div>

                {/* Card 3: Orden de Venta */}
                <div className="w-52 bg-white border-2 border-emerald-400 rounded-xl p-3 shadow-md flex flex-col items-center text-center">
                  <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-lg mb-2">📦</div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Orden de Venta</span>
                  <h5 className="font-bold text-xs text-slate-800 mt-1">Nº {ordenVenta || docNum || '5800'}</h5>
                  <p className="text-[10px] text-slate-500 mt-0.5">Tipo: {tipoPedido || 'Normal'}</p>
                  <span className="mt-2 px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[9px] font-bold rounded">{estadoOfertaVenta || 'Confirmada'}</span>
                </div>

                <div className="text-slate-400 font-bold text-lg">➔</div>

                {/* Card 4: Despacho / Logística */}
                <div className="w-48 bg-white border-2 border-slate-200 rounded-xl p-3 shadow-sm flex flex-col items-center text-center opacity-90">
                  <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-lg mb-2">🚚</div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Despacho</span>
                  <h5 className="font-bold text-xs text-slate-700 mt-1">{bloqueadoDespacho || 'No Bloqueado'}</h5>
                  <p className="text-[10px] text-slate-500 mt-0.5">Logística Firplak</p>
                </div>

              </div>
            </div>

            <div className="p-3 bg-slate-100 border-t border-slate-200 flex justify-end text-xs">
              <button 
                onClick={() => setIsMapaRelacionesModalOpen(false)}
                className="px-5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded shadow-xs"
              >
                Cerrar Mapa
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
