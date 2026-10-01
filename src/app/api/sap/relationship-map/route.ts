import { NextResponse } from 'next/server';
import { getSapSessionCookie } from '@/lib/sapServiceLayer';

const SAP_BASE_URL = process.env.SAP_BASE_URL || 'https://200.7.96.194:50000/b1s/v1';

const MEGA_QUERY = `
SELECT 'Quotation' AS "DocType", T0."DocEntry", T0."DocNum", T0."DocDate", T0."DocTotal", T0."CANCELED" 
FROM OQUT T0 INNER JOIN RDR1 T1 ON T0."DocEntry" = T1."BaseEntry" 
WHERE T1."DocEntry" = :orderDocEntry AND T1."BaseType" = 23
UNION
SELECT 'Order' AS "DocType", "DocEntry", "DocNum", "DocDate", "DocTotal", "CANCELED" 
FROM ORDR 
WHERE "DocEntry" = :orderDocEntry
UNION
SELECT 'Delivery' AS "DocType", T0."DocEntry", T0."DocNum", T0."DocDate", T0."DocTotal", T0."CANCELED" 
FROM ODLN T0 INNER JOIN DLN1 T1 ON T0."DocEntry" = T1."DocEntry" 
WHERE T1."BaseEntry" = :orderDocEntry AND T1."BaseType" = 17
UNION
SELECT 'Invoice' AS "DocType", T0."DocEntry", T0."DocNum", T0."DocDate", T0."DocTotal", T0."CANCELED" 
FROM OINV T0 INNER JOIN INV1 T1 ON T0."DocEntry" = T1."DocEntry" 
WHERE T1."BaseEntry" = :orderDocEntry AND T1."BaseType" = 17
UNION
SELECT 'Invoice' AS "DocType", T0."DocEntry", T0."DocNum", T0."DocDate", T0."DocTotal", T0."CANCELED" 
FROM OINV T0 INNER JOIN INV1 T1 ON T0."DocEntry" = T1."DocEntry" 
INNER JOIN DLN1 T2 ON T1."BaseEntry" = T2."DocEntry" AND T1."BaseType" = 15
WHERE T2."BaseEntry" = :orderDocEntry AND T2."BaseType" = 17
UNION
SELECT 'ProductionOrder' AS "DocType", "DocEntry", "DocNum", "PostDate" AS "DocDate", 0 AS "DocTotal", "Status" AS "CANCELED" 
FROM OWOR 
WHERE "OriginNum" = (SELECT "DocNum" FROM ORDR WHERE "DocEntry" = :orderDocEntry)
`.trim().replace(/\n/g, ' ');

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const docNum = searchParams.get('docNum');
    const type = searchParams.get('type') || 'Order';

    if (!docNum) {
      return NextResponse.json({ error: 'Falta el parámetro docNum' }, { status: 400 });
    }

    const cookie = await getSapSessionCookie();
    let orderDocEntry = '';

    // 1. Resolve Order DocEntry based on what type of document the user is currently viewing
    if (type === 'Order') {
      const oRes = await fetch(`${SAP_BASE_URL}/Orders?$filter=DocNum eq ${docNum}&$select=DocEntry`, { headers: { 'Cookie': cookie } });
      const oData = await oRes.json();
      if (oData.value && oData.value.length > 0) orderDocEntry = String(oData.value[0].DocEntry);
    } else if (type === 'Quotation') {
      const qRes = await fetch(`${SAP_BASE_URL}/Quotations?$filter=DocNum eq ${docNum}&$select=DocEntry`, { headers: { 'Cookie': cookie } });
      const qData = await qRes.json();
      if (qData.value && qData.value.length > 0) {
        const quoteEntry = qData.value[0].DocEntry;
        // Find order based on this quotation
        const fbRes = await fetch(`${SAP_BASE_URL}/SQLQueries('AGY_GetOrderFromQuote')/List?quoteEntry='${quoteEntry}'`, { headers: { 'Cookie': cookie } });
        const fbData = await fbRes.json();
        if (fbData.error) {
           await fetch(`${SAP_BASE_URL}/SQLQueries`, {
              method: 'POST',
              headers: { 'Cookie': cookie, 'Content-Type': 'application/json' },
              body: JSON.stringify({ SqlCode: 'AGY_GetOrderFromQuote', SqlName: 'AGY_GetOrderFromQuote', SqlText: 'SELECT DocEntry FROM ORDR WHERE DocEntry IN (SELECT DocEntry FROM RDR1 WHERE BaseEntry = :quoteEntry AND BaseType = 23)' })
           });
           const fbRes2 = await fetch(`${SAP_BASE_URL}/SQLQueries('AGY_GetOrderFromQuote')/List?quoteEntry='${quoteEntry}'`, { headers: { 'Cookie': cookie } });
           const fbData2 = await fbRes2.json();
           if (fbData2.value && fbData2.value.length > 0) orderDocEntry = String(fbData2.value[0].DocEntry);
        } else if (fbData.value && fbData.value.length > 0) {
           orderDocEntry = String(fbData.value[0].DocEntry);
        }
      }
    } else if (type === 'Delivery') {
      const dRes = await fetch(`${SAP_BASE_URL}/DeliveryNotes?$filter=DocNum eq ${docNum}&$select=DocumentLines`, { headers: { 'Cookie': cookie } });
      const dData = await dRes.json();
      if (dData.value && dData.value.length > 0 && dData.value[0].DocumentLines) {
         const baseEntry = dData.value[0].DocumentLines.find((l: any) => l.BaseType === 17)?.BaseEntry;
         if (baseEntry) orderDocEntry = String(baseEntry);
      }
    } else if (type === 'Invoice') {
      const iRes = await fetch(`${SAP_BASE_URL}/Invoices?$filter=DocNum eq ${docNum}&$select=DocumentLines`, { headers: { 'Cookie': cookie } });
      const iData = await iRes.json();
      if (iData.value && iData.value.length > 0 && iData.value[0].DocumentLines) {
         const baseLine = iData.value[0].DocumentLines[0];
         if (baseLine.BaseType === 17) {
            orderDocEntry = String(baseLine.BaseEntry);
         } else if (baseLine.BaseType === 15) {
            const dRes = await fetch(`${SAP_BASE_URL}/DeliveryNotes(${baseLine.BaseEntry})?$select=DocumentLines`, { headers: { 'Cookie': cookie } });
            const dData = await dRes.json();
            if (dData.DocumentLines) {
               const baseEntry = dData.DocumentLines.find((l: any) => l.BaseType === 17)?.BaseEntry;
               if (baseEntry) orderDocEntry = String(baseEntry);
            }
         }
      }
    }

    if (!orderDocEntry) {
      // If we couldn't resolve the order, return empty for now
      return NextResponse.json({ nodes: [] });
    }

    // 2. Fetch the Relationship Map using SQLQueries
    const sqlPayload = {
      SqlCode: "AGY_RelationMap",
      SqlName: "AGY_RelationMap",
      SqlText: MEGA_QUERY
    };
    
    let res = await fetch(`${SAP_BASE_URL}/SQLQueries`, {
      method: 'POST',
      headers: { 'Cookie': cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify(sqlPayload)
    });
    
    if (res.status === 400 || res.status === 409) {
      await fetch(`${SAP_BASE_URL}/SQLQueries('AGY_RelationMap')`, {
        method: 'PATCH',
        headers: { 'Cookie': cookie, 'Content-Type': 'application/json' },
        body: JSON.stringify({ SqlText: sqlPayload.SqlText })
      });
    }

    res = await fetch(`${SAP_BASE_URL}/SQLQueries('AGY_RelationMap')/List?orderDocEntry='${orderDocEntry}'`, {
      headers: { 'Cookie': cookie }
    });
    
    const mapData = await res.json();
    if (mapData.error) {
      console.error('Error fetching map from SAP SQLQueries:', mapData.error);
      return NextResponse.json({ error: mapData.error.message?.value || 'Error in SAP Query' }, { status: 500 });
    }

    return NextResponse.json({ nodes: mapData.value || [] });

  } catch (error: any) {
    console.error('Relationship map API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
