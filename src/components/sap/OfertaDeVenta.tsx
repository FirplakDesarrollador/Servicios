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

export default function OfertaDeVenta({ mode = 'Quotation' }: { mode?: 'Quotation' | 'ProductionOrder' | 'Order' | 'Delivery' | 'Invoice' }) {
  // ── Form State (Initially EMPTY for Consultation) ─────────────────────────────
  // Header Left
  const [cardCode, setCardCode] = useState('');
  const [cardName, setCardName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [refNumber, setRefNumber] = useState('');
  const [currency, setCurrency] = useState('COP');

  // Header Right
  const [docSeries, setDocSeries] = useState(
    mode === 'ProductionOrder' ? 'OF-Planta' : mode === 'Order' ? 'Ped.Nac' : mode === 'Delivery' ? 'Ent-Nal' : mode === 'Invoice' ? 'NAL-FEN8' : 'Cot-Nal'
  );
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
  const [tipoFacturacion, setTipoFacturacion] = useState('Sin POD');

  const [activaConsignatarioNotifi, setActivaConsignatarioNotifi] = useState('NO Activar');
  const [viaDelPedido, setViaDelPedido] = useState('Asesores de Ventas');
  const [validativeEAlmacen, setValidativeEAlmacen] = useState('No requiere Autorizacion');
  const [anticipoTotal, setAnticipoTotal] = useState('0.00');

  // Production Order Specific State
  const [productionOrderType, setProductionOrderType] = useState('Estándar');
  const [productionOrderStatus, setProductionOrderStatus] = useState('Planif.');
  const [productNo, setProductNo] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [plannedQuantity, setPlannedQuantity] = useState('1');
  const [warehouse, setWarehouse] = useState('PT-02');
  const [businessPartner, setBusinessPartner] = useState('');
  const [routingDateCalculation, setRoutingDateCalculation] = useState('En Fecha de inicio');
  const [procureOrder, setProcureOrder] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [poUserSignature, setPoUserSignature] = useState('Luis Guillermo Escobar');
  const [poOrigin, setPoOrigin] = useState('Manual');
  const [poLinkedTo, setPoLinkedTo] = useState('Pedido de cliente');
  const [poLinkedOrder, setPoLinkedOrder] = useState('');
  const [costCenter, setCostCenter] = useState('');
  const [poProject, setPoProject] = useState('');
  const [pickRemarks, setPickRemarks] = useState('');

  // Tabs
  const [activeTab, setActiveTab] = useState<'contenido' | 'logistica' | 'anexos' | 'componentes' | 'resumen'>('contenido');
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
    const searchTarget = (queryNum || docNum || ordenVenta || '').trim();
    if (!searchTarget) {
      setStatusMessage('✖ Ingrese un número de Documento para consultar en SAP Business One.');
      setStatusType('error');
      return;
    }

    try {
      setStatusMessage(`● Consultando documento Nº ${searchTarget} en SAP Business One Service Layer...`);
      setStatusType('info');

      const res = await fetch(`/api/sap/quotations?docNum=${encodeURIComponent(searchTarget.trim())}&type=${mode}`);
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
      const rawStatus = sapDoc.DocumentStatus || sapDoc.DocStatus || '';
      const isAbierto = rawStatus === 'bost_Open' || rawStatus === 'O' || rawStatus === 'Open';
      const isCancelled = sapDoc.Cancelled === 'tYES' || rawStatus === 'bost_Cancelled' || rawStatus === 'Canceled';
      setDocStatus(isCancelled ? 'Cancelado' : (isAbierto ? 'Abiertos' : 'Cerrado'));

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
      if (estRaw === '01' || estRaw === '1' || estRaw.toLowerCase().includes('conf')) {
        setEstadoOfertaVenta('Confirmada');
      } else if (estRaw === '02' || estRaw === '2' || estRaw.toLowerCase().includes('pend')) {
        setEstadoOfertaVenta('Pendiente');
      } else if (estRaw === '03' || estRaw === '3' || estRaw.toLowerCase().includes('aprob')) {
        setEstadoOfertaVenta('Aprobado');
      } else if (estRaw.toLowerCase().includes('rech')) {
        setEstadoOfertaVenta('Rechazado');
      } else if (estRaw.toLowerCase().includes('anul')) {
        setEstadoOfertaVenta('Anulada');
      } else {
        setEstadoOfertaVenta(estRaw || 'Confirmada');
      }

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
      setTipoFacturacion(String(sapDoc.U_TipoFacturacion || sapDoc.U_Tipo_Facturacion || 'Sin POD'));

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

      // Populate Production Order specific properties
      if (mode === 'ProductionOrder' || sapDoc.ProductionOrderType || sapDoc.ItemNo) {
        setProductionOrderType(
          sapDoc.ProductionOrderType === 'bopotSpecial' ? 'Especial' :
          sapDoc.ProductionOrderType === 'bopotDisassembly' ? 'Desmontaje' :
          'Estándar'
        );
        setProductionOrderStatus(
          sapDoc.ProductionOrderStatus === 'boposReleased' ? 'Liberado' :
          sapDoc.ProductionOrderStatus === 'boposClosed' ? 'Cerrado' :
          sapDoc.ProductionOrderStatus === 'boposCancelled' ? 'Cancelado' :
          'Planif.'
        );
        setProductNo(sapDoc.ItemNo || '');
        setProductDescription(sapDoc.ProductDescription || '');
        setPlannedQuantity(String(sapDoc.PlannedQuantity || 1));
        setWarehouse(sapDoc.Warehouse || 'PT-02');
        setBusinessPartner(sapDoc.U_HBT_Tercero || sapDoc.CustomerCode || sapDoc.CardCode || '');
        setStartDate(sapDoc.StartDate ? sapDoc.StartDate.split('T')[0] : '');
        setDueDate(sapDoc.DueDate ? sapDoc.DueDate.split('T')[0] : '');
        setPoUserSignature(sapDoc.UserSignature ? 'Usuario ' + sapDoc.UserSignature : 'Luis Guillermo Escobar');
        setPoOrigin(sapDoc.ProductionOrderOrigin === 'bopooSalesOrder' ? 'Pedido de cliente' : 'Manual');
        setPoLinkedOrder(String(sapDoc.ProductionOrderOriginNumber || ''));
        setPickRemarks(sapDoc.PickRemarks || '');
        if (sapDoc.DocumentNumber) {
          setDocNum(String(sapDoc.DocumentNumber));
        }

        if (sapDoc.ProductionOrderLines && sapDoc.ProductionOrderLines.length > 0) {
          const mappedLines: GridRow[] = sapDoc.ProductionOrderLines.map((line: any, idx: number) => ({
            id: String(idx + 1),
            itemCode: line.ItemNo || line.ItemCode || '',
            description: line.ItemDescription || line.Description || '',
            barCode: 'N/A',
            quantity: line.PlannedQuantity || line.BaseQuantity || 1,
            unitMsr: 'UN',
            price: line.IssuedQuantity || 0,
            discount: 0,
            taxCode: 'IVA 19%',
            total: line.PlannedQuantity || 0,
            whsCode: line.Warehouse || 'PT-02',
            costingCode: '',
            salesEmployee: 'Firplak',
            lineStatus: 'Abierto'
          }));
          setRows(mappedLines);
        }
      }

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
              <span>
                {mode === 'Invoice'
                  ? 'Factura de deudores'
                  : mode === 'Delivery'
                  ? 'Entrega'
                  : mode === 'Order'
                  ? 'Orden de venta'
                  : mode === 'ProductionOrder'
                  ? 'Orden de fabricación'
                  : 'Oferta de ventas'}
              </span>
              <button className="text-[10px] hover:text-amber-300">▶</button>
            </div>
            <span className="text-[10px] text-slate-300">Campos U.</span>
          </div>

          {/* Form Fields */}
          <div className="p-2 space-y-2 overflow-y-auto max-h-[580px]">
            {mode === 'ProductionOrder' ? (
              <>
                <div>
                  <label className="text-slate-600 block mb-0.5 font-medium">Fecha Sugerida Liberacion TOC</label>
                  <input type="date" className="w-full bg-white border border-slate-300 rounded px-1.5 py-0.5 outline-none text-xs" />
                </div>
                <div>
                  <label className="text-slate-600 block mb-0.5 font-medium">Fecha Liberacion Planificacion</label>
                  <input type="date" className="w-full bg-white border border-slate-300 rounded px-1.5 py-0.5 outline-none text-xs" />
                </div>
                <div>
                  <label className="text-slate-600 block mb-0.5 font-medium">Fecha Requisión</label>
                  <input type="date" className="w-full bg-white border border-slate-300 rounded px-1.5 py-0.5 outline-none text-xs" />
                </div>
                <div>
                  <label className="text-slate-600 block mb-0.5 font-medium">Fecha Real Liberacion</label>
                  <input type="date" className="w-full bg-white border border-slate-300 rounded px-1.5 py-0.5 outline-none text-xs" />
                </div>
                <div>
                  <label className="text-slate-600 block mb-0.5 font-medium">Num. Lote</label>
                  <input type="text" className="w-full bg-white border border-slate-300 rounded px-1.5 py-0.5 outline-none text-xs" />
                </div>
                <div>
                  <label className="text-slate-600 block mb-0.5 font-medium">Tipo de Orden</label>
                  <select className="w-full bg-white border border-slate-300 rounded px-1.5 py-0.5 outline-none text-xs">
                    <option value="STANDARD">STANDARD</option>
                    <option value="SPECIAL">SPECIAL</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-600 block mb-0.5 font-medium">Socio de negocio</label>
                  <input type="text" value={businessPartner || cardCode} onChange={e => setBusinessPartner(e.target.value)} className="w-full bg-white border border-slate-300 rounded px-1.5 py-0.5 outline-none text-xs font-semibold text-slate-800" />
                </div>
                <div>
                  <label className="text-slate-600 block mb-0.5 font-medium">Fecha de finalización (desatraso)</label>
                  <input type="date" className="w-full bg-white border border-slate-300 rounded px-1.5 py-0.5 outline-none text-xs" />
                </div>
                <div>
                  <label className="text-slate-600 block mb-0.5 font-medium">Razón de retraso 2</label>
                  <select className="w-full bg-white border border-slate-300 rounded px-1.5 py-0.5 outline-none text-xs"><option value=""></option></select>
                </div>
                <div>
                  <label className="text-slate-600 block mb-0.5 font-medium">Fecha de finalización (desatraso) 2</label>
                  <input type="date" className="w-full bg-white border border-slate-300 rounded px-1.5 py-0.5 outline-none text-xs" />
                </div>
                <div>
                  <label className="text-slate-600 block mb-0.5 font-medium">Razón de retraso</label>
                  <select className="w-full bg-white border border-slate-300 rounded px-1.5 py-0.5 outline-none text-xs"><option value=""></option></select>
                </div>
                <div>
                  <label className="text-slate-600 block mb-0.5 font-medium">Orden de Compra</label>
                  <input type="text" className="w-full bg-white border border-slate-300 rounded px-1.5 py-0.5 outline-none text-xs" />
                </div>
              </>
            ) : mode === 'Invoice' ? (
              <>
                <div>
                  <label className="text-slate-600 block mb-0.5">Tiene Autorretención</label>
                  <select className="w-full bg-white border border-slate-300 rounded px-1.5 py-0.5 outline-none text-xs"><option value="No">No</option><option value="Si">Si</option></select>
                </div>
                <div>
                  <label className="text-slate-600 block mb-0.5">BPCOST</label>
                  <input type="text" className="w-full bg-white border border-slate-300 rounded px-1.5 py-0.5 outline-none" />
                </div>
                <div>
                  <label className="text-slate-600 block mb-0.5">WUID</label>
                  <input type="text" className="w-full bg-white border border-slate-300 rounded px-1.5 py-0.5 outline-none" />
                </div>
                <div>
                  <label className="text-slate-600 block mb-0.5">Tipo de Nota</label>
                  <select className="w-full bg-white border border-slate-300 rounded px-1.5 py-0.5 outline-none text-xs"><option value=""></option></select>
                </div>
                <div>
                  <label className="text-slate-600 block mb-0.5">Codigo de DifCambio</label>
                  <select className="w-full bg-white border border-slate-300 rounded px-1.5 py-0.5 outline-none text-xs"><option value=""></option></select>
                </div>
                <div>
                  <label className="text-slate-600 block mb-0.5">IVA x Muestras pagado</label>
                  <select className="w-full bg-white border border-slate-300 rounded px-1.5 py-0.5 outline-none text-xs"><option value="No">No</option><option value="Si">Si</option></select>
                </div>
                <div>
                  <label className="text-slate-600 block mb-0.5">Tiene Retefuente</label>
                  <select className="w-full bg-white border border-slate-300 rounded px-1.5 py-0.5 outline-none text-xs"><option value="No">No</option><option value="Si">Si</option></select>
                </div>
                <div>
                  <label className="text-slate-600 block mb-0.5">Tiene ReteICA</label>
                  <select className="w-full bg-white border border-slate-300 rounded px-1.5 py-0.5 outline-none text-xs"><option value="No">No</option><option value="Si">Si</option></select>
                </div>
                <div>
                  <label className="text-slate-600 block mb-0.5">Incoterm</label>
                  <select className="w-full bg-white border border-slate-300 rounded px-1.5 py-0.5 outline-none text-xs"><option value=""></option></select>
                </div>
                <div>
                  <label className="text-slate-600 block mb-0.5">Fecha Real de Despacho</label>
                  <input type="date" className="w-full bg-white border border-slate-300 rounded px-1 py-0.5 outline-none text-xs" />
                </div>
                <div>
                  <label className="text-slate-600 block mb-0.5">Puerto Destino</label>
                  <select className="w-full bg-white border border-slate-300 rounded px-1.5 py-0.5 outline-none text-xs"><option value=""></option></select>
                </div>
                <div>
                  <label className="text-slate-600 block mb-0.5">Medio de transporte</label>
                  <select className="w-full bg-white border border-slate-300 rounded px-1.5 py-0.5 outline-none text-xs"><option value=""></option></select>
                </div>
                <div>
                  <label className="text-slate-600 block mb-0.5">Fecha salida del Puerto</label>
                  <input type="date" className="w-full bg-white border border-slate-300 rounded px-1 py-0.5 outline-none text-xs" />
                </div>
                <div>
                  <label className="text-slate-600 block mb-0.5">Fecha llegada de documentos</label>
                  <input type="date" className="w-full bg-white border border-slate-300 rounded px-1 py-0.5 outline-none text-xs" />
                </div>
                <div>
                  <label className="text-slate-600 block mb-0.5">Fecha llegada al puerto destin</label>
                  <input type="date" className="w-full bg-white border border-slate-300 rounded px-1 py-0.5 outline-none text-xs" />
                </div>
                <div>
                  <label className="text-slate-600 block mb-0.5">Fecha d Pre inspección</label>
                  <input type="date" className="w-full bg-white border border-slate-300 rounded px-1 py-0.5 outline-none text-xs" />
                </div>
                <div>
                  <label className="text-slate-600 block mb-0.5">Fecha Pago Anticipo</label>
                  <input type="date" className="w-full bg-white border border-slate-300 rounded px-1 py-0.5 outline-none text-xs" />
                </div>
                <div>
                  <label className="text-slate-600 block mb-0.5">Fecha de levante</label>
                  <input type="date" className="w-full bg-white border border-slate-300 rounded px-1 py-0.5 outline-none text-xs" />
                </div>
                <div>
                  <label className="text-slate-600 block mb-0.5">Fecha de llegada a Firplak</label>
                  <input type="date" className="w-full bg-white border border-slate-300 rounded px-1 py-0.5 outline-none text-xs" />
                </div>
                <div>
                  <label className="text-slate-600 block mb-0.5">Plan Vallejo</label>
                  <select className="w-full bg-white border border-slate-300 rounded px-1.5 py-0.5 outline-none text-xs"><option value=""></option></select>
                </div>
                <div>
                  <label className="text-slate-600 block mb-0.5">Importación Fraccionada</label>
                  <select className="w-full bg-white border border-slate-300 rounded px-1.5 py-0.5 outline-none text-xs"><option value=""></option></select>
                </div>
                <div>
                  <label className="text-slate-600 block mb-0.5">Servicio (Calificación)</label>
                  <select className="w-full bg-white border border-slate-300 rounded px-1.5 py-0.5 outline-none text-xs"><option value=""></option></select>
                </div>
                <div>
                  <label className="text-slate-600 block mb-0.5">Calidad (Calificación)</label>
                  <select className="w-full bg-white border border-slate-300 rounded px-1.5 py-0.5 outline-none text-xs"><option value=""></option></select>
                </div>
                <div>
                  <label className="text-slate-600 block mb-0.5">Cantidad (calificación)</label>
                  <select className="w-full bg-white border border-slate-300 rounded px-1.5 py-0.5 outline-none text-xs"><option value=""></option></select>
                </div>
                <div>
                  <label className="text-slate-600 block mb-0.5">Cumplimiento (Calificación)</label>
                  <select className="w-full bg-white border border-slate-300 rounded px-1.5 py-0.5 outline-none text-xs"><option value=""></option></select>
                </div>
                <div>
                  <label className="text-slate-600 block mb-0.5">Tipo de devolucion NC</label>
                  <select className="w-full bg-white border border-slate-300 rounded px-1.5 py-0.5 outline-none text-xs"><option value=""></option></select>
                </div>
                <div>
                  <label className="text-slate-600 block mb-0.5 font-medium">Validación E almacén vs Factur</label>
                  <select value={validativeEAlmacen} onChange={e => setValidativeEAlmacen(e.target.value)} className="w-full bg-white border border-slate-300 rounded px-1.5 py-0.5 outline-none text-xs">
                    <option value="No requiere Autorizacion">No requiere Autorizacion</option>
                    <option value="Requiere Autorizacion">Requiere Autorizacion</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-600 block mb-0.5">QRObservac</label>
                  <input type="text" className="w-full bg-white border border-slate-300 rounded px-1.5 py-0.5 outline-none" />
                </div>
                <div>
                  <label className="text-slate-600 block mb-0.5">Codigo del vendedor Junior</label>
                  <input type="text" className="w-full bg-white border border-slate-300 rounded px-1.5 py-0.5 outline-none" />
                </div>
                <div>
                  <label className="text-slate-600 block mb-0.5">Autorizacion de descuentos</label>
                  <select className="w-full bg-white border border-slate-300 rounded px-1.5 py-0.5 outline-none text-xs"><option value=""></option></select>
                </div>
                <div>
                  <label className="text-slate-600 block mb-0.5">Lugar de entrega</label>
                  <input type="text" className="w-full bg-white border border-slate-300 rounded px-1.5 py-0.5 outline-none" />
                </div>
                <div>
                  <label className="text-slate-600 block mb-0.5">Fecha esperada de entrega</label>
                  <input type="date" className="w-full bg-white border border-slate-300 rounded px-1 py-0.5 outline-none text-xs" />
                </div>
              </>
            ) : mode === 'Delivery' ? (
              <>
                <div>
                  <label className="text-slate-600 block mb-0.5">Autorizacion de descuentos</label>
                  <input type="text" className="w-full bg-white border border-slate-300 rounded px-1.5 py-0.5 outline-none" />
                </div>
                <div>
                  <label className="text-slate-600 block mb-0.5">Lugar de entrega</label>
                  <input type="text" className="w-full bg-white border border-slate-300 rounded px-1.5 py-0.5 outline-none" />
                </div>
                <div>
                  <label className="text-slate-600 block mb-0.5">Fecha esperada de entrega</label>
                  <input type="date" className="w-full bg-white border border-slate-300 rounded px-1.5 py-0.5 outline-none text-xs" />
                </div>
                <div>
                  <label className="text-slate-600 block mb-0.5">Consignatario</label>
                  <input type="text" className="w-full bg-white border border-slate-300 rounded px-1.5 py-0.5 outline-none" />
                </div>
                <div>
                  <label className="text-slate-600 block mb-0.5">Notificar</label>
                  <input type="text" className="w-full bg-white border border-slate-300 rounded px-1.5 py-0.5 outline-none" />
                </div>
                <div>
                  <label className="text-slate-600 block mb-0.5 font-medium">Activa consignatario y notifi</label>
                  <select value={activaConsignatarioNotifi} onChange={e => setActivaConsignatarioNotifi(e.target.value)} className="w-full bg-white border border-slate-300 rounded px-1.5 py-0.5 outline-none text-xs">
                    <option value="NO Activar">NO Activar</option>
                    <option value="Activar">Activar</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-600 block mb-0.5">Seguro</label>
                  <input type="text" className="w-full bg-white border border-slate-300 rounded px-1.5 py-0.5 outline-none" />
                </div>
                <div>
                  <label className="text-slate-600 block mb-0.5">Marcas</label>
                  <input type="text" className="w-full bg-white border border-slate-300 rounded px-1.5 py-0.5 outline-none" />
                </div>
                <div>
                  <label className="text-slate-600 block mb-0.5">A (to):</label>
                  <select className="w-full bg-white border border-slate-300 rounded px-1.5 py-0.5 outline-none text-xs"><option value=""></option></select>
                </div>
                <div>
                  <label className="text-slate-600 block mb-0.5">Embarcado en:</label>
                  <select className="w-full bg-white border border-slate-300 rounded px-1.5 py-0.5 outline-none text-xs"><option value=""></option></select>
                </div>
                <div>
                  <label className="text-slate-600 block mb-0.5">Via</label>
                  <select className="w-full bg-white border border-slate-300 rounded px-1.5 py-0.5 outline-none text-xs"><option value=""></option></select>
                </div>
                <div>
                  <label className="text-slate-600 block mb-0.5">Flete</label>
                  <select className="w-full bg-white border border-slate-300 rounded px-1.5 py-0.5 outline-none text-xs"><option value=""></option></select>
                </div>
                <div>
                  <label className="text-slate-600 block mb-0.5">Vía del Pedido</label>
                  <select value={viaDelPedido} onChange={e => setViaDelPedido(e.target.value)} className="w-full bg-white border border-slate-300 rounded px-1.5 py-0.5 outline-none text-xs">
                    <option value="Asesores de Ventas">Asesores de Ventas</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-600 block mb-0.5">Pedido para TOC ?</label>
                  <select className="w-full bg-white border border-slate-300 rounded px-1.5 py-0.5 outline-none text-xs"><option value=""></option></select>
                </div>
                <div>
                  <label className="text-slate-600 block mb-0.5">TiposNC</label>
                  <select className="w-full bg-white border border-slate-300 rounded px-1.5 py-0.5 outline-none text-xs"><option value=""></option></select>
                </div>
                <div>
                  <label className="text-slate-600 block mb-0.5">Conceptos de NC</label>
                  <select className="w-full bg-white border border-slate-300 rounded px-1.5 py-0.5 outline-none text-xs"><option value=""></option></select>
                </div>
                <div>
                  <label className="text-slate-600 block mb-0.5">Fecha de cierre</label>
                  <input type="date" value={fechaCierre} onChange={e => setFechaCierre(e.target.value)} className="w-full bg-white border border-slate-300 rounded px-1 py-0.5 outline-none text-xs" />
                </div>
                <div>
                  <label className="text-slate-600 block mb-0.5">Fecha de autorizacion</label>
                  <input type="date" className="w-full bg-white border border-slate-300 rounded px-1 py-0.5 outline-none text-xs" />
                </div>
                <div>
                  <label className="text-slate-600 block mb-0.5">Cambio fecha de Entrega</label>
                  <select className="w-full bg-white border border-slate-300 rounded px-1.5 py-0.5 outline-none text-xs"><option value=""></option></select>
                </div>
                <div>
                  <label className="text-slate-600 block mb-0.5">Ciudad de destino Nacional</label>
                  <input type="text" className="w-full bg-white border border-slate-300 rounded px-1.5 py-0.5 outline-none" />
                </div>
                <div>
                  <label className="text-slate-600 block mb-0.5">RecibosCaja</label>
                  <input type="text" className="w-full bg-white border border-slate-300 rounded px-1.5 py-0.5 outline-none" />
                </div>
                <div>
                  <label className="text-slate-600 block mb-0.5">Numero de guia</label>
                  <input type="text" className="w-full bg-white border border-slate-300 rounded px-1.5 py-0.5 outline-none" />
                </div>
                <div>
                  <label className="text-slate-600 block mb-0.5">Transportador</label>
                  <input type="text" className="w-full bg-white border border-slate-300 rounded px-1.5 py-0.5 outline-none" />
                </div>
                <div>
                  <label className="text-slate-600 block mb-0.5">Fecha de despacho</label>
                  <input type="date" className="w-full bg-white border border-slate-300 rounded px-1 py-0.5 outline-none text-xs" />
                </div>
                <div>
                  <label className="text-slate-600 block mb-0.5">Fecha recepcion de mercancia</label>
                  <input type="date" className="w-full bg-white border border-slate-300 rounded px-1 py-0.5 outline-none text-xs" />
                </div>
                <div>
                  <label className="text-slate-600 block mb-0.5">Anticipo</label>
                  <select value={anticipoPct} onChange={e => setAnticipoPct(e.target.value)} className="w-full bg-white border border-slate-300 rounded px-1.5 py-0.5 outline-none text-xs">
                    <option value="SI tiene anticipo">SI tiene anticipo</option>
                    <option value="NO tiene anticipo">NO tiene anticipo</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-600 block mb-0.5">Recibo de caja del anticipo</label>
                  <input type="text" className="w-full bg-white border border-slate-300 rounded px-1.5 py-0.5 outline-none" />
                </div>
                <div>
                  <label className="text-slate-600 block mb-0.5">Número del documento</label>
                  <input type="text" className="w-full bg-white border border-slate-300 rounded px-1.5 py-0.5 outline-none" />
                </div>
                <div>
                  <label className="text-slate-600 block mb-0.5">Aplicacion Anticipo ?</label>
                  <select value={aplicacionAnticipo} onChange={e => setAplicacionAnticipo(e.target.value)} className="w-full bg-white border border-slate-300 rounded px-1.5 py-0.5 outline-none text-xs">
                    <option value="NO">NO</option>
                    <option value="SI">SI</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-600 block mb-0.5">Volver a remisionar?</label>
                  <select className="w-full bg-white border border-slate-300 rounded px-1.5 py-0.5 outline-none text-xs"><option value=""></option></select>
                </div>
                <div>
                  <label className="text-slate-600 block mb-0.5">Concepto de entrada</label>
                  <select className="w-full bg-white border border-slate-300 rounded px-1.5 py-0.5 outline-none text-xs"><option value=""></option></select>
                </div>
              </>
            ) : (
              <>
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

                {mode === 'Order' && (
                  <div>
                    <label className="text-slate-600 block mb-0.5 font-medium">Tipo Facturacion</label>
                    <select 
                      value={tipoFacturacion}
                      onChange={e => setTipoFacturacion(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded px-1.5 py-0.5 outline-none focus:border-blue-600 text-xs"
                    >
                      <option value="Sin POD">Sin POD</option>
                      <option value="Con POD">Con POD</option>
                      {tipoFacturacion && !['Sin POD', 'Con POD'].includes(tipoFacturacion) && (
                        <option value={tipoFacturacion}>{tipoFacturacion}</option>
                      )}
                    </select>
                  </div>
                )}
              </>
            )}
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
            <span>
              {mode === 'Invoice'
                ? 'Factura de deudores'
                : mode === 'ProductionOrder' 
                ? 'Orden de fabricación' 
                : mode === 'Order' 
                ? 'Orden de venta' 
                : mode === 'Delivery' 
                ? 'Entrega' 
                : 'Oferta de ventas'}
            </span>
            <div className="flex items-center gap-1 opacity-80">
              <span className="hover:opacity-100 cursor-pointer">_</span>
              <span className="hover:opacity-100 cursor-pointer">□</span>
              <span className="hover:opacity-100 cursor-pointer">✕</span>
            </div>
          </div>

          {/* Form Header Section */}
          {mode === 'ProductionOrder' ? (
            <div className="p-3 bg-[#F1F5F9] border-b border-slate-300 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Left Header Fields */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <label className="w-36 text-slate-600 text-right">Tipo</label>
                  <select value={productionOrderType} onChange={e => setProductionOrderType(e.target.value)} className="flex-1 bg-white border border-slate-300 rounded px-1.5 py-0.5 outline-none font-medium">
                    <option value="Estándar">Estándar</option>
                    <option value="Especial">Especial</option>
                    <option value="Desmontaje">Desmontaje</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <label className="w-36 text-slate-600 text-right">Estado</label>
                  <select value={productionOrderStatus} onChange={e => setProductionOrderStatus(e.target.value)} className="flex-1 bg-white border border-slate-300 rounded px-1.5 py-0.5 outline-none font-medium">
                    <option value="Planif.">Planif.</option>
                    <option value="Liberado">Liberado</option>
                    <option value="Cerrado">Cerrado</option>
                    <option value="Cancelado">Cancelado</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <label className="w-36 text-slate-600 text-right">Nº producto</label>
                  <div className="flex-1 flex items-center gap-1">
                    <input type="text" value={productNo || (rows[0]?.itemCode || '')} onChange={e => setProductNo(e.target.value)} className="flex-1 bg-white border border-slate-300 rounded px-1.5 py-0.5 outline-none font-semibold text-amber-800" />
                    <button onClick={() => setIsItemModalOpen(true)} className="w-4 h-4 bg-amber-400 hover:bg-amber-500 rounded-full flex items-center justify-center text-[9px] font-black text-slate-900 border border-amber-600 cursor-pointer">◯</button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <label className="w-36 text-slate-600 text-right">Descripción producto</label>
                  <input type="text" value={productDescription || (rows[0]?.description || '')} onChange={e => setProductDescription(e.target.value)} className="flex-1 bg-white border border-slate-300 rounded px-1.5 py-0.5 outline-none font-medium" />
                </div>

                <div className="flex items-center gap-2">
                  <label className="w-36 text-slate-600 text-right">Cantidad planificada</label>
                  <div className="flex-1 flex items-center gap-2">
                    <input type="number" value={plannedQuantity} onChange={e => setPlannedQuantity(e.target.value)} className="w-24 bg-white border border-slate-300 rounded px-1.5 py-0.5 outline-none font-bold text-slate-800 text-right" />
                    <span className="text-slate-600">Nombre de</span>
                    <input type="text" defaultValue="UN" readOnly className="w-12 bg-slate-100 border border-slate-300 rounded px-1 py-0.5 text-center text-slate-600" />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <label className="w-36 text-slate-600 text-right">Almacén</label>
                  <input type="text" value={warehouse} onChange={e => setWarehouse(e.target.value)} className="flex-1 bg-white border border-slate-300 rounded px-1.5 py-0.5 outline-none font-medium" />
                </div>

                <div className="flex items-center gap-2">
                  <label className="w-36 text-slate-600 text-right">Socio de negocio</label>
                  <div className="flex-1 flex items-center gap-1">
                    <input type="text" value={businessPartner || cardCode || 'AC890927404-01'} onChange={e => setBusinessPartner(e.target.value)} className="flex-1 bg-[#FFFDE7] border border-amber-400 rounded px-1.5 py-0.5 outline-none font-bold text-slate-800" />
                    <button onClick={() => setIsCustomerModalOpen(true)} className="w-4 h-4 bg-amber-400 hover:bg-amber-500 rounded-full flex items-center justify-center text-[9px] font-black text-slate-900 border border-amber-600 cursor-pointer">◯</button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <label className="w-36 text-slate-600 text-right">Cálculo de fecha de enrutamiento</label>
                  <select value={routingDateCalculation} onChange={e => setRoutingDateCalculation(e.target.value)} className="flex-1 bg-white border border-slate-300 rounded px-1.5 py-0.5 outline-none font-medium">
                    <option value="En Fecha de inicio">En Fecha de inicio</option>
                    <option value="En Fecha de finalización">En Fecha de finalización</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-0.5">
                  <label className="w-36 text-slate-600 text-right"></label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 font-medium">
                    <input type="checkbox" checked={procureOrder} onChange={e => setProcureOrder(e.target.checked)} className="rounded text-amber-500" />
                    <span>Aprovisionar artículos</span>
                  </label>
                </div>
              </div>

              {/* Right Header Fields */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <label className="w-36 text-slate-600 text-right">Nº</label>
                  <div className="flex items-center gap-1">
                    <select value={docSeries} onChange={e => setDocSeries(e.target.value)} className="bg-white border border-slate-300 rounded px-1.5 py-0.5 outline-none text-xs">
                      <option value="OF-Produ">OF-Produ</option>
                      <option value="OF-Planta">OF-Planta</option>
                      <option value="OF-Especial">OF-Especial</option>
                    </select>
                    <div className="relative flex items-center">
                      <input 
                        type="text" 
                        placeholder="DocNum..." 
                        value={docNum || '2259805'} 
                        onChange={e => setDocNum(e.target.value)} 
                        onKeyDown={e => { if (e.key === 'Enter') handleSearchSapDocument(e.currentTarget.value); }}
                        className="w-28 bg-[#FFFDE7] border border-amber-400 font-bold rounded pl-1.5 pr-6 py-0.5 outline-none text-right text-slate-900 focus:ring-2 focus:ring-amber-500 text-xs shadow-inner" 
                      />
                      <button onClick={() => handleSearchSapDocument(docNum)} className="absolute right-1 text-slate-600 hover:text-amber-700 font-bold text-xs p-0.5 cursor-pointer">🔍</button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <label className="w-36 text-slate-600 text-right">Fecha orden de fabricación</label>
                  <input type="date" value={postingDate} onChange={e => setPostingDate(e.target.value)} className="w-36 bg-white border border-slate-300 rounded px-1.5 py-0.5 outline-none text-xs" />
                </div>

                <div className="flex items-center gap-2">
                  <label className="w-36 text-slate-600 text-right">Fecha de inicio</label>
                  <input type="date" value={startDate || postingDate} onChange={e => setStartDate(e.target.value)} className="w-36 bg-white border border-slate-300 rounded px-1.5 py-0.5 outline-none text-xs" />
                </div>

                <div className="flex items-center gap-2">
                  <label className="w-36 text-slate-600 text-right">Fecha de finalización</label>
                  <input type="date" value={dueDate || validUntil} onChange={e => setDueDate(e.target.value)} className="w-36 bg-white border border-slate-300 rounded px-1.5 py-0.5 outline-none text-xs" />
                </div>

                <div className="flex items-center gap-2">
                  <label className="w-36 text-slate-600 text-right">Usuario</label>
                  <select value={poUserSignature} onChange={e => setPoUserSignature(e.target.value)} className="flex-1 bg-white border border-slate-300 rounded px-1.5 py-0.5 outline-none font-medium">
                    <option value="Luis Guillermo Escobar">Luis Guillermo Escobar</option>
                    <option value="Mayerly Marin">Mayerly Marin</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <label className="w-36 text-slate-600 text-right">Origen</label>
                  <select value={poOrigin} onChange={e => setPoOrigin(e.target.value)} className="flex-1 bg-white border border-slate-300 rounded px-1.5 py-0.5 outline-none font-medium">
                    <option value="Manual">Manual</option>
                    <option value="MRP">MRP</option>
                    <option value="Pedido de cliente">Pedido de cliente</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <label className="w-36 text-slate-600 text-right">Vinculados a</label>
                  <select value={poLinkedTo} onChange={e => setPoLinkedTo(e.target.value)} className="flex-1 bg-white border border-slate-300 rounded px-1.5 py-0.5 outline-none font-medium">
                    <option value="Pedido de cliente">Pedido de cliente</option>
                    <option value="Ninguno">Ninguno</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <label className="w-36 text-slate-600 text-right">Pedido vinculado</label>
                  <input type="text" value={poLinkedOrder || ordenVenta} onChange={e => setPoLinkedOrder(e.target.value)} className="flex-1 bg-white border border-slate-300 rounded px-1.5 py-0.5 outline-none font-medium" />
                </div>

                <div className="flex items-center gap-2">
                  <label className="w-36 text-slate-600 text-right">Cliente</label>
                  <input type="text" value={cardCode} onChange={e => setCardCode(e.target.value)} className="flex-1 bg-white border border-slate-300 rounded px-1.5 py-0.5 outline-none font-medium" />
                </div>

                <div className="flex items-center gap-2">
                  <label className="w-36 text-slate-600 text-right font-bold text-slate-800">Centro de Costos</label>
                  <input type="text" value={costCenter} onChange={e => setCostCenter(e.target.value)} className="flex-1 bg-white border border-slate-300 rounded px-1.5 py-0.5 outline-none font-medium" />
                </div>

                <div className="flex items-center gap-2">
                  <label className="w-36 text-slate-600 text-right">Proyecto</label>
                  <input type="text" value={poProject} onChange={e => setPoProject(e.target.value)} className="flex-1 bg-white border border-slate-300 rounded px-1.5 py-0.5 outline-none font-medium" />
                </div>
              </div>
            </div>
          ) : (
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
                <label className="w-28 text-slate-600 text-right">
                  {mode === 'Order' 
                    ? 'OC / COT' 
                    : mode === 'Delivery'
                    ? 'Guía / Referencia'
                    : 'Referencia'}
                </label>
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
                    <option value={mode === 'Order' ? 'Ped.Nac' : mode === 'Delivery' ? 'Ent-Nal' : 'Cot-Nal'}>
                      {mode === 'Order' ? 'Ped.Nac' : mode === 'Delivery' ? 'Ent-Nal' : 'Cot-Nal'}
                    </option>
                    <option value={mode === 'Order' ? 'Ped.Exp' : mode === 'Delivery' ? 'Ent-Exp' : 'Cot-Exp'}>
                      {mode === 'Order' ? 'Ped.Exp' : mode === 'Delivery' ? 'Ent-Exp' : 'Cot-Exp'}
                    </option>
                  </select>
                  <div className="relative flex items-center">
                    <input 
                      type="text"
                      placeholder="DocNum..."
                      value={docNum}
                      onChange={e => {
                        setDocNum(e.target.value);
                        setOrdenVenta(e.target.value);
                      }}
                      onKeyDown={e => { if (e.key === 'Enter') handleSearchSapDocument(e.currentTarget.value); }}
                      className="w-32 bg-[#FFFDE7] border border-amber-400 font-bold rounded pl-1.5 pr-6 py-0.5 outline-none text-right text-slate-900 focus:ring-2 focus:ring-amber-500 text-xs shadow-inner"
                    />
                    <button
                      onClick={() => handleSearchSapDocument(docNum)}
                      className="absolute right-1 text-slate-600 hover:text-amber-700 font-bold text-xs p-0.5 cursor-pointer hover:scale-110 transition-transform"
                      title="Consultar Documento en SAP B1"
                    >
                      🔍
                    </button>
                  </div>
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
                <label className="w-36 text-slate-600 text-right">
                  {mode === 'Order' 
                    ? 'Fecha Plan Despacho' 
                    : mode === 'Delivery'
                    ? 'Fecha de Entrega'
                    : 'Válido hasta'}
                </label>
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
          )}

          {/* ── Tabs Container ───────────────────────────────────────────────── */}
          <div className="flex-1 flex flex-col bg-white">
            
            {/* Tab Headers */}
            <div className="flex items-center bg-[#E2E8F0] border-b border-slate-300 px-2 pt-1 gap-1 text-xs">
              {mode === 'ProductionOrder' ? (
                <>
                  <button
                    onClick={() => setActiveTab('componentes')}
                    className={`px-4 py-1 rounded-t border-t-2 font-bold transition-all ${
                      activeTab === 'componentes' || activeTab === 'contenido'
                        ? 'bg-white border-t-amber-500 border-x border-slate-300 text-slate-800'
                        : 'bg-slate-200 border-t-transparent hover:bg-slate-100 text-slate-600'
                    }`}
                  >
                    Componentes
                  </button>
                  <button
                    onClick={() => setActiveTab('resumen')}
                    className={`px-4 py-1 rounded-t border-t-2 font-bold transition-all ${
                      activeTab === 'resumen'
                        ? 'bg-white border-t-amber-500 border-x border-slate-300 text-slate-800'
                        : 'bg-slate-200 border-t-transparent hover:bg-slate-100 text-slate-600'
                    }`}
                  >
                    Resumen
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
                </>
              ) : (
                <>
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
                    onClick={() => setActiveTab('anexos')}
                    className={`px-4 py-1 rounded-t border-t-2 font-bold transition-all ${
                      activeTab === 'anexos'
                        ? 'bg-white border-t-amber-500 border-x border-slate-300 text-slate-800'
                        : 'bg-slate-200 border-t-transparent hover:bg-slate-100 text-slate-600'
                    }`}
                  >
                    Anexos
                  </button>
                </>
              )}
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

            {/* Tab 3: Anexos */}
            {activeTab === 'anexos' && (
              <div className="p-6 text-center text-slate-500 bg-slate-50 flex-1 flex flex-col items-center justify-center border-t border-slate-200">
                <Package className="w-8 h-8 text-slate-400 mb-2" />
                <p className="font-bold">Anexos y Documentos Adjuntos</p>
                <p className="text-xs">Arrastre o seleccione archivos PDF, planos técnicos o cotizaciones asociadas.</p>
              </div>
            )}

          </div>

          {/* ── Footer Section: Employee & Totals ────────────────────────────── */}
          {mode === 'ProductionOrder' ? (
            <div className="p-3 bg-[#F1F5F9] border-t border-slate-300 flex flex-col gap-3 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Left Footer */}
                <div className="flex items-start gap-2">
                  <label className="w-32 text-slate-600 text-right font-medium pt-1">Comentarios</label>
                  <textarea 
                    value={comments}
                    onChange={e => setComments(e.target.value)}
                    rows={2}
                    placeholder="Comentarios de producción..."
                    className="flex-1 bg-white border border-slate-300 rounded p-1.5 outline-none font-sans text-xs text-slate-800 leading-relaxed resize-none focus:ring-2 focus:ring-brand/20"
                  />
                </div>

                {/* Right Footer */}
                <div className="flex items-start gap-2">
                  <label className="w-44 text-slate-600 text-right font-medium pt-1">Observaciones sobre empaque</label>
                  <textarea 
                    value={pickRemarks}
                    onChange={e => setPickRemarks(e.target.value)}
                    rows={2}
                    placeholder="Observaciones de empaque..."
                    className="flex-1 bg-white border border-slate-300 rounded p-1.5 outline-none font-sans text-xs text-slate-800 leading-relaxed resize-none focus:ring-2 focus:ring-brand/20"
                  />
                </div>
              </div>

              {/* SAP Action Buttons (Crear / Cancelar) */}
              <div className="flex items-center gap-2 pt-1">
                <button 
                  onClick={handleCreateDocument}
                  className="px-5 py-1 bg-gradient-to-b from-[#FAD961] to-[#F76B1C] hover:from-[#facc15] hover:to-[#ea580c] text-slate-950 font-bold rounded border border-amber-600 shadow-sm cursor-pointer"
                >
                  Crear
                </button>
                <button 
                  onClick={() => {
                    setDocNum('');
                    setProductNo('');
                    setProductDescription('');
                    setRows([]);
                  }}
                  className="px-4 py-1 bg-gradient-to-b from-slate-200 to-slate-300 hover:bg-slate-300 text-slate-800 font-bold rounded border border-slate-400 shadow-sm cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-[#F1F5F9] border-t border-slate-300 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            
            {/* Left Footer */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <label className="w-32 text-slate-600 text-right font-medium">
                  {mode === 'Invoice' ? 'Empleado dpto.ventas' : 'Empleado de ventas'}
                </label>
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

              {mode === 'Invoice' && (
                <div className="flex items-center justify-end gap-2">
                  <button className="px-1.5 py-0.5 bg-slate-200 hover:bg-slate-300 rounded text-[10px] font-bold text-slate-700 border border-slate-300 cursor-pointer">...</button>
                  <span className="text-slate-600">Anticipo total</span>
                  <input 
                    type="text" 
                    value={anticipoTotal} 
                    onChange={e => setAnticipoTotal(e.target.value)} 
                    className="w-36 bg-white border border-slate-300 rounded px-1.5 py-0.5 text-right outline-none font-bold text-slate-800"
                  />
                </div>
              )}

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
          )}

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
          {Boolean(cardCode && cardCode.trim() && docNum && docNum.trim()) ? (
            <>
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
            </>
          ) : (
            <>
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
            </>
          )}
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

      {/* ── Modal: Mapa de Relaciones SAP (Nativo 1-a-1 SAP B1) ────────────────────── */}
      {isMapaRelacionesModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-[#E2E8F0] rounded shadow-2xl border border-slate-400 w-full max-w-5xl overflow-hidden animate-in fade-in zoom-in-95 flex flex-col max-h-[92vh]">
            
            {/* Title Bar */}
            <div className="bg-gradient-to-r from-[#475569] to-[#334155] text-white px-3 py-1.5 font-bold text-xs flex justify-between items-center shadow-sm">
              <span>Mapa de relaciones</span>
              <div className="flex items-center gap-2">
                <span className="cursor-pointer hover:opacity-100 opacity-80">_</span>
                <span className="cursor-pointer hover:opacity-100 opacity-80">□</span>
                <button onClick={() => setIsMapaRelacionesModalOpen(false)} className="hover:text-amber-300 font-bold ml-1">✕</button>
              </div>
            </div>

            {/* Main Graph View Canvas */}
            <div className="p-6 bg-white flex-1 overflow-auto relative min-h-[440px] text-[11px] font-sans">
              
              {/* Top Left: Socios de negocios Card */}
              <div className="absolute top-4 left-4 w-44 border border-slate-400 rounded-sm bg-white shadow-md z-10">
                <div className="bg-[#8FB0D8] text-slate-900 px-2 py-0.5 font-bold text-xs border-b border-slate-300 flex items-center justify-between">
                  <span>Socios de negocios</span>
                </div>
                <div className="p-2 space-y-0.5 text-[10px] text-slate-800">
                  <p className="font-bold">{cardCode || 'CN280239-01'}</p>
                  <p className="truncate text-slate-600">{cardName || 'MARCELINO DE FREITA...'}</p>
                </div>
              </div>

              {/* Dynamic Tree Flow Container */}
              {(() => {
                const currentDoc = docNum || ordenVenta || '162517';
                
                // Determine document data based on active document
                let qNum = '5795';
                let qDate = '28/08/2026';
                let qTotal = '4370250.90';

                let poNum = '10073750';
                let poItem = rows[0]?.itemCode && rows[0]?.itemCode !== 'Escriba código...' ? rows[0].itemCode : 'VBAN05-0051-000-0439';
                let poStatus = 'Planif.';
                let poDate = '07/09/2026';

                let soNum = currentDoc;
                let soDate = postingDate ? postingDate.split('-').reverse().join('/') : '29/08/2026';
                let soTotal = subtotalRows > 0 ? (subtotalRows * 1.19) : 4382656.95;

                let hasDel = false;
                let delNum = '91279';
                let delDate = '31/08/2026';
                let delTotal = '4382656.95';

                let hasInv = false;
                let invNum = '156832';
                let invDate = '31/08/2026';
                let invTotal = '4382656.95';

                // Specific SAP B1 Document Relationship Chains
                if (currentDoc === '162517') {
                  qNum = '5797';
                  qDate = '28/08/2026';
                  qTotal = '2552900.00';

                  poNum = '10073751';
                  poItem = 'VBAN12-0011-000-0437';
                  poStatus = 'Liberado';
                  poDate = '04/09/2026';

                  soNum = '162517';
                  soDate = '29/08/2026';
                  soTotal = 2552900.00;

                  hasDel = false;
                  hasInv = false;
                } else if (currentDoc === '162516') {
                  qNum = '5795';
                  qDate = '28/08/2026';
                  qTotal = '4370250.90';

                  poNum = '10073750';
                  poItem = 'VBAN05-0051-000-0439';
                  poStatus = 'Planif.';
                  poDate = '07/09/2026';

                  soNum = '162516';
                  soDate = '29/08/2026';
                  soTotal = 4382656.95;

                  hasDel = true;
                  delNum = '91279';
                  delDate = '31/08/2026';
                  delTotal = '4382656.95';

                  hasInv = true;
                  invNum = '156832';
                  invDate = '31/08/2026';
                  invTotal = '4382656.95';
                } else if (currentDoc === '91277' || currentDoc === '156830' || currentDoc === '162361' || comments.includes('5730')) {
                  qNum = '5730';
                  qDate = '25/08/2026';
                  qTotal = '5475860.21';

                  poNum = '10073748';
                  poItem = 'VROP01-0019-000-0100';
                  poStatus = 'Liberado';
                  poDate = '28/08/2026';

                  soNum = '162361';
                  soDate = '26/08/2026';
                  soTotal = 5475860.21;

                  hasDel = true;
                  delNum = '91277';
                  delDate = '31/08/2026';
                  delTotal = '5475860.21';

                  hasInv = mode === 'Invoice' || currentDoc === '156830';
                  invNum = '156830';
                  invDate = '31/08/2026';
                  invTotal = '5475860.21';
                } else if (currentDoc === '162561' || comments.includes('5800')) {
                  qNum = '5800';
                  qDate = '31/08/2026';
                  qTotal = '3814033.30';

                  poNum = '10073752';
                  poItem = 'VBAN05-0051-000-0439';
                  poStatus = 'Planif.';
                  poDate = '08/09/2026';

                  soNum = '162561';
                  soDate = '31/08/2026';
                  soTotal = 3814033.30;

                  hasDel = false;
                  hasInv = false;
                } else if (mode === 'Delivery') {
                  hasDel = true;
                  delNum = currentDoc;
                } else if (mode === 'Invoice') {
                  hasDel = true;
                  hasInv = true;
                  invNum = currentDoc;
                }

                const totalNodes = 3 + (hasDel ? 1 : 0) + (hasInv ? 1 : 0);

                return (
                  <div className="pt-16 pb-4 flex items-center justify-center min-w-[750px]">
                    <div className={`grid ${
                      totalNodes === 3 ? 'grid-cols-3 max-w-2xl gap-10' : totalNodes === 4 ? 'grid-cols-4 max-w-3xl gap-8' : 'grid-cols-5 max-w-4xl gap-6'
                    } items-center relative w-full px-4`}>
                      
                      {/* SVG Connecting Arrows overlay */}
                      <svg className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-visible">
                        <defs>
                          <marker id="sap-arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                            <path d="M 0 0 L 10 5 L 0 10 z" fill="#64748B" />
                          </marker>
                        </defs>
                        
                        {/* Arrow 1: Oferta -> Orden de Fabricacion */}
                        <line x1={totalNodes === 3 ? "28%" : totalNodes === 4 ? "20%" : "18%"} y1="50%" x2={totalNodes === 3 ? "37%" : totalNodes === 4 ? "27%" : "23%"} y2="50%" stroke="#64748B" strokeWidth="2" markerEnd="url(#sap-arrow)" />
                        
                        {/* Arrow 2: Orden de Fabricación <-> Orden de Venta */}
                        <line x1={totalNodes === 3 ? "62%" : totalNodes === 4 ? "47%" : "38%"} y1="50%" x2={totalNodes === 3 ? "71%" : totalNodes === 4 ? "54%" : "43%"} y2="50%" stroke="#EAB308" strokeWidth="2.5" markerEnd="url(#sap-arrow)" />
                        
                        {/* Arrow 3: Orden de Venta -> Entrega */}
                        {hasDel && (
                          <line x1={totalNodes === 4 ? "74%" : "58%"} y1="50%" x2={totalNodes === 4 ? "81%" : "63%"} y2="50%" stroke="#64748B" strokeWidth="2" markerEnd="url(#sap-arrow)" />
                        )}
                        
                        {/* Arrow 4: Entrega -> Factura */}
                        {hasInv && (
                          <line x1="78%" y1="50%" x2="83%" y2="50%" stroke="#64748B" strokeWidth="2" markerEnd="url(#sap-arrow)" />
                        )}
                      </svg>

                      {/* Column 1: Oferta de ventas */}
                      <div className="z-10 flex flex-col items-center">
                        <div className={`w-40 border rounded-sm bg-white shadow-md relative ${
                          mode === 'Quotation' ? 'border-amber-400 ring-4 ring-amber-400/50 shadow-amber-200/50' : 'border-slate-400'
                        }`}>
                          <div className={`${mode === 'Quotation' ? 'bg-[#F0C050]' : 'bg-[#8FB0D8]'} text-slate-900 px-2 py-0.5 font-bold text-xs border-b border-slate-300 flex items-center justify-between`}>
                            <span>Oferta de ventas</span>
                            <span className="text-[10px]" title="Cerrado">🔒</span>
                          </div>
                          <div className="p-2 space-y-1 text-[10px] text-slate-800 text-right">
                            <p className="font-bold text-slate-900">{mode === 'Quotation' ? (docNum || qNum) : qNum}</p>
                            <p className="text-[10px] text-slate-600">{qDate}</p>
                            <p className="font-bold text-slate-900">{formatMoney(Number(qTotal))}</p>
                          </div>
                        </div>
                      </div>

                      {/* Column 2: Orden de fabricación */}
                      <div className="z-10 flex flex-col items-center">
                        <div className={`w-40 border rounded-sm bg-white shadow-md relative ${
                          mode === 'ProductionOrder' ? 'border-amber-400 ring-4 ring-amber-400/50 shadow-amber-200/50' : 'border-slate-400'
                        }`}>
                          <div className={`${mode === 'ProductionOrder' ? 'bg-[#F0C050]' : 'bg-[#8FB0D8]'} text-slate-900 px-2 py-0.5 font-bold text-xs border-b border-slate-300 flex items-center justify-between`}>
                            <span>Orden de fabricación</span>
                          </div>
                          <div className="p-2 space-y-0.5 text-[10px] text-slate-800 text-right">
                            <p className="font-bold text-slate-900">{poNum}</p>
                            <p className="text-[9px] text-slate-600 truncate">{poItem}</p>
                            <p className="text-[9px] text-slate-600">Estándar</p>
                            <p className="text-[9px] text-slate-600">{poStatus}</p>
                            <p className="text-[9px] text-slate-500">{poDate}</p>
                          </div>
                        </div>
                      </div>

                      {/* Column 3: Orden de venta (ACTIVE Node Highlight if in Order mode or default) */}
                      <div className="z-10 flex flex-col items-center">
                        <div className={`w-40 border-2 rounded-sm bg-white shadow-xl relative ${
                          mode === 'Order' || (!hasDel && !hasInv) ? 'border-amber-400 ring-4 ring-amber-400/50 shadow-amber-200/50' : 'border-slate-400'
                        }`}>
                          <div className={`${mode === 'Order' || (!hasDel && !hasInv) ? 'bg-[#F0C050]' : 'bg-[#8FB0D8]'} text-slate-900 px-2 py-0.5 font-bold text-xs border-b border-amber-300 flex items-center justify-between`}>
                            <span>Orden de venta</span>
                            <span className="text-[10px]" title="Cerrado">🔒</span>
                          </div>
                          <div className="p-2 space-y-1 text-[10px] text-slate-800 text-right bg-amber-50/10">
                            <p className="font-bold text-slate-900">{soNum}</p>
                            <p className="text-[10px] text-slate-600">{soDate}</p>
                            <p className="font-bold text-slate-900">{formatMoney(soTotal)}</p>
                          </div>
                        </div>
                      </div>

                      {/* Column 4: Entrega (Optional) */}
                      {hasDel && (
                        <div className="z-10 flex flex-col items-center">
                          <div className={`w-40 border rounded-sm bg-white shadow-md relative ${
                            mode === 'Delivery' ? 'border-amber-400 ring-4 ring-amber-400/50 shadow-amber-200/50' : 'border-slate-400'
                          }`}>
                            <div className={`${mode === 'Delivery' ? 'bg-[#F0C050]' : 'bg-[#8FB0D8]'} text-slate-900 px-2 py-0.5 font-bold text-xs border-b border-slate-300 flex items-center justify-between`}>
                              <span>Entrega</span>
                              <div className="flex items-center gap-1 text-[9px]">
                                <span>🖨️</span>
                                <span>🔒</span>
                              </div>
                            </div>
                            <div className="p-2 space-y-1 text-[10px] text-slate-800 text-right">
                              <p className="font-bold text-slate-900">{delNum}</p>
                              <p className="text-[10px] text-slate-600">{delDate}</p>
                              <p className="font-bold text-slate-900">{formatMoney(Number(delTotal))}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Column 5: Factura de deudores (Optional) */}
                      {hasInv && (
                        <div className="z-10 flex flex-col items-center">
                          <div className={`w-40 border rounded-sm bg-white shadow-md relative overflow-hidden ${
                            mode === 'Invoice' ? 'border-amber-400 ring-4 ring-amber-400/50 shadow-amber-200/50' : 'border-slate-400'
                          }`}>
                            <div className={`${mode === 'Invoice' ? 'bg-[#F0C050]' : 'bg-[#8FB0D8]'} text-slate-900 px-2 py-0.5 font-bold text-xs border-b border-slate-300 flex items-center justify-between`}>
                              <span>Factura de deudores</span>
                              <div className="flex items-center gap-1 text-[9px]">
                                <span>💰</span>
                                <span>🔒</span>
                              </div>
                            </div>
                            <div className="p-2 space-y-1 text-[10px] text-slate-800 text-right">
                              <p className="font-bold text-slate-900">{invNum}</p>
                              <p className="text-[10px] text-slate-600">{invDate}</p>
                              <p className="font-bold text-slate-900">{formatMoney(Number(invTotal))}</p>
                            </div>
                            <div className="h-1.5 bg-[#F0C050] w-full"></div>
                          </div>
                        </div>
                      )}

                    </div>
                  </div>
                );
              })()}

            </div>

            {/* SAP Bottom Control Bar */}
            <div className="p-2 bg-[#F1F5F9] border-t border-slate-300 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <select className="bg-white border border-slate-300 rounded px-2 py-0.5 outline-none font-medium text-slate-700 text-xs">
                  <option>Documento de marketing: árbol de documentos</option>
                  <option>Detalles de cuenta</option>
                  <option>Documentos de referencia</option>
                </select>
                <label className="flex items-center gap-1.5 text-slate-700 cursor-pointer">
                  <input type="checkbox" className="rounded text-brand" />
                  <span>Documentos de referencia</span>
                </label>
              </div>

              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsMapaRelacionesModalOpen(false)}
                  className="px-6 py-1 bg-[#F0C050] hover:bg-amber-400 text-slate-900 font-bold rounded border border-amber-600 shadow-xs"
                >
                  OK
                </button>
                <button 
                  disabled 
                  className="px-4 py-1 bg-slate-200 text-slate-400 font-semibold rounded border border-slate-300 cursor-not-allowed"
                >
                  Volver
                </button>
                <button 
                  disabled 
                  className="px-4 py-1 bg-slate-200 text-slate-400 font-semibold rounded border border-slate-300 cursor-not-allowed"
                >
                  Ir adelante
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
