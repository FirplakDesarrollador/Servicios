'use client';

import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Search, Printer, FileSpreadsheet, FileText, Download, 
  Lock, RefreshCw, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Plus, Trash2, ChevronUp, ChevronDown, Check, X, HelpCircle, User,
  Building, Calendar, DollarSign, Package, AlertCircle, Eye, Info,
  Receipt, Factory, ClipboardList, Truck, Maximize2, Minus, GitBranch
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { SAP_DOC_TYPES, type SapRelationshipMap } from '@/lib/sapExplorerTypes';
import MapaRelaciones from './explorer/MapaRelaciones';

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
  treeType?: string;
}

const getRowTextColor = (treeType?: string) => {
  if (treeType === 'i' || treeType === 'S') return 'text-red-600 font-bold';
  if (treeType === 'I') return 'text-stone-500 font-medium italic';
  return 'text-brand-dark font-medium';
};

export default function OfertaDeVenta({ mode: initialMode = 'Quotation', onMinimizeChange, initialDocNum }: { mode?: 'Quotation' | 'ProductionOrder' | 'Order' | 'Delivery' | 'Invoice', onMinimizeChange?: (isMin: boolean) => void, initialDocNum?: string }) {
  const [mode, setMode] = useState<'Quotation' | 'ProductionOrder' | 'Order' | 'Delivery' | 'Invoice'>(initialMode);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  // ── Form State (Initially EMPTY for Consultation) ─────────────────────────────
  // Header Left
  const [cardCode, setCardCode] = useState('');
  const [cardName, setCardName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [refNumber, setRefNumber] = useState('');
  const [currency, setCurrency] = useState('COP');

  // Header Right
  const [docSeries, setDocSeries] = useState('');
  
  useEffect(() => {
    setDocSeries(mode === 'ProductionOrder' ? 'OF-Planta' : mode === 'Order' ? 'Ped.Nac' : mode === 'Delivery' ? 'Ent-Nal' : mode === 'Invoice' ? 'NAL-FEN8' : 'Cot-Nal');
  }, [mode]);
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
  const [fechaRealDespacho, setFechaRealDespacho] = useState('');
  const [fechaAutorizacion, setFechaAutorizacion] = useState('');
  const [numeroGuia, setNumeroGuia] = useState('');
  const [transportador, setTransportador] = useState('');
  const [fechaRealEntregaEnt, setFechaRealEntregaEnt] = useState('');
  const [statusEntrega, setStatusEntrega] = useState('Entregada');
  const [fechaRetPOD, setFechaRetPOD] = useState('');
  const [pof, setPof] = useState('');
  const [fechaPlaneadaEntregaCliente, setFechaPlaneadaEntregaCliente] = useState('');

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
  const [numLote, setNumLote] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [poCompletedQty, setPoCompletedQty] = useState('');
  const [poRejectedQty, setPoRejectedQty] = useState('');
  const [poClosingDate, setPoClosingDate] = useState('');
  const [poJournalRemarks, setPoJournalRemarks] = useState('');

  // Tabs
  const [activeTab, setActiveTab] = useState<'contenido' | 'logistica' | 'anexos' | 'componentes' | 'resumen'>(mode === 'ProductionOrder' ? 'componentes' : 'contenido');
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
  const [relationshipMap, setRelationshipMap] = useState<SapRelationshipMap | null>(null);
  const [isLoadingMap, setIsLoadingMap] = useState(false);
  const [isDocumentViewerOpen, setIsDocumentViewerOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    if (onMinimizeChange) {
      onMinimizeChange(isMinimized);
    }
  }, [isMinimized, onMinimizeChange]);

  // Fetch dynamic relationship map from SAP Service Layer
  useEffect(() => {
    if (isMapaRelacionesModalOpen) {
      const fetchMap = async () => {
        setIsLoadingMap(true);
        try {
          setRelationshipMap(null);
          const res = await fetch(`/api/sap/relationship-map?docNum=${encodeURIComponent(docNum)}&type=${mode}`);
          const data = await res.json();
          setRelationshipMap(res.ok && Array.isArray(data.nodes) ? data : null);
        } catch (error) {
          console.error("Failed to fetch relationship map:", error);
          setRelationshipMap(null);
        } finally {
          setIsLoadingMap(false);
        }
      };
      fetchMap();
    }
  }, [isMapaRelacionesModalOpen, docNum, mode]);

  // Modals & Search State
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  
  const [isDocListModalOpen, setIsDocListModalOpen] = useState(false);
  const [docListResults, setDocListResults] = useState<any[]>([]);
  const [isDocListLoading, setIsDocListLoading] = useState(false);
  
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
  // Abrir directamente un documento (p. ej. desde el Explorador SAP)
  useEffect(() => {
    if (initialDocNum) {
      setDocNum(initialDocNum);
      handleSearchSapDocument(initialDocNum, initialMode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialDocNum, initialMode]);

  const navigateToDocument = (targetDocNum: string, targetMode: 'Quotation' | 'ProductionOrder' | 'Order' | 'Delivery' | 'Invoice') => {
    setIsMapaRelacionesModalOpen(false);
    setMode(targetMode);
    setDocNum(targetDocNum);
    handleSearchSapDocument(targetDocNum, targetMode);
  };

  const handleSearchSapDocument = async (queryNum?: string, overrideMode?: string) => {
    const searchTarget = (queryNum || docNum || ordenVenta || '').trim();
    if (!searchTarget) {
      setStatusMessage('✖ Ingrese un número de Documento para consultar en SAP Business One.');
      setStatusType('error');
      return;
    }

    const targetMode = overrideMode || mode;

    try {
      setIsLoading(true);
      setStatusMessage(`● Consultando documento Nº ${searchTarget} en SAP Business One Service Layer...`);
      setStatusType('info');

      const res = await fetch(`/api/sap/quotations?docNum=${encodeURIComponent(searchTarget.trim())}&type=${targetMode}`);
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

      setPostingDate(sapDoc.PostingDate ? sapDoc.PostingDate.split('T')[0] : (sapDoc.DocDate ? sapDoc.DocDate.split('T')[0] : ''));
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

      // Delivery specific UDFs
      setTransportador(sapDoc.U_Transportador || '');
      setFechaRealDespacho(sapDoc.U_FechaDespacho ? sapDoc.U_FechaDespacho.split('T')[0] : '');
      setFechaAutorizacion(sapDoc.U_FechaAutorizacion ? sapDoc.U_FechaAutorizacion.split('T')[0] : '');
      setNumeroGuia(sapDoc.U_NoGuia || '');
      setFechaRealEntregaEnt(sapDoc.U_FechaRealEntregaEnt ? sapDoc.U_FechaRealEntregaEnt.split('T')[0] : '');
      
      const stEnt = String(sapDoc.U_StatusEntrega || '').trim();
      setStatusEntrega(stEnt === '7' ? 'Entregada' : stEnt === '6' ? 'En Ruta' : (stEnt || 'Entregada'));
      
      setFechaRetPOD(sapDoc.U_FechaRetPOD ? sapDoc.U_FechaRetPOD.split('T')[0] : '');
      setPof(sapDoc.U_POF || '');
      setFechaPlaneadaEntregaCliente(sapDoc.U_Fecha_Plan_Ent_Cliente ? sapDoc.U_Fecha_Plan_Ent_Cliente.split('T')[0] : '');
      setActualizarBF(sapDoc.U_Actualizar || 'NO');

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
      if (sapDoc.Address2) {
        shipAddrStr = sapDoc.Address2;
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
      if (sapDoc.Address) {
        payAddrStr = sapDoc.Address;
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
        const rawStatus = sapDoc.ProductionOrderStatus || '';
        setProductionOrderStatus(
          rawStatus === 'boposReleased' ? 'Liberado' :
          rawStatus === 'boposClosed' ? 'Cerrado' :
          rawStatus === 'boposCancelled' ? 'Cancelado' :
          'Planif.'
        );
        setProductNo(sapDoc.ItemNo || '');
        setProductDescription(sapDoc.ProductDescription || sapDoc.ItemName || '');
        setPlannedQuantity(String(sapDoc.PlannedQuantity || 1));
        setWarehouse(sapDoc.Warehouse || 'PT-02');
        
        // CustomerCode in OWOR = the linked sales order customer
        const poCustomer = sapDoc.CustomerCode || sapDoc.CardCode || '';
        setBusinessPartner(sapDoc.U_HBT_Tercero || poCustomer);
        setCardCode(poCustomer);

        setStartDate(sapDoc.StartDate ? sapDoc.StartDate.split('T')[0] : '');
        setDueDate(sapDoc.DueDate ? sapDoc.DueDate.split('T')[0] : '');
        
        // Posting date for ProductionOrder is PostingDate in OWOR
        if (sapDoc.PostingDate) setPostingDate(sapDoc.PostingDate.split('T')[0]);
        
        // User signature - use enriched name
        const sigName = sapDoc._UserSignatureName || '';
        setPoUserSignature(sigName || 'Luis Guillermo Escobar');
        
        // Comments
        setComments(sapDoc.Comments || sapDoc.Remarks || '');

        setPoOrigin(
          sapDoc.ProductionOrderOrigin === 'bopooSalesOrder' ? 'Pedido de cliente' :
          sapDoc.ProductionOrderOrigin === 'bopooMrp' ? 'MRP' : 'Manual'
        );
        setPoLinkedTo(
          sapDoc.ProductionOrderOrigin === 'bopooSalesOrder' ? 'Pedido de cliente' : 'Ninguno'
        );
        setPoLinkedOrder(String(sapDoc.ProductionOrderOriginNumber || ''));
        setPickRemarks(sapDoc.PickRemarks || '');
        setNumLote(sapDoc.U_NumLote || sapDoc.U_Lote || sapDoc.BatchNumber || '');
        // Centro de Costos and Project from UDFs
        setCostCenter(sapDoc.U_CentroCosto || sapDoc.U_CostCenter || '');
        setPoProject(sapDoc.Project || sapDoc.U_Proyecto || '');
        setPoCompletedQty(String(sapDoc.CompletedQuantity || ''));
        setPoRejectedQty(String(sapDoc.RejectedQuantity || ''));
        setPoClosingDate(sapDoc.ClosingDate ? sapDoc.ClosingDate.split('T')[0] : '');
        setPoJournalRemarks(sapDoc.JournalRemarks || '');

        if (sapDoc.DocumentNumber) {
          setDocNum(String(sapDoc.DocumentNumber));
        }

        if (sapDoc.ProductionOrderLines && sapDoc.ProductionOrderLines.length > 0) {
          const mappedLines: GridRow[] = sapDoc.ProductionOrderLines.map((line: any, idx: number) => {
            // Calculate ratio base as fraction string e.g. "13/100"
            const baseQty = line.BaseQuantity || 0;
            const plannedQty = sapDoc.PlannedQuantity || 1;
            const reqQty = line.PlannedQuantity || (baseQty * plannedQty);
            // Build ratio string
            let ratioStr = '';
            if (line.Ratio) {
              ratioStr = String(line.Ratio);
            } else if (baseQty > 0 && plannedQty > 0) {
              // Express as fraction by finding GCD-like simplification
              const num = baseQty;
              const den = 1;
              ratioStr = `${baseQty}`;
            }
            return {
              id: String(idx + 1),
              itemCode: line.ItemNo || line.ItemCode || '',
              description: line.ItemName || line.ItemDescription || line.Description || '',
              barCode: ratioStr, // reuse barCode field to store ratio
              quantity: baseQty, // Cantidad base
              unitMsr: 'Artículo', // Tipo
              price: line.IssuedQuantity || 0, // Consumido
              discount: 0,
              taxCode: String(line.UoMCode || ''), // UoM
              total: reqQty, // Ctd. requerida
              whsCode: line.Warehouse || 'PT-02',
              costingCode: String(line.VisualOrder || idx),
              salesEmployee: String(line.StockQuantity || 0), // Disponible
              lineStatus: line.LineStatus === 'bost_Open' || !line.LineStatus ? 'Abierto' : 'Cerrado'
            };
          });
          setRows(mappedLines);
        }
      }

      // Populate Document Lines for non-ProductionOrders
      if (data.document.documentType !== 'ProductionOrder') {
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
            total: (sapDoc.DocCurrency === 'USD') ? (line.RowTotalFC || (line.Quantity * line.UnitPrice)) : (line.LineTotal || (line.Quantity * line.UnitPrice)),
            whsCode: line.WarehouseCode || 'PT-01',
            costingCode: line.CostingCode || line.CostingCode2 || line.CostingCode3 || '',
            salesEmployee: sapDoc._SalesEmployeeName || 'Firplak',
            lineStatus: line.LineStatus === 'bost_Open' || line.LineStatus === 'O' ? 'Abierto' : 'Cerrado',
            treeType: line.TreeType || ''
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
            lineStatus: 'Abierto',
            treeType: ''
          });

          setRows(mappedLines);
        } else {
          setRows([{ id: '1', itemCode: '', description: '', barCode: '', quantity: 1, unitMsr: 'UND', price: 0, discount: 0, taxCode: 'IVA 19%', total: 0, whsCode: 'PT-01', costingCode: '', salesEmployee: sapDoc._SalesEmployeeName || 'Firplak', lineStatus: 'Abierto', treeType: '' }]);
        }
      }

      setHeaderDiscountPct(sapDoc.DiscountPercent || 0);
      
      let expenses = 0;
      if (sapDoc.DocumentAdditionalExpenses && sapDoc.DocumentAdditionalExpenses.length > 0) {
        expenses = sapDoc.DocumentAdditionalExpenses.reduce((sum: number, exp: any) => sum + ((sapDoc.DocCurrency === 'USD') ? (exp.LineTotalFC || exp.LineTotalSys || 0) : (exp.LineTotal || 0)), 0);
      } else {
        expenses = (sapDoc.DocCurrency === 'USD') ? (sapDoc.TotalExpensesFC || sapDoc.TotalExpenses || 0) : (sapDoc.TotalExpenses || 0);
      }
      setAdditionalExpenses(expenses);

      setStatusMessage(`✔ Información de ${data.document.documentType === 'Order' ? 'Orden' : 'Oferta'} de Venta Nº ${sapDoc.DocNum} cargada exitosamente desde SAP B1.`);
      setStatusType('success');
    } catch (err: any) {
      console.error('Error fetching SAP doc:', err);
      setStatusMessage(`✖ Error consultando documento en SAP: ${err.message}`);
      setStatusType('error');
    } finally {
      setIsLoading(false);
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

  const handleCustomerSearchShortcut = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    const target = e.currentTarget;
    if (e.key === 'Enter' || e.key === 'Tab') {
      if (target.value.startsWith('*')) {
        e.preventDefault();
        const query = target.value.substring(1);
        
        setIsDocListLoading(true);
        setIsDocListModalOpen(true);
        try {
          const res = await fetch(`/api/sap/quotations?search=${encodeURIComponent(query)}&type=${mode}`);
          const data = await res.json();
          if (data.success) {
            setDocListResults(data.documents || []);
          } else {
            setDocListResults([]);
          }
        } catch (error) {
          console.error('Error searching docs:', error);
          setDocListResults([]);
        } finally {
          setIsDocListLoading(false);
        }
      }
    }
  };

  // Subtotal & Totals
  const subtotalRows = rows.reduce((sum, r) => sum + (r.total || 0), 0);
  const headerDiscountAmount = subtotalRows * (headerDiscountPct / 100);
  const subtotalAfterDiscount = subtotalRows - headerDiscountAmount;
  
  // Calcular IVA de forma dinámica según el código de impuesto de cada línea
  const vatTaxRows = rows.reduce((sum, r) => {
    if (!r.itemCode) return sum;
    const isExempt = r.taxCode === 'IVAEXE' || r.taxCode === 'EXENTO' || String(r.taxCode).toUpperCase().includes('EXE');
    const is5Percent = r.taxCode === 'IVA 5%';
    const rate = isExempt ? 0 : (is5Percent ? 0.05 : 0.19);
    const rowNet = (r.total || 0) * (1 - (headerDiscountPct / 100));
    return sum + (rowNet * rate);
  }, 0);
  
  // Asumir que los gastos adicionales toman el 19% a menos que todas las líneas sean exentas
  const hasTaxableLines = rows.some(r => r.itemCode && !(r.taxCode === 'IVAEXE' || r.taxCode === 'EXENTO' || String(r.taxCode).toUpperCase().includes('EXE')));
  const vatTaxExpenses = Number(additionalExpenses || 0) * (hasTaxableLines ? 0.19 : 0);
  
  const vatTax = vatTaxRows + vatTaxExpenses;
  const grandTotal = subtotalAfterDiscount + Number(additionalExpenses || 0) + vatTax;

  const formatMoney = (amount: number) => {
    const isUSD = currency === 'USD' || currency === '$';
    return new Intl.NumberFormat(isUSD ? 'en-US' : 'es-CO', {
      style: 'currency',
      currency: isUSD ? 'USD' : 'COP',
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

  const docTitle = mode === 'Invoice' ? 'Factura de deudores' : mode === 'ProductionOrder' ? 'Orden de fabricación' : mode === 'Order' ? 'Orden de venta' : mode === 'Delivery' ? 'Entrega' : 'Oferta de ventas';
  const DocIcon = mode === 'Invoice' ? Receipt : mode === 'ProductionOrder' ? Factory : mode === 'Order' ? ClipboardList : mode === 'Delivery' ? Truck : FileText;

  if (isMinimized) {
    return (
      <div
        className="fixed bottom-4 left-6 bg-white text-brand-dark pl-2 pr-3 py-2 rounded-2xl text-sm font-semibold cursor-pointer shadow-[0_12px_30px_-12px_rgba(37,65,83,0.45)] border border-border flex items-center gap-3 hover:border-brand-light z-50 w-72 transition-all"
        onClick={() => setIsMinimized(false)}
        title="Restaurar"
      >
        <span className="w-8 h-8 rounded-lg bg-brand text-white flex items-center justify-center shrink-0"><DocIcon className="w-4 h-4" /></span>
        <span className="truncate flex-1">{docTitle}{docNum ? ` · ${docNum}` : ''}</span>
        <Maximize2 className="w-4 h-4 text-stone-400" />
      </div>
    );
  }

  return (
    <div className="w-full bg-cream text-brand-dark font-sans select-none min-h-screen relative">
      {isLoading && (
        <div className="absolute inset-0 z-50 flex items-start justify-center pt-40 bg-cream/60 backdrop-blur-[2px]">
          <div className="bg-white px-6 py-5 rounded-2xl shadow-[0_20px_50px_-20px_rgba(37,65,83,0.5)] flex items-center gap-3 border border-border">
            <div className="w-6 h-6 border-[3px] border-border border-t-brand rounded-full animate-spin"></div>
            <p className="text-brand-dark font-medium text-sm">Consultando en SAP…</p>
          </div>
        </div>
      )}
      {/* ── Main Body Split Layout ─────────────────────────────────────────── */}
      <div className="flex gap-4 min-h-[640px]">

        {/* ── Left Sidebar: Campos de usuario (User Fields) ──────────────────── */}
        <div className="w-64 bg-white border border-border rounded-2xl flex flex-col shrink-0 overflow-hidden text-[11px]">
          {/* Header */}
          <div className="px-4 py-3.5 border-b border-border">
            <p className="text-[10px] font-medium tracking-[0.16em] uppercase text-brand-light">Campos de usuario</p>
            <p className="text-sm font-semibold text-brand-dark mt-0.5">{docTitle}</p>
          </div>

          {/* Form Fields */}
          <div className="p-4 space-y-3 overflow-y-auto max-h-[640px]">
            {mode === 'ProductionOrder' ? (
              <>
                <div>
                  <label className="text-stone-500 block mb-0.5 font-medium">Fecha Sugerida Liberacion TOC</label>
                  <input type="date" className="w-full bg-white border border-border rounded-md px-2 py-1 outline-none focus:border-brand-light text-xs" />
                </div>
                <div>
                  <label className="text-stone-500 block mb-0.5 font-medium">Fecha Liberacion Planificacion</label>
                  <input type="date" className="w-full bg-white border border-border rounded-md px-2 py-1 outline-none focus:border-brand-light text-xs" />
                </div>
                <div>
                  <label className="text-stone-500 block mb-0.5 font-medium">Fecha Requisión</label>
                  <input type="date" className="w-full bg-white border border-border rounded-md px-2 py-1 outline-none focus:border-brand-light text-xs" />
                </div>
                <div>
                  <label className="text-stone-500 block mb-0.5 font-medium">Fecha Real Liberacion</label>
                  <input type="date" className="w-full bg-white border border-border rounded-md px-2 py-1 outline-none focus:border-brand-light text-xs" />
                </div>
                <div>
                  <label className="text-stone-500 block mb-0.5 font-medium">Num. Lote</label>
                  <input type="text" value={numLote} onChange={e => setNumLote(e.target.value)} className="w-full bg-white border border-border rounded-md px-2 py-1 outline-none focus:border-brand-light text-xs font-semibold text-brand-dark" />
                </div>
                <div>
                  <label className="text-stone-500 block mb-0.5 font-medium">Tipo de Orden</label>
                  <select className="w-full bg-white border border-border rounded-md px-2 py-1 outline-none focus:border-brand-light text-xs">
                    <option value="STANDARD">STANDARD</option>
                    <option value="SPECIAL">SPECIAL</option>
                  </select>
                </div>
                <div>
                  <label className="text-stone-500 block mb-0.5 font-medium">Socio de negocio</label>
                  <input type="text" value={businessPartner || cardCode} onChange={e => setBusinessPartner(e.target.value)} className="w-full bg-white border border-border rounded-md px-2 py-1 outline-none focus:border-brand-light text-xs font-semibold text-brand-dark" />
                </div>
                <div>
                  <label className="text-stone-500 block mb-0.5 font-medium">Fecha de finalización (desatraso)</label>
                  <input type="date" className="w-full bg-white border border-border rounded-md px-2 py-1 outline-none focus:border-brand-light text-xs" />
                </div>
                <div>
                  <label className="text-stone-500 block mb-0.5 font-medium">Razón de retraso 2</label>
                  <select className="w-full bg-white border border-border rounded-md px-2 py-1 outline-none focus:border-brand-light text-xs"><option value=""></option></select>
                </div>
                <div>
                  <label className="text-stone-500 block mb-0.5 font-medium">Fecha de finalización (desatraso) 2</label>
                  <input type="date" className="w-full bg-white border border-border rounded-md px-2 py-1 outline-none focus:border-brand-light text-xs" />
                </div>
                <div>
                  <label className="text-stone-500 block mb-0.5 font-medium">Razón de retraso</label>
                  <select className="w-full bg-white border border-border rounded-md px-2 py-1 outline-none focus:border-brand-light text-xs"><option value=""></option></select>
                </div>
                <div>
                  <label className="text-stone-500 block mb-0.5 font-medium">Orden de Compra</label>
                  <input type="text" className="w-full bg-white border border-border rounded-md px-2 py-1 outline-none focus:border-brand-light text-xs" />
                </div>
              </>
            ) : mode === 'Invoice' ? (
              <>
                <div>
                  <label className="text-stone-500 block mb-0.5">Tiene Autorretención</label>
                  <select className="w-full bg-white border border-border rounded-md px-2 py-1 outline-none focus:border-brand-light text-xs"><option value="No">No</option><option value="Si">Si</option></select>
                </div>
                <div>
                  <label className="text-stone-500 block mb-0.5">BPCOST</label>
                  <input type="text" className="w-full bg-white border border-border rounded-md px-2 py-1 outline-none focus:border-brand-light" />
                </div>
                <div>
                  <label className="text-stone-500 block mb-0.5">WUID</label>
                  <input type="text" className="w-full bg-white border border-border rounded-md px-2 py-1 outline-none focus:border-brand-light" />
                </div>
                <div>
                  <label className="text-stone-500 block mb-0.5">Tipo de Nota</label>
                  <select className="w-full bg-white border border-border rounded-md px-2 py-1 outline-none focus:border-brand-light text-xs"><option value=""></option></select>
                </div>
                <div>
                  <label className="text-stone-500 block mb-0.5">Codigo de DifCambio</label>
                  <select className="w-full bg-white border border-border rounded-md px-2 py-1 outline-none focus:border-brand-light text-xs"><option value=""></option></select>
                </div>
                <div>
                  <label className="text-stone-500 block mb-0.5">IVA x Muestras pagado</label>
                  <select className="w-full bg-white border border-border rounded-md px-2 py-1 outline-none focus:border-brand-light text-xs"><option value="No">No</option><option value="Si">Si</option></select>
                </div>
                <div>
                  <label className="text-stone-500 block mb-0.5">Tiene Retefuente</label>
                  <select className="w-full bg-white border border-border rounded-md px-2 py-1 outline-none focus:border-brand-light text-xs"><option value="No">No</option><option value="Si">Si</option></select>
                </div>
                <div>
                  <label className="text-stone-500 block mb-0.5">Tiene ReteICA</label>
                  <select className="w-full bg-white border border-border rounded-md px-2 py-1 outline-none focus:border-brand-light text-xs"><option value="No">No</option><option value="Si">Si</option></select>
                </div>
                <div>
                  <label className="text-stone-500 block mb-0.5">Incoterm</label>
                  <select className="w-full bg-white border border-border rounded-md px-2 py-1 outline-none focus:border-brand-light text-xs"><option value=""></option></select>
                </div>
                <div>
                  <label className="text-stone-500 block mb-0.5">Fecha Real de Despacho</label>
                  <input type="date" className="w-full bg-white border border-border rounded px-1 py-0.5 outline-none text-xs" />
                </div>
                <div>
                  <label className="text-stone-500 block mb-0.5">Puerto Destino</label>
                  <select className="w-full bg-white border border-border rounded-md px-2 py-1 outline-none focus:border-brand-light text-xs"><option value=""></option></select>
                </div>
                <div>
                  <label className="text-stone-500 block mb-0.5">Medio de transporte</label>
                  <select className="w-full bg-white border border-border rounded-md px-2 py-1 outline-none focus:border-brand-light text-xs"><option value=""></option></select>
                </div>
                <div>
                  <label className="text-stone-500 block mb-0.5">Fecha salida del Puerto</label>
                  <input type="date" className="w-full bg-white border border-border rounded px-1 py-0.5 outline-none text-xs" />
                </div>
                <div>
                  <label className="text-stone-500 block mb-0.5">Fecha llegada de documentos</label>
                  <input type="date" className="w-full bg-white border border-border rounded px-1 py-0.5 outline-none text-xs" />
                </div>
                <div>
                  <label className="text-stone-500 block mb-0.5">Fecha llegada al puerto destin</label>
                  <input type="date" className="w-full bg-white border border-border rounded px-1 py-0.5 outline-none text-xs" />
                </div>
                <div>
                  <label className="text-stone-500 block mb-0.5">Fecha d Pre inspección</label>
                  <input type="date" className="w-full bg-white border border-border rounded px-1 py-0.5 outline-none text-xs" />
                </div>
                <div>
                  <label className="text-stone-500 block mb-0.5">Fecha Pago Anticipo</label>
                  <input type="date" className="w-full bg-white border border-border rounded px-1 py-0.5 outline-none text-xs" />
                </div>
                <div>
                  <label className="text-stone-500 block mb-0.5">Fecha de levante</label>
                  <input type="date" className="w-full bg-white border border-border rounded px-1 py-0.5 outline-none text-xs" />
                </div>
                <div>
                  <label className="text-stone-500 block mb-0.5">Fecha de llegada a Firplak</label>
                  <input type="date" className="w-full bg-white border border-border rounded px-1 py-0.5 outline-none text-xs" />
                </div>
                <div>
                  <label className="text-stone-500 block mb-0.5">Plan Vallejo</label>
                  <select className="w-full bg-white border border-border rounded-md px-2 py-1 outline-none focus:border-brand-light text-xs"><option value=""></option></select>
                </div>
                <div>
                  <label className="text-stone-500 block mb-0.5">Importación Fraccionada</label>
                  <select className="w-full bg-white border border-border rounded-md px-2 py-1 outline-none focus:border-brand-light text-xs"><option value=""></option></select>
                </div>
                <div>
                  <label className="text-stone-500 block mb-0.5">Servicio (Calificación)</label>
                  <select className="w-full bg-white border border-border rounded-md px-2 py-1 outline-none focus:border-brand-light text-xs"><option value=""></option></select>
                </div>
                <div>
                  <label className="text-stone-500 block mb-0.5">Calidad (Calificación)</label>
                  <select className="w-full bg-white border border-border rounded-md px-2 py-1 outline-none focus:border-brand-light text-xs"><option value=""></option></select>
                </div>
                <div>
                  <label className="text-stone-500 block mb-0.5">Cantidad (calificación)</label>
                  <select className="w-full bg-white border border-border rounded-md px-2 py-1 outline-none focus:border-brand-light text-xs"><option value=""></option></select>
                </div>
                <div>
                  <label className="text-stone-500 block mb-0.5">Cumplimiento (Calificación)</label>
                  <select className="w-full bg-white border border-border rounded-md px-2 py-1 outline-none focus:border-brand-light text-xs"><option value=""></option></select>
                </div>
                <div>
                  <label className="text-stone-500 block mb-0.5">Tipo de devolucion NC</label>
                  <select className="w-full bg-white border border-border rounded-md px-2 py-1 outline-none focus:border-brand-light text-xs"><option value=""></option></select>
                </div>
                <div>
                  <label className="text-stone-500 block mb-0.5 font-medium">Validación E almacén vs Factur</label>
                  <select value={validativeEAlmacen} onChange={e => setValidativeEAlmacen(e.target.value)} className="w-full bg-white border border-border rounded-md px-2 py-1 outline-none focus:border-brand-light text-xs">
                    <option value="No requiere Autorizacion">No requiere Autorizacion</option>
                    <option value="Requiere Autorizacion">Requiere Autorizacion</option>
                  </select>
                </div>
                <div>
                  <label className="text-stone-500 block mb-0.5">QRObservac</label>
                  <input type="text" className="w-full bg-white border border-border rounded-md px-2 py-1 outline-none focus:border-brand-light" />
                </div>
                <div>
                  <label className="text-stone-500 block mb-0.5">Codigo del vendedor Junior</label>
                  <input type="text" className="w-full bg-white border border-border rounded-md px-2 py-1 outline-none focus:border-brand-light" />
                </div>
                <div>
                  <label className="text-stone-500 block mb-0.5">Autorizacion de descuentos</label>
                  <select className="w-full bg-white border border-border rounded-md px-2 py-1 outline-none focus:border-brand-light text-xs"><option value=""></option></select>
                </div>
                <div>
                  <label className="text-stone-500 block mb-0.5">Lugar de entrega</label>
                  <input type="text" className="w-full bg-white border border-border rounded-md px-2 py-1 outline-none focus:border-brand-light" />
                </div>
                <div>
                  <label className="text-stone-500 block mb-0.5">Fecha esperada de entrega</label>
                  <input type="date" className="w-full bg-white border border-border rounded px-1 py-0.5 outline-none text-xs" />
                </div>
              </>
            ) : mode === 'Delivery' ? (
              <>
                <div>
                  <label className="text-stone-500 block mb-0.5">Fecha Real de Despacho</label>
                  <input type="date" value={fechaRealDespacho} onChange={e => setFechaRealDespacho(e.target.value)} className="w-full bg-white border border-border rounded px-1 py-0.5 outline-none text-xs" />
                </div>
                <div>
                  <label className="text-stone-500 block mb-0.5">Numero de guia</label>
                  <textarea rows={3} value={numeroGuia} onChange={e => setNumeroGuia(e.target.value)} className="w-full bg-white border border-border rounded px-1.5 py-1 outline-none text-xs resize-none" />
                </div>
                <div>
                  <label className="text-stone-500 block mb-0.5">Transportador</label>
                  <input type="text" value={transportador} onChange={e => setTransportador(e.target.value)} className="w-full bg-white border border-border rounded-md px-2 py-1 outline-none focus:border-brand-light" />
                </div>
                <div>
                  <label className="text-stone-500 block mb-0.5">Anticipo</label>
                  <select value={anticipoPct} onChange={e => setAnticipoPct(e.target.value)} className="w-full bg-white border border-border rounded-md px-2 py-1 outline-none focus:border-brand-light focus:border-brand-light text-xs">
                    <option value="SI tiene anticipo">SI tiene anticipo</option>
                    <option value="NO tiene anticipo">NO tiene anticipo</option>
                  </select>
                </div>
                <div>
                  <label className="text-stone-500 block mb-0.5">Aplicacion Anticipo ?</label>
                  <select value={aplicacionAnticipo} onChange={e => setAplicacionAnticipo(e.target.value)} className="w-full bg-white border border-border rounded-md px-2 py-1 outline-none focus:border-brand-light focus:border-brand-light text-xs">
                    <option value="NO">NO</option>
                    <option value="SI">SI</option>
                  </select>
                </div>
                <div>
                  <label className="text-stone-500 block mb-0.5">Tipo de pedido</label>
                  <select value={tipoPedido} onChange={e => setTipoPedido(e.target.value)} className="w-full bg-white border border-border rounded-md px-2 py-1 outline-none focus:border-brand-light focus:border-brand-light text-xs">
                    <option value="Cliente Final">Cliente Final</option>
                    <option value="Normal">Normal</option>
                    <option value="Servicios">Servicios</option>
                  </select>
                </div>
                <div>
                  <label className="text-stone-500 block mb-0.5">% de amortizacion factura</label>
                  <input type="text" value={amortizacionFacturaPct} onChange={e => setAmortizacionFacturaPct(e.target.value)} className="w-full bg-white border border-border rounded-md px-2 py-1 outline-none focus:border-brand-light focus:border-brand-light" />
                </div>
                <div>
                  <label className="text-stone-500 block mb-0.5">Bloqueado para Despacho</label>
                  <select value={bloqueadoDespacho} onChange={e => setBloqueadoDespacho(e.target.value)} className="w-full bg-white border border-border rounded-md px-2 py-1 outline-none focus:border-brand-light focus:border-brand-light text-xs">
                    <option value="No Bloqueado">No Bloqueado</option>
                    <option value="Bloqueado">Bloqueado</option>
                  </select>
                </div>
                <div>
                  <label className="text-stone-500 block mb-0.5">Actualizar BF</label>
                  <select value={actualizarBF} onChange={e => setActualizarBF(e.target.value)} className="w-full bg-white border border-border rounded-md px-2 py-1 outline-none focus:border-brand-light focus:border-brand-light text-xs">
                    <option value="NO">NO</option>
                    <option value="SI">SI</option>
                  </select>
                </div>
                <div>
                  <label className="text-stone-500 block mb-0.5">Orden de Venta</label>
                  <input type="text" value={ordenVenta} onChange={e => setOrdenVenta(e.target.value)} className="w-full bg-white border border-border rounded-md px-2 py-1 outline-none focus:border-brand-light" />
                </div>
                <div>
                  <label className="text-stone-500 block mb-0.5">FechaRealEntregaEnt</label>
                  <input type="date" value={fechaRealEntregaEnt} onChange={e => setFechaRealEntregaEnt(e.target.value)} className="w-full bg-white border border-border rounded px-1 py-0.5 outline-none text-xs" />
                </div>
                <div>
                  <label className="text-stone-500 block mb-0.5">StatusEntrega</label>
                  <select value={statusEntrega} onChange={e => setStatusEntrega(e.target.value)} className="w-full bg-white border border-border rounded-md px-2 py-1 outline-none focus:border-brand-light text-xs">
                    <option value="Entregada">Entregada</option>
                    <option value="En Ruta">En Ruta</option>
                  </select>
                </div>
                <div>
                  <label className="text-stone-500 block mb-0.5">FechaRetPOD</label>
                  <input type="date" value={fechaRetPOD} onChange={e => setFechaRetPOD(e.target.value)} className="w-full bg-white border border-border rounded px-1 py-0.5 outline-none text-xs" />
                </div>
                <div>
                  <label className="text-stone-500 block mb-0.5">POF?</label>
                  <select value={pof} onChange={e => setPof(e.target.value)} className="w-full bg-white border border-border rounded-md px-2 py-1 outline-none focus:border-brand-light text-xs">
                    <option value=""></option>
                    <option value="SI">SI</option>
                    <option value="NO">NO</option>
                  </select>
                </div>
                <div>
                  <label className="text-stone-500 block mb-0.5">Estado de la Oferta de Venta</label>
                  <select value={estadoOfertaVenta} onChange={e => setEstadoOfertaVenta(e.target.value)} className="w-full bg-white border border-border rounded-md px-2 py-1 outline-none focus:border-brand-light focus:border-brand-light text-xs">
                    <option value="Confirmada">Confirmada</option>
                    <option value="Pendiente">Pendiente</option>
                  </select>
                </div>
                <div>
                  <label className="text-stone-500 block mb-0.5">Fecha Planeada Entrega Cliente</label>
                  <input type="date" value={fechaPlaneadaEntregaCliente} onChange={e => setFechaPlaneadaEntregaCliente(e.target.value)} className="w-full bg-white border border-border rounded px-1 py-0.5 outline-none text-xs" />
                </div>
                <div>
                  <label className="text-stone-500 block mb-0.5">% Contenedor</label>
                  <input type="text" value={pctContenedor} onChange={e => setPctContenedor(e.target.value)} className="w-full bg-white border border-border rounded-md px-2 py-1 outline-none focus:border-brand-light focus:border-brand-light text-xs" />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="text-stone-500 block mb-0.5">Anticipo</label>
                  <select 
                    value={anticipoPct}
                    onChange={e => setAnticipoPct(e.target.value)}
                    className="w-full bg-white border border-border rounded-md px-2 py-1 outline-none focus:border-brand-light focus:border-brand-light text-xs"
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
                  <label className="text-stone-500 block mb-0.5">% de amortizacion factura</label>
                  <input 
                    type="text"
                    value={amortizacionFacturaPct}
                    onChange={e => setAmortizacionFacturaPct(e.target.value)}
                    className="w-full bg-white border border-border rounded-md px-2 py-1 outline-none focus:border-brand-light text-right focus:border-brand-light"
                  />
                </div>

                <div>
                  <label className="text-stone-500 block mb-0.5">Aplicacion Anticipo ?</label>
                  <select 
                    value={aplicacionAnticipo}
                    onChange={e => setAplicacionAnticipo(e.target.value)}
                    className="w-full bg-white border border-border rounded-md px-2 py-1 outline-none focus:border-brand-light focus:border-brand-light"
                  >
                    <option value="NO">NO</option>
                    <option value="SI">SI</option>
                  </select>
                </div>

                <div>
                  <label className="text-stone-500 block mb-0.5">% Contenedor</label>
                  <input 
                    type="text"
                    value={pctContenedor}
                    onChange={e => setPctContenedor(e.target.value)}
                    className="w-full bg-white border border-border rounded-md px-2 py-1 outline-none focus:border-brand-light text-right focus:border-brand-light"
                  />
                </div>

                <div>
                  <label className="text-stone-500 block mb-0.5">Actualizar BF</label>
                  <select 
                    value={actualizarBF}
                    onChange={e => setActualizarBF(e.target.value)}
                    className="w-full bg-white border border-border rounded-md px-2 py-1 outline-none focus:border-brand-light focus:border-brand-light"
                  >
                    <option value="NO">NO</option>
                    <option value="SI">SI</option>
                  </select>
                </div>

                <div>
                  <label className="text-stone-500 block mb-0.5">Fecha de cierre</label>
                  <input 
                    type="date"
                    value={fechaCierre}
                    onChange={e => setFechaCierre(e.target.value)}
                    className="w-full bg-white border border-border rounded px-1 py-0.5 outline-none focus:border-brand-light text-xs"
                  />
                </div>

                <div>
                  <label className="text-stone-500 block mb-0.5">Bloqueado para Despacho</label>
                  <select 
                    value={bloqueadoDespacho}
                    onChange={e => setBloqueadoDespacho(e.target.value)}
                    className="w-full bg-white border border-border rounded-md px-2 py-1 outline-none focus:border-brand-light focus:border-brand-light"
                  >
                    <option value="No Bloqueado">No Bloqueado</option>
                    <option value="Bloqueado">Bloqueado</option>
                  </select>
                </div>

                <div>
                  <label className="text-stone-500 block mb-0.5">Estado de la Oferta de Venta</label>
                  <select 
                    value={estadoOfertaVenta}
                    onChange={e => setEstadoOfertaVenta(e.target.value)}
                    className="w-full bg-white border border-border rounded-md px-2 py-1 outline-none focus:border-brand-light focus:border-brand-light text-xs"
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
                  <label className="text-stone-500 block mb-0.5">Tipo de pedido</label>
                  <select 
                    value={tipoPedido}
                    onChange={e => setTipoPedido(e.target.value)}
                    className="w-full bg-white border border-border rounded-md px-2 py-1 outline-none focus:border-brand-light focus:border-brand-light text-xs"
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
                  <label className="text-stone-500 block mb-0.5">Valor Anticipo</label>
                  <input 
                    type="text"
                    value={valorAnticipo}
                    onChange={e => setValorAnticipo(e.target.value)}
                    className="w-full bg-white border border-border rounded-md px-2 py-1 outline-none focus:border-brand-light text-right focus:border-brand-light"
                  />
                </div>

                {mode === 'Order' && (
                  <div>
                    <label className="text-stone-500 block mb-0.5 font-medium">Tipo Facturacion</label>
                    <select 
                      value={tipoFacturacion}
                      onChange={e => setTipoFacturacion(e.target.value)}
                      className="w-full bg-white border border-border rounded-md px-2 py-1 outline-none focus:border-brand-light focus:border-brand-light text-xs"
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
          className="flex-1 min-w-0 bg-white border border-border rounded-2xl flex flex-col overflow-hidden text-[11px] relative"
          onContextMenu={(e) => {
            e.preventDefault();
            setContextMenu({ x: e.clientX, y: e.clientY });
          }}
        >

          {/* Encabezado del documento */}
          <div className="px-5 py-3.5 border-b border-border flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <span className="w-10 h-10 rounded-xl bg-brand text-white flex items-center justify-center shrink-0">
                <DocIcon className="w-5 h-5" />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-medium tracking-[0.16em] uppercase text-brand-light">Documento SAP</p>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-semibold text-brand-dark truncate">
                    {docTitle}{docNum ? <span className="text-stone-400 font-normal"> · {docNum}</span> : null}
                  </h2>
                  {docStatus && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      docStatus === 'Cancelado' ? 'bg-red-50 text-red-700' : docStatus === 'Cerrado' ? 'bg-stone-100 text-stone-500' : 'bg-[#3E6E5E]/10 text-[#3E6E5E]'
                    }`}>
                      {docStatus === 'Abiertos' ? 'Abierto' : docStatus}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {docNum && (
                <button
                  onClick={() => setIsMapaRelacionesModalOpen(true)}
                  className="hidden sm:inline-flex items-center gap-1.5 h-8 px-3 mr-1 rounded-lg border border-border text-xs font-medium text-stone-600 hover:border-brand-light hover:text-brand transition-colors cursor-pointer"
                >
                  <GitBranch className="w-3.5 h-3.5" /> Mapa de relaciones
                </button>
              )}
              <button
                className="w-8 h-8 flex items-center justify-center rounded-lg text-stone-400 hover:text-brand hover:bg-cream-light transition-colors cursor-pointer"
                title="Minimizar"
                onClick={() => setIsMinimized(true)}
              >
                <Minus className="w-4 h-4" />
              </button>
              <button
                className="w-8 h-8 flex items-center justify-center rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                title="Cerrar"
                onClick={() => window.location.href = '/consultas-sap'}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Form Header Section */}
          {mode === 'ProductionOrder' ? (
            <div className="px-5 py-4 bg-white border-b border-border grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-xs">
              {/* Left Header Fields */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <label className="w-36 text-stone-500 text-right">Tipo</label>
                  <select value={productionOrderType} onChange={e => setProductionOrderType(e.target.value)} className="flex-1 bg-white border border-border rounded-md px-2 py-1 outline-none focus:border-brand-light font-medium">
                    <option value="Estándar">Estándar</option>
                    <option value="Especial">Especial</option>
                    <option value="Desmontaje">Desmontaje</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <label className="w-36 text-stone-500 text-right">Estado</label>
                  <select value={productionOrderStatus} onChange={e => setProductionOrderStatus(e.target.value)} className="flex-1 bg-white border border-border rounded-md px-2 py-1 outline-none focus:border-brand-light font-medium">
                    <option value="Planif.">Planif.</option>
                    <option value="Liberado">Liberado</option>
                    <option value="Cerrado">Cerrado</option>
                    <option value="Cancelado">Cancelado</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <label className="w-36 text-stone-500 text-right">Nº producto</label>
                  <div className="flex-1 flex items-center gap-1">
                    <input type="text" value={productNo || (rows[0]?.itemCode || '')} onChange={e => setProductNo(e.target.value)} className="flex-1 bg-white border border-border rounded-md px-2 py-1 outline-none focus:border-brand-light font-semibold text-brand-dark" />
                    <button onClick={() => setIsItemModalOpen(true)} className="w-4 h-4 bg-sage-soft hover:bg-brand hover:text-white rounded-full flex items-center justify-center text-[9px] font-bold text-brand border border-brand-light/40 cursor-pointer">◯</button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <label className="w-36 text-stone-500 text-right">Descripción producto</label>
                  <input type="text" value={productDescription || (rows[0]?.description || '')} onChange={e => setProductDescription(e.target.value)} className="flex-1 bg-white border border-border rounded-md px-2 py-1 outline-none focus:border-brand-light font-medium" />
                </div>

                <div className="flex items-center gap-2">
                  <label className="w-36 text-stone-500 text-right">Cantidad planificada</label>
                  <div className="flex-1 flex items-center gap-2">
                    <input type="number" value={plannedQuantity} onChange={e => setPlannedQuantity(e.target.value)} className="w-24 bg-white border border-border rounded-md px-2 py-1 outline-none focus:border-brand-light font-bold text-brand-dark text-right" />
                    <span className="text-stone-500">Nombre de</span>
                    <input type="text" defaultValue="UN" readOnly className="w-12 bg-cream-light border border-border rounded px-1 py-0.5 text-center text-stone-500" />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <label className="w-36 text-stone-500 text-right">Almacén</label>
                  <input type="text" value={warehouse} onChange={e => setWarehouse(e.target.value)} className="flex-1 bg-white border border-border rounded-md px-2 py-1 outline-none focus:border-brand-light font-medium" />
                </div>

                <div className="flex items-center gap-2">
                  <label className="w-36 text-stone-500 text-right">Socio de negocio</label>
                  <div className="flex-1 flex items-center gap-1">
                    <input type="text" value={businessPartner || cardCode || ''} onChange={e => setBusinessPartner(e.target.value)} className="flex-1 bg-white border border-border rounded-md px-2 py-1 outline-none focus:border-brand-light font-medium text-brand-dark" />
                    <button onClick={() => setIsCustomerModalOpen(true)} className="w-4 h-4 bg-sage-soft hover:bg-brand hover:text-white rounded-full flex items-center justify-center text-[9px] font-bold text-brand border border-brand-light/40 cursor-pointer">◯</button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <label className="w-36 text-stone-500 text-right">Cálculo de fecha de enrutamiento</label>
                  <select value={routingDateCalculation} onChange={e => setRoutingDateCalculation(e.target.value)} className="flex-1 bg-white border border-border rounded-md px-2 py-1 outline-none focus:border-brand-light font-medium">
                    <option value="En Fecha de inicio">En Fecha de inicio</option>
                    <option value="En Fecha de finalización">En Fecha de finalización</option>
                  </select>
                  <button className="px-2 py-0.5 bg-white hover:bg-cream-light text-stone-600 font-semibold rounded border border-border text-[10px] whitespace-nowrap cursor-pointer">Actualizar ahora</button>
                </div>

                <div className="flex items-center gap-2 pt-0.5">
                  <label className="w-36 text-stone-500 text-right"></label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-stone-600 font-medium">
                    <input type="checkbox" checked={procureOrder} onChange={e => setProcureOrder(e.target.checked)} className="rounded text-brand-light" />
                    <span>Aprovisionar artículos</span>
                  </label>
                </div>
              </div>

              {/* Right Header Fields */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <label className="w-36 text-stone-500 text-right">Nº</label>
                  <div className="flex items-center gap-1">
                    <select value={docSeries} onChange={e => setDocSeries(e.target.value)} className="bg-white border border-border rounded-md px-2 py-1 outline-none focus:border-brand-light text-xs">
                      <option value="OF-Produ">OF-Produ</option>
                      <option value="OF-Planta">OF-Planta</option>
                      <option value="OF-Especial">OF-Especial</option>
                    </select>
                    <div className="relative flex items-center">
                      <input 
                        type="text" 
                        placeholder="DocNum..." 
                        value={docNum} 
                        onChange={e => setDocNum(e.target.value)} 
                        onKeyDown={e => { if (e.key === 'Enter') handleSearchSapDocument(e.currentTarget.value); }}
                        className="w-28 bg-white border border-brand-light font-bold rounded pl-1.5 pr-6 py-0.5 outline-none text-right text-brand-dark focus:ring-2 focus:ring-brand/10 text-xs shadow-inner" 
                      />
                      <button onClick={() => handleSearchSapDocument(docNum)} className="absolute right-1 text-stone-500 hover:text-brand font-bold text-xs p-0.5 cursor-pointer">🔍</button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <label className="w-36 text-stone-500 text-right">Fecha orden de fabricación</label>
                  <input type="date" value={postingDate} onChange={e => setPostingDate(e.target.value)} className="w-36 bg-white border border-border rounded-md px-2 py-1 outline-none focus:border-brand-light text-xs" />
                </div>

                <div className="flex items-center gap-2">
                  <label className="w-36 text-stone-500 text-right">Fecha de inicio</label>
                  <input type="date" value={startDate || postingDate} onChange={e => setStartDate(e.target.value)} className="w-36 bg-white border border-border rounded-md px-2 py-1 outline-none focus:border-brand-light text-xs" />
                </div>

                <div className="flex items-center gap-2">
                  <label className="w-36 text-stone-500 text-right">Fecha de finalización</label>
                  <input type="date" value={dueDate || validUntil} onChange={e => setDueDate(e.target.value)} className="w-36 bg-white border border-border rounded-md px-2 py-1 outline-none focus:border-brand-light text-xs" />
                </div>

                <div className="flex items-center gap-2">
                  <label className="w-36 text-stone-500 text-right">Usuario</label>
                  <select value={poUserSignature} onChange={e => setPoUserSignature(e.target.value)} className="flex-1 bg-white border border-border rounded-md px-2 py-1 outline-none focus:border-brand-light font-medium">
                    <option value="Luis Guillermo Escobar">Luis Guillermo Escobar</option>
                    <option value="Mayerly Marin">Mayerly Marin</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <label className="w-36 text-stone-500 text-right">Origen</label>
                  <select value={poOrigin} onChange={e => setPoOrigin(e.target.value)} className="flex-1 bg-white border border-border rounded-md px-2 py-1 outline-none focus:border-brand-light font-medium">
                    <option value="Manual">Manual</option>
                    <option value="MRP">MRP</option>
                    <option value="Pedido de cliente">Pedido de cliente</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <label className="w-36 text-stone-500 text-right">Vinculados a</label>
                  <select value={poLinkedTo} onChange={e => setPoLinkedTo(e.target.value)} className="flex-1 bg-white border border-border rounded-md px-2 py-1 outline-none focus:border-brand-light font-medium">
                    <option value="Pedido de cliente">Pedido de cliente</option>
                    <option value="Ninguno">Ninguno</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <label className="w-36 text-stone-500 text-right">Pedido vinculado</label>
                  <input type="text" value={poLinkedOrder || ordenVenta} onChange={e => setPoLinkedOrder(e.target.value)} className="flex-1 bg-white border border-border rounded-md px-2 py-1 outline-none focus:border-brand-light font-medium" />
                </div>

                <div className="flex items-center gap-2">
                  <label className="w-36 text-stone-500 text-right">Cliente</label>
                  <input type="text" value={cardCode} onChange={e => setCardCode(e.target.value)} onKeyDown={handleCustomerSearchShortcut} className="flex-1 bg-white border border-border rounded-md px-2 py-1 outline-none focus:border-brand-light font-medium" />
                </div>

                <div className="flex items-center gap-2">
                  <label className="w-36 text-stone-500 text-right font-bold text-brand-dark">Centro de Costos</label>
                  <input type="text" value={costCenter} onChange={e => setCostCenter(e.target.value)} className="flex-1 bg-white border border-border rounded-md px-2 py-1 outline-none focus:border-brand-light font-medium" />
                </div>

                <div className="flex items-center gap-2">
                  <label className="w-36 text-stone-500 text-right">Proyecto</label>
                  <input type="text" value={poProject} onChange={e => setPoProject(e.target.value)} className="flex-1 bg-white border border-border rounded-md px-2 py-1 outline-none focus:border-brand-light font-medium" />
                </div>
              </div>
            </div>
          ) : (
            <div className="px-5 py-4 bg-white border-b border-border grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            
            {/* Left Header Fields */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <label className="w-28 text-stone-500 text-right">Cliente</label>
                <div className="flex-1 flex items-center gap-1">
                  <div className="relative flex-1">
                    <input 
                      type="text"
                      value={cardCode}
                      onChange={e => setCardCode(e.target.value)}
                      onKeyDown={handleCustomerSearchShortcut}
                      className="w-full bg-white border border-border rounded px-1.5 py-0.5 font-semibold text-brand-dark outline-none focus:ring-1 focus:ring-blue-600"
                    />
                    <button 
                      onClick={() => setIsCustomerModalOpen(true)}
                      className="absolute right-1 top-0.5 w-4 h-4 bg-sage-soft hover:bg-brand hover:text-white rounded-full flex items-center justify-center text-[9px] font-bold text-brand border border-brand-light/40"
                      title="Buscar Cliente en SAP B1"
                    >
                      ◯
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <label className="w-28 text-stone-500 text-right">Nombre</label>
                <input 
                  type="text"
                  value={cardName}
                  onChange={e => setCardName(e.target.value)}
                  onKeyDown={handleCustomerSearchShortcut}
                  className="flex-1 bg-white border border-border rounded-md px-2 py-1 outline-none focus:border-brand-light focus:border-brand-light"
                />
              </div>

              <div className="flex items-center gap-2">
                <label className="w-28 text-stone-500 text-right">Persona de contacto</label>
                <div className="flex-1 flex items-center gap-1">
                  <input 
                    type="text"
                    value={contactPerson}
                    onChange={e => setContactPerson(e.target.value)}
                    className="flex-1 bg-white border border-border rounded-md px-2 py-1 outline-none focus:border-brand-light focus:border-brand-light font-medium text-brand-dark text-xs"
                  />
                  <span className="w-4 h-4 rounded-full bg-stone-100 border border-border flex items-center justify-center text-[9px] font-bold text-stone-500 cursor-pointer" title="Información de contacto">i</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <label className="w-28 text-stone-500 text-right">
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
                  onKeyDown={handleCustomerSearchShortcut}
                  className="flex-1 bg-white border border-border rounded-md px-2 py-1 outline-none focus:border-brand-light focus:border-brand-light"
                />
              </div>

              <div className="flex items-center gap-2">
                <label className="w-28 text-stone-500 text-right">Moneda local</label>
                <select 
                  value={currency}
                  onChange={e => setCurrency(e.target.value)}
                  className="w-32 bg-white border border-border rounded-md px-2 py-1 outline-none focus:border-brand-light focus:border-brand-light"
                >
                  <option value="COP">COP - Pesos</option>
                  <option value="USD">USD - Dólares</option>
                </select>
              </div>
            </div>

            {/* Right Header Fields */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <label className="w-36 text-stone-500 text-right">Nº</label>
                <div className="flex items-center gap-1">
                  <select 
                    value={docSeries}
                    onChange={e => setDocSeries(e.target.value)}
                    className="bg-white border border-border rounded-md px-2 py-1 outline-none focus:border-brand-light text-xs"
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
                      className="w-32 bg-white border border-brand-light font-bold rounded pl-1.5 pr-6 py-0.5 outline-none text-right text-brand-dark focus:ring-2 focus:ring-brand/10 text-xs shadow-inner"
                    />
                    <button
                      onClick={() => handleSearchSapDocument(docNum)}
                      className="absolute right-1 text-stone-500 hover:text-brand font-bold text-xs p-0.5 cursor-pointer hover:scale-110 transition-transform"
                      title="Consultar Documento en SAP B1"
                    >
                      🔍
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <label className="w-36 text-stone-500 text-right">Estado</label>
                <input 
                  type="text"
                  value={docStatus}
                  readOnly
                  className="w-32 bg-cream-light border border-border rounded px-1.5 py-0.5 text-stone-500 outline-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <label className="w-36 text-stone-500 text-right">Fecha de contabilización</label>
                <input 
                  type="date"
                  value={postingDate}
                  onChange={e => setPostingDate(e.target.value)}
                  className="w-36 bg-white border border-border rounded-md px-2 py-1 outline-none focus:border-brand-light text-xs"
                />
              </div>

              <div className="flex items-center gap-2">
                <label className="w-36 text-stone-500 text-right">
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
                  className="w-36 bg-white border border-border rounded-md px-2 py-1 outline-none focus:border-brand-light text-xs"
                />
              </div>

              <div className="flex items-center gap-2">
                <label className="w-36 text-stone-500 text-right">Fecha del documento</label>
                <input 
                  type="date"
                  value={docDate}
                  onChange={e => setDocDate(e.target.value)}
                  className="w-36 bg-white border border-border rounded-md px-2 py-1 outline-none focus:border-brand-light text-xs"
                />
              </div>
            </div>
          </div>
          )}

          {/* ── Tabs Container ───────────────────────────────────────────────── */}
          <div className="flex-1 flex flex-col bg-white">
            
            {/* Tab Headers */}
            <div className="flex items-center bg-white border-b border-border px-5 text-xs">
              {mode === 'ProductionOrder' ? (
                <>
                  <button
                    onClick={() => setActiveTab('componentes')}
                    className={`px-1 py-3 mr-6 border-b-2 -mb-px font-medium transition-colors cursor-pointer ${
                      activeTab === 'componentes' || activeTab === 'contenido'
                        ? 'border-brand text-brand'
                        : 'border-transparent text-stone-400 hover:text-brand-dark'
                    }`}
                  >
                    Componentes
                  </button>
                  <button
                    onClick={() => setActiveTab('resumen')}
                    className={`px-1 py-3 mr-6 border-b-2 -mb-px font-medium transition-colors cursor-pointer ${
                      activeTab === 'resumen'
                        ? 'border-brand text-brand'
                        : 'border-transparent text-stone-400 hover:text-brand-dark'
                    }`}
                  >
                    Resumen
                  </button>
                  <button
                    onClick={() => setActiveTab('anexos')}
                    className={`px-1 py-3 mr-6 border-b-2 -mb-px font-medium transition-colors cursor-pointer ${
                      activeTab === 'anexos'
                        ? 'border-brand text-brand'
                        : 'border-transparent text-stone-400 hover:text-brand-dark'
                    }`}
                  >
                    Anexos
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setActiveTab('contenido')}
                    className={`px-1 py-3 mr-6 border-b-2 -mb-px font-medium transition-colors cursor-pointer ${
                      activeTab === 'contenido'
                        ? 'border-brand text-brand'
                        : 'border-transparent text-stone-400 hover:text-brand-dark'
                    }`}
                  >
                    Contenido
                  </button>
                  <button
                    onClick={() => setActiveTab('logistica')}
                    className={`px-1 py-3 mr-6 border-b-2 -mb-px font-medium transition-colors cursor-pointer ${
                      activeTab === 'logistica'
                        ? 'border-brand text-brand'
                        : 'border-transparent text-stone-400 hover:text-brand-dark'
                    }`}
                  >
                    Logística
                  </button>
                  <button
                    onClick={() => setActiveTab('anexos')}
                    className={`px-1 py-3 mr-6 border-b-2 -mb-px font-medium transition-colors cursor-pointer ${
                      activeTab === 'anexos'
                        ? 'border-brand text-brand'
                        : 'border-transparent text-stone-400 hover:text-brand-dark'
                    }`}
                  >
                    Anexos
                  </button>
                </>
              )}
            </div>

            {/* Tab Componentes: Production Order lines with SAP B1 columns */}
            {(activeTab === 'componentes' || (mode === 'ProductionOrder' && activeTab === 'contenido')) && mode === 'ProductionOrder' && (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Componentes table */}
                <div className="flex-1 overflow-auto min-h-[240px] relative">
                  <table className="min-w-[900px] w-full text-left border-collapse text-[11px]">
                    <thead>
                      <tr className="bg-cream-light text-stone-400 text-[10px] uppercase tracking-wider font-medium border-b border-border sticky top-0 z-10">
                        <th className="p-1.5 w-8 text-center border-r border-border">#</th>
                        <th className="p-1.5 w-32 text-center border-r border-border">Tipo</th>
                        <th className="p-1.5 w-44 border-r border-border">Nº</th>
                        <th className="p-1.5 min-w-[220px] border-r border-border">Descripción</th>
                        <th className="p-1.5 w-24 text-right border-r border-border">Cantidad base</th>
                        <th className="p-1.5 w-24 text-right border-r border-border">Ratio base</th>
                        <th className="p-1.5 w-24 text-right border-r border-border">Ctd. requerida</th>
                        <th className="p-1.5 w-20 text-right border-r border-border">Consumido</th>
                        <th className="p-1.5 w-24 text-right border-r border-border">Disponible</th>
                        <th className="p-1.5 w-7 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/70 bg-white">
                      {rows.map((row, idx) => (
                        <tr key={row.id} className={`hover:bg-blue-50/30 group transition-colors ${
                          !row.itemCode ? 'bg-white' : ''
                        }`}>
                          {/* # */}
                          <td className="p-1 text-center bg-cream-light font-semibold text-stone-500 border-r border-border text-[10px]">{idx + 1}</td>
                          {/* Tipo - dropdown + arrow */}
                          <td className="p-0 border-r border-border/70">
                            <div className="flex items-center gap-0.5 px-0.5">
                              <select
                                value={row.unitMsr || 'Artículo'}
                                onChange={e => handleRowChange(row.id, 'unitMsr', e.target.value)}
                                className="flex-1 py-1 bg-transparent outline-none text-stone-600 text-[10px] border-0"
                              >
                                <option value="Artículo">Artículo</option>
                                <option value="Trabajo">Trabajo</option>
                              </select>
                              {row.itemCode && <span className="text-brand text-[10px] cursor-pointer hover:text-blue-800" title="Ver artículo">→</span>}
                            </div>
                          </td>
                          {/* Nº - item code with link arrow */}
                          <td className="p-0 border-r border-border/70">
                            <div className="flex items-center gap-0.5">
                              {row.itemCode && <span className="text-brand text-[10px] px-0.5 cursor-pointer" title="Abrir">→</span>}
                              <input
                                type="text"
                                value={row.itemCode}
                                onChange={e => handleRowChange(row.id, 'itemCode', e.target.value)}
                                className="flex-1 px-1 py-1 bg-white outline-none font-semibold text-brand-dark text-[10px] min-w-0"
                                placeholder="Nº artículo..."
                              />
                            </div>
                          </td>
                          {/* Descripción */}
                          <td className="p-0 border-r border-border/70">
                            <input
                              type="text"
                              value={row.description}
                              onChange={e => handleRowChange(row.id, 'description', e.target.value)}
                              className="w-full px-1.5 py-1 bg-white outline-none text-stone-600 text-[10px]"
                              placeholder="Descripción..."
                            />
                          </td>
                          {/* Cantidad base */}
                          <td className="p-0 border-r border-border/70">
                            <input
                              type="number"
                              value={row.quantity}
                              onChange={e => handleRowChange(row.id, 'quantity', e.target.value)}
                              className="w-full px-1.5 py-1 bg-white text-right outline-none font-medium text-[10px]"
                            />
                          </td>
                          {/* Ratio base - stored in barCode field */}
                          <td className="p-1.5 text-right text-stone-500 border-r border-border/70 text-[10px] font-medium bg-cream-light">
                            {row.barCode && row.barCode !== 'N/A' ? row.barCode : (row.quantity > 0 ? String(row.quantity) : '—')}
                          </td>
                          {/* Ctd. requerida - stored in total field */}
                          <td className="p-1.5 text-right font-semibold text-brand-dark border-r border-border/70 text-[10px] bg-cream-light/50">
                            {Number(row.total) > 0 ? Number(row.total).toFixed(2) : (row.quantity > 0 ? row.quantity : '—')}
                          </td>
                          {/* Consumido - stored in price field */}
                          <td className="p-1.5 text-right text-stone-500 border-r border-border/70 text-[10px]">
                            {Number(row.price) > 0 ? Number(row.price).toFixed(2) : '0'}
                          </td>
                          {/* Disponible - stored in salesEmployee field */}
                          <td className={`p-1.5 text-right text-[10px] border-r border-border/70 font-medium ${
                            Number(row.salesEmployee) < 0 ? 'text-red-600' : 'text-stone-600'
                          }`}>
                            {row.salesEmployee && row.salesEmployee !== 'Firplak' ? Number(row.salesEmployee).toFixed(2) : '—'}
                          </td>
                          {/* Delete */}
                          <td className="p-1 text-center">
                            <button onClick={() => handleRemoveRow(row.id)} className="text-stone-300 hover:text-rose-600 transition-colors cursor-pointer" title="Eliminar fila">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Row navigation arrows (SAP B1 style) */}
                <div className="flex justify-end px-2 py-1 bg-cream-light border-t border-border/70 gap-1">
                  <button className="w-5 h-5 border border-border bg-stone-100 hover:bg-stone-100 text-stone-500 text-[10px] flex items-center justify-center cursor-pointer rounded-sm">▲</button>
                  <button className="w-5 h-5 border border-border bg-stone-100 hover:bg-stone-100 text-stone-500 text-[10px] flex items-center justify-center cursor-pointer rounded-sm">▼</button>
                </div>
              </div>
            )}

            {/* Tab Resumen: Production Order summary */}
            {activeTab === 'resumen' && mode === 'ProductionOrder' && (
              <div className="flex-1 flex gap-8 p-4 overflow-y-auto bg-white min-h-[300px] text-xs">
                {/* Column 1: Costos */}
                <div className="flex flex-col gap-4 w-[280px]">
                  <div className="font-semibold text-brand-dark border-b border-border pb-1 mb-1">Costos</div>
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-stone-500 flex items-center gap-1 font-bold">Costo de componente real-SAL<span className="text-brand-light font-bold">→</span></label>
                      <input type="text" readOnly className="w-24 bg-white border border-border rounded px-1.5 py-0.5 text-right font-medium outline-none" value="$ 0.00" />
                    </div>
                    <div className="flex justify-between items-center">
                      <label className="text-stone-500 font-bold">Costo de componente de recurso real</label>
                      <input type="text" readOnly className="w-24 bg-cream-light border border-border rounded px-1.5 py-0.5 text-right outline-none" value="" />
                    </div>
                    <div className="flex justify-between items-center">
                      <label className="text-stone-500 font-bold">Costo adicional real MO+CIF</label>
                      <input type="text" readOnly className="w-24 bg-cream-light border border-border rounded px-1.5 py-0.5 text-right outline-none" value="$ 0.00" />
                    </div>
                    <div className="flex justify-between items-center">
                      <label className="text-stone-500 flex items-center gap-1 font-bold">Costo de producto real+VALE P<span className="text-brand-light font-bold">→</span></label>
                      <input type="text" readOnly className="w-24 bg-cream-light border border-border rounded px-1.5 py-0.5 text-right outline-none" value="$ 0.00" />
                    </div>
                    <div className="flex justify-between items-center">
                      <label className="text-stone-500 font-bold">Coste real de subproductos</label>
                      <input type="text" readOnly className="w-24 bg-cream-light border border-border rounded px-1.5 py-0.5 text-right outline-none" value="" />
                    </div>
                    <div className="flex justify-between items-center">
                      <label className="text-stone-500 flex items-center gap-1 font-bold">Desviación total<span className="text-brand-light font-bold">→</span></label>
                      <input type="text" readOnly className="w-24 bg-cream-light border border-border rounded px-1.5 py-0.5 text-right outline-none" value="$ 0.00" />
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <label className="text-stone-500 font-bold">Asiento contable</label>
                      <div className="flex items-center gap-1">
                        <span className="text-brand-light font-bold">→</span>
                        <input type="text" readOnly className="w-40 bg-cream-light border border-border rounded-md px-2 py-1 outline-none focus:border-brand-light" value={poJournalRemarks} />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-stone-500 font-bold">Documento de referencia</label>
                      <button className="bg-brand hover:bg-brand-hover border border-brand rounded px-3 py-0.5 font-bold text-white">...</button>
                    </div>
                  </div>
                </div>

                {/* Column 2: Cantidades & Fechas */}
                <div className="flex flex-col gap-6 w-[220px]">
                  <div className="flex flex-col gap-2">
                    <div className="font-semibold text-brand-dark border-b border-border pb-1">Cantidades</div>
                    <div className="flex justify-between items-center">
                      <label className="text-stone-500 font-bold">Cantidad planificada</label>
                      <input type="text" readOnly className="w-16 bg-cream-light border border-border rounded px-1.5 py-0.5 text-right outline-none" value={plannedQuantity} />
                    </div>
                    <div className="flex justify-between items-center">
                      <label className="text-stone-500 font-bold">Cantidad completada</label>
                      <input type="text" readOnly className="w-16 bg-cream-light border border-border rounded px-1.5 py-0.5 text-right outline-none" value={poCompletedQty} />
                    </div>
                    <div className="flex justify-between items-center">
                      <label className="text-stone-500 font-bold">Cantidad rechazada</label>
                      <input type="text" readOnly className="w-16 bg-cream-light border border-border rounded px-1.5 py-0.5 text-right outline-none" value={poRejectedQty} />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <div className="font-semibold text-brand-dark border-b border-border pb-1">Fechas</div>
                    <div className="flex justify-between items-center">
                      <label className="text-stone-500 font-bold">Fecha de finalización</label>
                      <input type="date" readOnly className="w-24 bg-cream-light border border-border rounded-md px-2 py-1 outline-none focus:border-brand-light" value={dueDate} />
                    </div>
                    <div className="flex justify-between items-center">
                      <label className="text-stone-500 font-bold">Fecha de cierre real</label>
                      <input type="date" readOnly className="w-24 bg-cream-light border border-border rounded-md px-2 py-1 outline-none focus:border-brand-light" value={poClosingDate} />
                    </div>
                    <div className="flex justify-between items-center">
                      <label className="text-stone-500 font-bold">Vencido</label>
                      <input type="text" readOnly className="w-24 bg-cream-light border border-border rounded-md px-2 py-1 outline-none focus:border-brand-light" value="" />
                    </div>
                  </div>
                </div>

                {/* Column 3: Tiempos planificados & Días planificados */}
                <div className="flex flex-col gap-6 w-[240px]">
                  <div className="flex flex-col gap-2">
                    <div className="font-semibold text-brand-dark border-b border-border pb-1">Tiempos planificados</div>
                    <div className="flex justify-between items-center">
                      <label className="text-stone-500 font-bold">Tiempo de producción total</label>
                      <input type="text" readOnly className="w-16 bg-cream-light border border-border rounded px-1.5 py-0.5 text-right outline-none" value="" />
                    </div>
                    <div className="flex justify-between items-center">
                      <label className="text-stone-500 font-bold">Tiempo adicional total</label>
                      <input type="text" readOnly className="w-16 bg-cream-light border border-border rounded px-1.5 py-0.5 text-right outline-none" value="" />
                    </div>
                    <div className="flex justify-between items-center">
                      <label className="text-stone-500 font-bold">Tiempo de ejecución total</label>
                      <input type="text" readOnly className="w-16 bg-cream-light border border-border rounded px-1.5 py-0.5 text-right outline-none" value="" />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <div className="font-semibold text-brand-dark border-b border-border pb-1">Días planificados</div>
                    <div className="flex justify-between items-center">
                      <label className="text-stone-500 font-bold">Total de días solicitados</label>
                      <input type="text" readOnly className="w-16 bg-cream-light border border-border rounded px-1.5 py-0.5 text-right outline-none" value="" />
                    </div>
                    <div className="flex justify-between items-center">
                      <label className="text-stone-500 font-bold">Total de días de espera</label>
                      <input type="text" readOnly className="w-16 bg-cream-light border border-border rounded px-1.5 py-0.5 text-right outline-none" value="" />
                    </div>
                    <div className="flex justify-between items-center">
                      <label className="text-stone-500 font-bold">Días totales</label>
                      <input type="text" readOnly className="w-16 bg-cream-light border border-border rounded px-1.5 py-0.5 text-right outline-none" value="" />
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* Tab 1: Contenido (Grid Table) - only for non-ProductionOrder */}
            {activeTab === 'contenido' && mode !== 'ProductionOrder' && (
              <div className="p-5 flex-1 flex flex-col">
                
                {/* Top Controls inside Contenido */}
                <div className="flex items-center justify-between mb-2 text-xs">
                  <div className="flex items-center gap-2">
                    <label className="text-stone-500 font-semibold">Clase de artículo/servicio</label>
                    <select
                      value={itemClass}
                      onChange={e => setItemClass(e.target.value)}
                      className="bg-white border border-border rounded-md px-2 py-1 outline-none focus:border-brand-light font-medium"
                    >
                      <option value="Artículo">Artículo</option>
                      <option value="Servicio">Servicio</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-stone-500 font-semibold">Clase de resumen</label>
                    <select
                      value={summaryClass}
                      onChange={e => setSummaryClass(e.target.value)}
                      className="bg-white border border-border rounded-md px-2 py-1 outline-none focus:border-brand-light font-medium"
                    >
                      <option value="Sin resumen">Sin resumen</option>
                      <option value="Por categoría">Por categoría</option>
                    </select>
                  </div>
                </div>

                {/* Data Grid Table Container (Wide Horizontal Scrollbar) */}
                <div className="flex-1 border border-border rounded-xl overflow-x-auto relative min-h-[280px] bg-white">
                  <table className="min-w-[1750px] w-full text-left border-collapse text-[11px]">
                    <thead>
                      <tr className="bg-cream-light text-stone-400 text-[10px] uppercase tracking-wider font-medium border-b border-border sticky top-0 z-10">
                        <th className="p-1.5 w-8 text-center border-r border-border">#</th>
                        <th className="p-1.5 w-48 border-r border-border">Número de artículo</th>
                        <th className="p-1.5 min-w-[320px] border-r border-border">Descripción del artículo</th>
                        <th className="p-1.5 w-36 border-r border-border">Código de barra</th>
                        <th className="p-1.5 w-20 text-right border-r border-border">Cantidad</th>
                        <th className="p-1.5 w-24 text-center border-r border-border">Unidad de medida</th>
                        <th className="p-1.5 w-32 text-right border-r border-border">Precio por unidad</th>
                        <th className="p-1.5 w-24 text-right border-r border-border">% de descuento</th>
                        <th className="p-1.5 w-28 text-center border-r border-border">Indicador de impuesto</th>
                        <th className="p-1.5 w-36 text-right border-r border-border">Total (ML)</th>
                        <th className="p-1.5 w-24 text-center border-r border-border">Almacén</th>
                        <th className="p-1.5 w-36 text-center border-r border-border">Centro de Costo</th>
                        <th className="p-1.5 w-44 text-center border-r border-border">Empleado de ventas</th>
                        <th className="p-1.5 w-24 text-center border-r border-border">Estado de Línea</th>
                        <th className="p-1.5 w-8 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/70 bg-white">
                      {rows.map((row, idx) => (
                        <tr key={row.id} className="hover:bg-sage-soft/50 group transition-colors">
                          {/* Row Number */}
                          <td className="p-1 text-center bg-cream-light font-semibold text-stone-500 border-r border-border">
                            {idx + 1}
                          </td>

                          {/* Item Code Input */}
                          <td className="p-0 border-r border-border/70 relative">
                            <div className="flex items-center">
                              <input 
                                type="text"
                                value={row.itemCode}
                                onChange={e => handleRowChange(row.id, 'itemCode', e.target.value)}
                                className={`w-full px-1.5 py-1 bg-transparent outline-none focus:bg-sage-soft ${getRowTextColor(row.treeType)}`}
                                placeholder="Escriba código..."
                              />
                              <button 
                                onClick={() => {
                                  setActiveRowIdForSearch(row.id);
                                  setIsItemModalOpen(true);
                                }}
                                className="p-1 text-stone-400 hover:text-brand cursor-pointer"
                                title="Buscar artículo SAP B1"
                              >
                                <Search className="w-3 h-3" />
                              </button>
                            </div>
                          </td>

                          {/* Description Input */}
                          <td className="p-0 border-r border-border/70">
                            <input 
                              type="text"
                              value={row.description}
                              onChange={e => handleRowChange(row.id, 'description', e.target.value)}
                              className={`w-full px-1.5 py-1 bg-transparent outline-none focus:bg-sage-soft ${getRowTextColor(row.treeType)}`}
                              placeholder="Descripción del artículo..."
                            />
                          </td>

                          {/* BarCode */}
                          <td className="p-0 border-r border-border/70">
                            <input 
                              type="text"
                              value={row.barCode || ''}
                              onChange={e => handleRowChange(row.id, 'barCode', e.target.value)}
                              className={`w-full px-1.5 py-1 bg-transparent outline-none text-center ${getRowTextColor(row.treeType)}`}
                              placeholder="Código de barra"
                            />
                          </td>

                          {/* Quantity */}
                          <td className="p-0 border-r border-border/70">
                            <input 
                              type="number"
                              min="1"
                              value={row.quantity}
                              onChange={e => handleRowChange(row.id, 'quantity', e.target.value)}
                              className={`w-full px-1.5 py-1 bg-transparent text-right outline-none focus:bg-sage-soft ${getRowTextColor(row.treeType)}`}
                            />
                          </td>

                          {/* Unit Measure */}
                          <td className="p-0 border-r border-border/70">
                            <input 
                              type="text"
                              value={row.unitMsr || 'UND'}
                              onChange={e => handleRowChange(row.id, 'unitMsr', e.target.value)}
                              className={`w-full px-1.5 py-1 bg-transparent text-center outline-none ${getRowTextColor(row.treeType)}`}
                            />
                          </td>

                          {/* Unit Price */}
                          <td className="p-0 border-r border-border/70">
                            <input 
                              type="number"
                              value={row.price}
                              onChange={e => handleRowChange(row.id, 'price', e.target.value)}
                              className={`w-full px-1.5 py-1 bg-transparent text-right outline-none focus:bg-sage-soft ${getRowTextColor(row.treeType)}`}
                            />
                          </td>

                          {/* Discount % */}
                          <td className="p-0 border-r border-border/70">
                            <input 
                              type="number"
                              step="0.1"
                              value={row.discount}
                              onChange={e => handleRowChange(row.id, 'discount', e.target.value)}
                              className="w-full px-1.5 py-1 bg-transparent text-right outline-none focus:bg-sage-soft"
                            />
                          </td>

                          {/* Tax Code */}
                          <td className="p-0 border-r border-border/70">
                            <input 
                              type="text"
                              value={row.taxCode || 'IVA 19%'}
                              onChange={e => handleRowChange(row.id, 'taxCode', e.target.value)}
                              className="w-full px-1.5 py-1 bg-transparent text-center outline-none text-stone-500"
                            />
                          </td>

                          {/* Total */}
                          <td className={`p-1.5 text-right bg-cream-light/50 border-r border-border/70 ${getRowTextColor(row.treeType)}`}>
                            {formatMoney(row.total)}
                          </td>

                          {/* Warehouse Code */}
                          <td className="p-0 border-r border-border/70">
                            <input 
                              type="text"
                              value={row.whsCode || 'PT-01'}
                              onChange={e => handleRowChange(row.id, 'whsCode', e.target.value)}
                              className="w-full px-1.5 py-1 bg-transparent text-center outline-none text-stone-600 font-semibold"
                            />
                          </td>

                          {/* Costing Code (Centro de costos - Real SAP DistributionRules) */}
                          <td className="p-0 border-r border-border/70">
                            <select 
                              value={row.costingCode || ''}
                              onChange={e => handleRowChange(row.id, 'costingCode', e.target.value)}
                              className="w-full px-1 py-1 bg-transparent text-center outline-none text-stone-600 font-semibold text-[10px]"
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
                          <td className="p-0 border-r border-border/70">
                            <input 
                              type="text"
                              value={row.salesEmployee || salesEmployee || 'Firplak'}
                              onChange={e => handleRowChange(row.id, 'salesEmployee', e.target.value)}
                              className="w-full px-1.5 py-1 bg-transparent text-center outline-none text-stone-600 font-medium"
                              placeholder="Empleado ventas"
                            />
                          </td>

                          {/* Line Status */}
                          <td className="p-1.5 text-center font-semibold text-stone-500 border-r border-border/70">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                              row.lineStatus === 'Abierto' ? 'bg-emerald-100 text-emerald-800' : 'bg-white text-stone-500'
                            }`}>
                              {row.lineStatus || 'Abierto'}
                            </span>
                          </td>

                          {/* Delete Action */}
                          <td className="p-1 text-center">
                            <button 
                              onClick={() => handleRemoveRow(row.id)}
                              className="text-stone-300 hover:text-rose-600 transition-colors cursor-pointer"
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
              <div className="p-4 grid grid-cols-2 gap-6 text-xs bg-cream-light flex-1">
                <div className="space-y-2 bg-white p-3 border border-border/70 rounded shadow-sm">
                  <h4 className="font-bold text-stone-600 border-b pb-1">Dirección de Destino / Despacho</h4>
                  <textarea 
                    value={shipToAddressText}
                    onChange={(e) => setShipToAddressText(e.target.value)}
                    rows={5}
                    placeholder="Dirección de Destino..."
                    className="w-full border border-border rounded p-2 outline-none font-sans text-xs leading-relaxed resize-none focus:ring-2 focus:ring-brand/20 bg-cream-light/50"
                  />
                </div>
                <div className="space-y-2 bg-white p-3 border border-border/70 rounded shadow-sm">
                  <h4 className="font-bold text-stone-600 border-b pb-1">Dirección de Facturación</h4>
                  <textarea 
                    value={payToAddressText}
                    onChange={(e) => setPayToAddressText(e.target.value)}
                    rows={5}
                    placeholder="Dirección de Facturación..."
                    className="w-full border border-border rounded p-2 outline-none font-sans text-xs leading-relaxed resize-none focus:ring-2 focus:ring-brand/20 bg-cream-light/50"
                  />
                </div>
              </div>
            )}

            {/* Tab 3: Anexos */}
            {activeTab === 'anexos' && (
              <div className="flex-1 flex bg-cream-light border-t border-border relative overflow-hidden">
                {/* Table Section */}
                <div className="flex-1 overflow-auto bg-white m-2 border border-border shadow-sm">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-cream-light sticky top-0 shadow-sm z-10">
                      <tr>
                        <th className="p-1 px-2 border-b border-r border-border font-normal text-stone-600 w-8 text-center whitespace-nowrap">#</th>
                        <th className="p-1 px-2 border-b border-r border-border font-normal text-stone-600 whitespace-nowrap min-w-[120px]">Vía de acceso d...</th>
                        <th className="p-1 px-2 border-b border-r border-border font-normal text-stone-600 whitespace-nowrap min-w-[120px]">Nombre de ...</th>
                        <th className="p-1 px-2 border-b border-r border-border font-normal text-stone-600 whitespace-nowrap min-w-[100px]">Fecha del anexo</th>
                        <th className="p-1 px-2 border-b border-r border-border font-normal text-stone-600 whitespace-nowrap min-w-[150px]">Texto libre</th>
                        <th className="p-1 px-2 border-b border-border font-normal text-stone-600 whitespace-nowrap min-w-[100px] text-center">Copiar a docu...</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      <tr 
                        className="hover:bg-sage-soft cursor-pointer"
                        onDoubleClick={() => setIsDocumentViewerOpen(true)}
                      >
                        <td className="p-1 px-2 border-b border-r border-border/70 text-center font-medium text-stone-600">1</td>
                        <td className="p-1 px-2 border-b border-r border-border/70 font-medium text-brand-dark">\\PES\Adjuntossap</td>
                        <td className="p-1 px-2 border-b border-r border-border/70 font-medium text-brand-dark">Rem. 91253</td>
                        <td className="p-1 px-2 border-b border-r border-border/70 font-medium text-brand-dark">01/09/2026</td>
                        <td className="p-1 px-2 border-b border-r border-border/70 bg-white"></td>
                        <td className="p-1 px-2 border-b border-border/70 bg-white text-center">
                          <input type="checkbox" className="rounded-sm border-border" />
                        </td>
                      </tr>
                      {/* Empty rows to fill space */}
                      {Array.from({ length: 15 }).map((_, i) => (
                        <tr key={i}>
                          <td className="p-2 border-b border-r border-border/70 bg-cream-light/50"></td>
                          <td className="p-2 border-b border-r border-border/70 bg-cream-light/50"></td>
                          <td className="p-2 border-b border-r border-border/70 bg-cream-light/50"></td>
                          <td className="p-2 border-b border-r border-border/70 bg-cream-light/50"></td>
                          <td className="p-2 border-b border-r border-border/70 bg-white"></td>
                          <td className="p-2 border-b border-border/70 bg-cream-light/50"></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {/* Right Buttons Panel */}
                <div className="w-28 bg-cream-light p-2 flex flex-col gap-8 pt-8">
                  <button className="w-full border border-brand rounded-lg text-white font-semibold text-xs py-1 flex items-center justify-between px-2 bg-brand hover:bg-brand-hover">
                    <span>Explorar</span>
                    <span className="text-[9px] text-brand ml-1">▼</span>
                  </button>
                  <button className="w-full border border-brand rounded-lg text-white font-semibold text-xs py-1 bg-brand hover:bg-brand-hover">
                    Visualizar
                  </button>
                  <button className="w-full border border-brand rounded-lg text-white font-semibold text-xs py-1 mt-auto mb-20 bg-brand hover:bg-brand-hover">
                    Borrar
                  </button>
                </div>
              </div>
            )}

          </div>

          {/* ── Footer Section: Employee & Totals ────────────────────────────── */}
          {mode === 'ProductionOrder' ? (
            <div className="px-5 py-4 bg-white border-t border-border flex flex-col gap-3 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Left Footer */}
                <div className="flex items-start gap-2">
                  <label className="w-32 text-stone-500 text-right font-medium pt-1">Comentarios</label>
                  <textarea 
                    value={comments}
                    onChange={e => setComments(e.target.value)}
                    rows={2}
                    placeholder="Comentarios de producción..."
                    className="flex-1 bg-white border border-border rounded p-1.5 outline-none font-sans text-xs text-brand-dark leading-relaxed resize-none focus:ring-2 focus:ring-brand/20"
                  />
                </div>

                {/* Right Footer */}
                <div className="flex items-start gap-2">
                  <label className="w-44 text-stone-500 text-right font-medium pt-1">Observaciones sobre empaque</label>
                  <textarea 
                    value={pickRemarks}
                    onChange={e => setPickRemarks(e.target.value)}
                    rows={2}
                    placeholder="Observaciones de empaque..."
                    className="flex-1 bg-white border border-border rounded p-1.5 outline-none font-sans text-xs text-brand-dark leading-relaxed resize-none focus:ring-2 focus:ring-brand/20"
                  />
                </div>
              </div>

              {/* SAP Action Buttons (OK / Cancelar) */}
              <div className="flex items-center gap-2 pt-1">
                <button 
                  onClick={() => handleSearchSapDocument(docNum)}
                  className="px-6 py-1 text-white font-semibold rounded-lg border border-brand cursor-pointer bg-brand hover:bg-brand-hover"
                >
                  OK
                </button>
                <button 
                  onClick={() => {
                    setDocNum('');
                    setProductNo('');
                    setProductDescription('');
                    setPlannedQuantity('1');
                    setRows([{ id: '1', itemCode: '', description: '', quantity: 1, price: 0, discount: 0, total: 0 }]);
                    setStatusMessage('● Ingrese un número de Orden de Fabricación y presione OK.');
                    setStatusType('info');
                  }}
                  className="px-4 py-1 bg-white hover:bg-cream-light text-brand-dark font-bold rounded border border-border shadow-sm cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div className="px-5 py-4 bg-white border-t border-border grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            
            {/* Left Footer */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <label className="w-32 text-stone-500 text-right font-medium">
                  {mode === 'Invoice' ? 'Empleado dpto.ventas' : 'Empleado de ventas'}
                </label>
                <div className="flex-1 flex items-center gap-1">
                  <input 
                    type="text"
                    value={salesEmployee}
                    onChange={e => setSalesEmployee(e.target.value)}
                    className="flex-1 bg-white border border-border rounded-md px-2 py-1 outline-none focus:border-brand-light font-medium text-brand-dark"
                  />
                  <span className="w-4 h-4 rounded-full bg-stone-100 border border-border flex items-center justify-center text-[9px] font-bold text-stone-500">i</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <label className="w-32 text-stone-500 text-right font-medium">Propietario</label>
                <input 
                  type="text"
                  value={owner}
                  onChange={e => setOwner(e.target.value)}
                  className="flex-1 bg-white border border-border rounded-md px-2 py-1 outline-none focus:border-brand-light font-medium text-brand-dark"
                />
              </div>

              <div className="flex items-start gap-2 pt-1">
                <label className="w-32 text-stone-500 text-right font-medium pt-1">Comentarios</label>
                <textarea 
                  value={comments}
                  onChange={e => setComments(e.target.value)}
                  rows={3}
                  placeholder="Comentarios u observaciones..."
                  className="flex-1 bg-white border border-border rounded p-1.5 outline-none font-sans text-xs text-brand-dark leading-relaxed resize-none focus:ring-2 focus:ring-brand/20"
                />
              </div>
            </div>

            {/* Right Footer Totals */}
            <div className="space-y-1 text-right">
              <div className="flex items-center justify-end gap-2">
                <span className="text-stone-500">Total antes del descuento:</span>
                <input 
                  type="text" 
                  value={formatMoney(subtotalRows)} 
                  readOnly 
                  className="w-40 bg-cream-light border border-border rounded px-1.5 py-0.5 text-right font-bold text-stone-600 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2">
                <span className="text-stone-500">Descuento</span>
                <input 
                  type="number" 
                  value={headerDiscountPct} 
                  onChange={e => setHeaderDiscountPct(Number(e.target.value))} 
                  className="w-14 bg-white border border-border rounded px-1 py-0.5 text-right outline-none"
                />
                <span>%</span>
                <input 
                  type="text" 
                  value={formatMoney(headerDiscountAmount)} 
                  readOnly 
                  className="w-36 bg-cream-light border border-border rounded px-1.5 py-0.5 text-right font-semibold text-stone-600 outline-none"
                />
              </div>

              {mode === 'Invoice' && (
                <div className="flex items-center justify-end gap-2">
                  <button className="px-1.5 py-0.5 bg-stone-100 hover:bg-stone-100 rounded text-[10px] font-bold text-stone-600 border border-border cursor-pointer">...</button>
                  <span className="text-stone-500">Anticipo total</span>
                  <input 
                    type="text" 
                    value={anticipoTotal} 
                    onChange={e => setAnticipoTotal(e.target.value)} 
                    className="w-36 bg-white border border-border rounded px-1.5 py-0.5 text-right outline-none font-bold text-brand-dark"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2">
                <span className="text-stone-500">Gastos adicionales:</span>
                <button className="px-1.5 py-0.5 bg-brand hover:bg-brand-hover rounded text-[9px] font-bold text-white border border-brand">=&gt;</button>
                <input 
                  type="number" 
                  value={additionalExpenses} 
                  onChange={e => setAdditionalExpenses(Number(e.target.value))} 
                  className="w-36 bg-white border border-border rounded px-1.5 py-0.5 text-right outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2">
                <label className="flex items-center gap-1 cursor-pointer text-stone-500">
                  <input 
                    type="checkbox" 
                    checked={rounding} 
                    onChange={e => setRounding(e.target.checked)} 
                    className="rounded text-brand-light focus:ring-0"
                  />
                  <span>Redondeo</span>
                </label>
                <input 
                  type="text" 
                  value="$ 0,00" 
                  readOnly 
                  className="w-36 bg-cream-light border border-border rounded px-1.5 py-0.5 text-right text-stone-500 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2">
                <span className="text-stone-500">Impuesto (IVA 19%):</span>
                <input 
                  type="text" 
                  value={formatMoney(vatTax)} 
                  readOnly 
                  className="w-40 bg-cream-light border border-border rounded px-1.5 py-0.5 text-right font-bold text-stone-600 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1 border-t border-border">
                <span className="text-sm font-bold text-brand-dark uppercase">Total:</span>
                <input 
                  type="text" 
                  value={formatMoney(grandTotal)} 
                  readOnly 
                  className="w-44 bg-sage-soft border border-brand-light rounded px-2 py-1 text-right font-bold text-sm text-brand-dark outline-none shadow-sm"
                />
              </div>
            </div>
          </div>
          )}

          {/* ── Bottom Action Buttons Bar ──────────────────────────────────────── */}
          <div className="px-5 py-4 bg-white border-t border-border flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <button 
                onClick={handleCreateDocument}
                className="px-6 py-1.5 text-white font-semibold rounded-lg border border-brand transition-all cursor-pointer bg-brand hover:bg-brand-hover"
              >
                Crear
              </button>
              <button className="px-5 py-1.5 bg-cream-light hover:bg-stone-100 text-stone-600 font-bold rounded border border-border shadow-sm transition-all cursor-pointer">
                Cancelar
              </button>
            </div>

            <div className="flex items-center gap-2">
              <select className="bg-cream-light border border-border rounded px-3 py-1 font-bold text-stone-600 cursor-pointer">
                <option value="">Copiar a...</option>
                <option value="orden">Orden de Venta</option>
                <option value="entrega">Entrega</option>
                <option value="factura">Factura de Clientes</option>
              </select>

              <select className="bg-cream-light border border-border rounded px-3 py-1 font-bold text-stone-600 cursor-pointer">
                <option value="">Copiar de...</option>
                <option value="oportunidad">Oportunidad de Venta</option>
              </select>
            </div>
          </div>

        </div>
      </div>

      {/* ── 5. Bottom SAP Operational Status Bar ─────────────────────────────── */}
      <div className={`mt-4 border border-border rounded-xl px-4 py-2.5 text-xs font-medium flex items-center justify-between ${
        statusType === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' :
        statusType === 'error' ? 'bg-rose-50 text-rose-800 border-rose-300' :
        'bg-white text-stone-500'
      }`}>
        <span>{statusMessage}</span>
        <span className="text-[11px] text-stone-500 font-medium">
          SAP Business One
        </span>
      </div>

      {/* 🗂️ Document List Modal */}
      {isDocListModalOpen && (
        <div className="fixed inset-0 bg-brand-dark/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-[0_30px_60px_-20px_rgba(37,65,83,0.45)] border border-border w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-white border-b border-border text-brand-dark px-4 py-3 font-semibold text-sm flex justify-between items-center">
              <span>SAP B1 - Lista de Pedidos de cliente</span>
              <button onClick={() => setIsDocListModalOpen(false)} className="hover:text-brand-light"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-3">
              <div className="border border-border rounded overflow-hidden">
                <div className="max-h-80 overflow-y-auto">
                  <table className="w-full text-left text-xs whitespace-nowrap">
                    <thead className="bg-cream-light border-b sticky top-0">
                      <tr>
                        <th className="p-2 font-semibold">#</th>
                        <th className="p-2 font-semibold">Fecha</th>
                        <th className="p-2 font-semibold">Cliente</th>
                        <th className="p-2 font-semibold">Nombre del Cliente</th>
                        <th className="p-2 font-semibold text-right">Total del documento</th>
                        <th className="p-2 font-semibold">Ref OC/COT</th>
                        <th className="p-2 font-semibold">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {isDocListLoading ? (
                        <tr>
                          <td colSpan={7} className="text-center p-8 text-stone-500 font-medium">Cargando documentos...</td>
                        </tr>
                      ) : docListResults.length > 0 ? (
                        docListResults.map((doc, idx) => (
                          <tr 
                            key={idx} 
                            onClick={() => {
                              handleSearchSapDocument(String(doc.DocNum || doc.DocumentNumber));
                              setIsDocListModalOpen(false);
                            }}
                            className="border-b last:border-b-0 hover:bg-sage-soft/50 cursor-pointer transition-colors"
                          >
                            <td className="p-2 font-bold text-brand-dark">{doc.DocNum || doc.DocumentNumber}</td>
                            <td className="p-2 text-stone-500">{doc.DocDate || doc.PostingDate}</td>
                            <td className="p-2 text-stone-500 font-medium">{doc.CardCode || doc.CustomerCode}</td>
                            <td className="p-2 text-stone-500 truncate max-w-[200px]">{doc.CardName || doc.ProductDescription}</td>
                            <td className="p-2 text-right font-bold text-stone-600">{(doc.DocTotal !== undefined ? formatMoney(doc.DocTotal) : doc.PlannedQuantity)}</td>
                            <td className="p-2 text-stone-500">{doc.NumAtCard || '-'}</td>
                            <td className="p-2 text-stone-500">{doc.DocumentStatus || doc.ProductionOrderStatus || 'bost_Open'}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7} className="text-center p-8 text-stone-500 font-medium">No se encontraron documentos relacionados a la búsqueda.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              
              <div className="mt-3 flex justify-end gap-2">
                <button 
                  onClick={() => setIsDocListModalOpen(false)}
                  className="px-4 py-1.5 bg-stone-100 hover:bg-stone-100 text-stone-600 font-bold rounded border border-border shadow-sm text-xs"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Customer Search Modal ─────────────────────────────────────────────── */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 bg-brand-dark/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-[0_30px_60px_-20px_rgba(37,65,83,0.45)] border border-border w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-white border-b border-border text-brand-dark px-4 py-3 font-semibold text-sm flex justify-between items-center">
              <span>SAP B1 - Selección de Clientes</span>
              <button onClick={() => setIsCustomerModalOpen(false)} className="hover:text-brand-light"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-3">
              <div className="flex items-center px-2 py-1 bg-cream-light border border-border rounded mb-3">
                <Search className="w-4 h-4 text-stone-400 mr-2" />
                <input 
                  type="text"
                  placeholder="Buscar por Nombre o Código de Cliente..."
                  value={customerSearchQuery}
                  onChange={e => setCustomerSearchQuery(e.target.value)}
                  className="bg-transparent text-xs outline-none w-full"
                  autoFocus
                />
              </div>

              <div className="max-h-60 overflow-y-auto border border-border/70 rounded">
                <table className="w-full text-left text-xs">
                  <thead className="bg-cream-light border-b">
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
                          className="hover:bg-sage-soft cursor-pointer"
                        >
                          <td className="p-2 font-bold text-brand">{c.cardCode}</td>
                          <td className="p-2 font-medium text-brand-dark">{c.cardName}</td>
                          <td className="p-2 text-stone-500">{c.nit}</td>
                          <td className="p-2 text-stone-500">{c.contact}</td>
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
        <div className="fixed inset-0 bg-brand-dark/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-[0_30px_60px_-20px_rgba(37,65,83,0.45)] border border-border w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-white border-b border-border text-brand-dark px-4 py-3 font-semibold text-sm flex justify-between items-center">
              <span>SAP B1 - Lista de Artículos (Inventario Firplak)</span>
              <button onClick={() => setIsItemModalOpen(false)} className="hover:text-brand-light"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-3">
              <div className="flex items-center px-2 py-1 bg-cream-light border border-border rounded mb-3">
                <Search className="w-4 h-4 text-stone-400 mr-2" />
                <input 
                  type="text"
                  placeholder="Buscar por Código de Artículo o Descripción..."
                  value={itemSearchQuery}
                  onChange={e => setItemSearchQuery(e.target.value)}
                  className="bg-transparent text-xs outline-none w-full"
                  autoFocus
                />
              </div>

              <div className="max-h-72 overflow-y-auto border border-border/70 rounded">
                <table className="w-full text-left text-xs">
                  <thead className="bg-cream-light border-b">
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
                          className="hover:bg-sage-soft cursor-pointer"
                        >
                          <td className="p-2 font-bold text-brand">{item.itemCode}</td>
                          <td className="p-2 font-medium text-brand-dark">{item.description}</td>
                          <td className="p-2 text-right font-bold text-brand-dark">{formatMoney(item.price)}</td>
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
          className="fixed bg-white border border-border shadow-2xl rounded py-1 z-50 text-xs text-brand-dark w-56 animate-in fade-in zoom-in-95"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          {Boolean(cardCode && cardCode.trim() && docNum && docNum.trim()) ? (
            <>
              <button 
                className="w-full text-left px-3 py-1.5 hover:bg-sage-soft flex items-center gap-2 text-stone-600"
                onClick={() => { setContextMenu(null); alert('Duplicar documento SAP'); }}
              >
                <span className="w-4 text-center">📋</span> Duplicar
              </button>
              <button 
                className="w-full text-left px-3 py-1.5 hover:bg-sage-soft flex items-center gap-2 text-stone-600"
                onClick={() => { setContextMenu(null); alert('Documento destino'); }}
              >
                <span className="w-4 text-center">➡️</span> Documento destino...
              </button>
              <button 
                className="w-full text-left px-3 py-1.5 hover:bg-sage-soft flex items-center gap-2 text-stone-600"
                onClick={() => { setContextMenu(null); alert('Info detallada de fila'); }}
              >
                <span className="w-4 text-center">🔍</span> Info detallada de fila...
              </button>
              <div className="border-t border-border/70 my-1"></div>
              <button 
                className="w-full text-left px-3 py-1.5 hover:bg-sage-soft flex items-center gap-2 text-stone-600"
                onClick={() => { setContextMenu(null); alert('Actividad nueva'); }}
              >
                <span className="w-4 text-center">📅</span> Actividad nueva
              </button>
              <button 
                className="w-full text-left px-3 py-1.5 hover:bg-sage-soft flex items-center gap-2 text-stone-600"
                onClick={() => { setContextMenu(null); alert('Ganancia bruta'); }}
              >
                <span className="w-4 text-center">📊</span> Ganancia bruta...
              </button>
              <button 
                className="w-full text-left px-3 py-1.5 hover:bg-sage-soft flex items-center gap-2 text-stone-600"
                onClick={() => { setContextMenu(null); alert('Cálculo de volumen y peso'); }}
              >
                <span className="w-4 text-center">⚖️</span> Cálculo de volumen y peso...
              </button>
              <div className="border-t border-border/70 my-1"></div>
              <button 
                className="w-full text-left px-3 py-1.5 hover:bg-sage-soft font-bold text-brand bg-sage-soft/50 flex items-center gap-2"
                onClick={() => { setContextMenu(null); setIsComentariosModalOpen(true); }}
              >
                <span className="w-4 text-center">📝</span> Comentarios iniciales y finales...
              </button>
              <button 
                className="w-full text-left px-3 py-1.5 hover:bg-sage-soft flex items-center gap-2 text-stone-600"
                onClick={() => { setContextMenu(null); alert('Actividades relacionadas'); }}
              >
                <span className="w-4 text-center">📌</span> Actividades relacionadas
              </button>
              <button 
                className="w-full text-left px-3 py-1.5 hover:bg-sage-soft flex items-center gap-2 text-stone-600"
                onClick={() => { setContextMenu(null); alert('Oportunidades relacionadas'); }}
              >
                <span className="w-4 text-center">🎯</span> Oportunidades relacionadas
              </button>
              <button 
                className="w-full text-left px-3 py-1.5 hover:bg-sage-soft font-bold text-brand bg-blue-50/50 flex items-center gap-2"
                onClick={() => { setContextMenu(null); setIsMapaRelacionesModalOpen(true); }}
              >
                <span className="w-4 text-center">🌿</span> Mapa de relaciones...
              </button>
            </>
          ) : (
            <>
              <button 
                className="w-full text-left px-3 py-1.5 hover:bg-sage-soft flex items-center gap-2 text-stone-600"
                onClick={() => { setContextMenu(null); alert('Actividad nueva'); }}
              >
                <span className="w-4 text-center">📅</span> Actividad nueva
              </button>
              <button 
                className="w-full text-left px-3 py-1.5 hover:bg-sage-soft flex items-center gap-2 text-stone-600"
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
        <div className="fixed inset-0 bg-brand-dark/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-[0_30px_60px_-20px_rgba(37,65,83,0.45)] border border-border w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-white border-b border-border text-brand-dark px-4 py-3 font-semibold text-sm flex justify-between items-center">
              <span className="flex items-center gap-2">
                <span>📝</span> Comentarios iniciales y finales - Documento Nº {docNum || 'Nuevo'}
              </span>
              <button onClick={() => setIsComentariosModalOpen(false)} className="hover:text-brand-light text-sm"><X className="w-4 h-4" /></button>
            </div>

            <div className="p-4 space-y-4 text-xs bg-cream-light">
              <div className="bg-white p-3 border border-border/70 rounded shadow-xs space-y-1">
                <label className="font-bold text-stone-600 block">Comentarios iniciales (Encabezado)</label>
                <textarea 
                  value={openingRemarks}
                  onChange={(e) => setOpeningRemarks(e.target.value)}
                  rows={4}
                  placeholder="Ingrese los comentarios iniciales del documento..."
                  className="w-full border border-border rounded p-2 outline-none font-sans text-xs text-brand-dark leading-relaxed resize-none focus:ring-2 focus:ring-brand/20 bg-cream-light/30"
                />
              </div>

              <div className="bg-white p-3 border border-border/70 rounded shadow-xs space-y-1">
                <label className="font-bold text-stone-600 block">Comentarios finales (Pie de página / Observaciones)</label>
                <textarea 
                  value={closingRemarks}
                  onChange={(e) => setClosingRemarks(e.target.value)}
                  rows={4}
                  placeholder="Ingrese los comentarios finales del documento..."
                  className="w-full border border-border rounded p-2 outline-none font-sans text-xs text-brand-dark leading-relaxed resize-none focus:ring-2 focus:ring-brand/20 bg-cream-light/30"
                />
              </div>
            </div>

            <div className="p-3 bg-cream-light border-t border-border/70 flex justify-end gap-2 text-xs">
              <button 
                onClick={() => {
                  setComments(closingRemarks);
                  setIsComentariosModalOpen(false);
                }}
                className="px-4 py-1.5 bg-brand hover:bg-brand-hover text-white font-semibold rounded-lg border border-brand"
              >
                OK
              </button>
              <button 
                onClick={() => setIsComentariosModalOpen(false)}
                className="px-4 py-1.5 bg-white hover:bg-cream-light text-stone-600 font-semibold rounded border border-border"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Mapa de relaciones (lectura en vivo desde SAP) ─────────────── */}
      {isMapaRelacionesModalOpen && (
        <div className="fixed inset-0 bg-brand-dark/40 backdrop-blur-xs flex items-center justify-center z-50 p-4" onClick={() => setIsMapaRelacionesModalOpen(false)}>
          <div
            className="bg-white rounded-2xl shadow-[0_30px_60px_-20px_rgba(37,65,83,0.45)] border border-border w-full max-w-6xl overflow-hidden animate-in fade-in zoom-in-95 flex flex-col max-h-[92vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-9 h-9 rounded-xl bg-sage-soft text-brand flex items-center justify-center shrink-0">
                  <GitBranch className="w-4 h-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-brand-dark">Mapa de relaciones</p>
                  <p className="text-xs text-stone-500 truncate">
                    {cardName ? `${cardName} · ${cardCode}` : cardCode || '—'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsMapaRelacionesModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-stone-400 hover:text-brand hover:bg-cream-light transition-colors cursor-pointer"
                title="Cerrar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 bg-cream-light flex-1 overflow-auto relative min-h-[360px] text-[11px]">
              {isLoadingMap && (
                <div className="absolute inset-0 z-10 flex items-center justify-center gap-3">
                  <div className="w-6 h-6 border-[3px] border-border border-t-brand rounded-full animate-spin"></div>
                  <span className="text-sm text-stone-500">Recorriendo documentos vinculados…</span>
                </div>
              )}
              {relationshipMap ? (
                <MapaRelaciones
                  map={relationshipMap}
                  onOpen={(n) => {
                    const target = SAP_DOC_TYPES[n.type].classicMode;
                    if (target) navigateToDocument(String(n.docNum), target);
                  }}
                />
              ) : (
                !isLoadingMap && (
                  <p className="text-center text-sm text-stone-500 py-20">No se encontraron documentos vinculados para este documento.</p>
                )
              )}
            </div>

            <div className="px-5 py-3 border-t border-border flex items-center justify-between text-xs text-stone-400">
              <span>Clic en un documento para abrirlo</span>
              <button
                onClick={() => setIsMapaRelacionesModalOpen(false)}
                className="h-9 px-5 rounded-xl bg-brand hover:bg-brand-hover text-white text-xs font-semibold cursor-pointer"
              >
                Listo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Document Viewer Modal ────────────────────────────────────────────── */}
      {isDocumentViewerOpen && (
        <div className="fixed inset-0 bg-brand-dark/40 z-50 flex items-center justify-center p-4">
          <div className="bg-stone-100 rounded-md shadow-2xl w-full max-w-6xl h-[95vh] flex flex-col border border-border overflow-hidden">
            
            {/* Toolbar */}
            <div className="bg-brand text-white p-2 px-4 flex items-center justify-between text-sm shadow-md z-10">
              <div className="flex items-center gap-3">
                <span className="font-semibold text-stone-200">Rem. 91253.pdf</span>
                <span className="text-stone-400 text-xs bg-white/15 px-2 py-0.5 rounded">Visualizador PDF</span>
              </div>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setIsDocumentViewerOpen(false)}
                  className="hover:bg-red-500 hover:text-white text-stone-400 p-1 px-2 rounded font-bold transition-colors"
                >
                  ✕ Cerrar
                </button>
              </div>
            </div>

            {/* Document Content Area */}
            <div className="flex-1 bg-cream relative">
              <iframe 
                src={`/api/sap/attachments?path=${encodeURIComponent('\\\\PES\\Adjuntossap\\Rem. 91253.pdf')}`}
                className="w-full h-full border-0"
                title="Visor de Anexo"
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
