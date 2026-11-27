process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const S = 'https://200.7.96.194:50000/b1s/v1';
const SQL = 'SELECT T2.Code AS Codigo_Padre, T1.Code AS Codigo, T1.ItemName AS Descripcion, T1.Uom AS UnidadMedida, T1.VisOrder AS Nivel, T1.Quantity AS Cantidad, ISNULL(T3.AvgPrice,0) AS Costo_Unitario, 0 AS Costo_Mp, 0 AS Costo_Mo, 0 AS Costo_Cif FROM OITT T2 INNER JOIN ITT1 T1 ON T2.Code = T1.Father LEFT JOIN OITM T3 ON T1.Code = T3.ItemCode WHERE T2.Code >= :code1 AND T2.Code <= :code2 ORDER BY T2.Code, T1.VisOrder, T1.Code';
(async () => {
  const l = await fetch(S+'/Login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({CompanyDB:'Firplak_SA',UserName:'manager',Password:'2023Fir#.*'})});
  const c = l.headers.get('set-cookie');
  const h = {Cookie:c,'Content-Type':'application/json'};
  // Check if exists
  const sq = await fetch(S+'/SQLQueries',{headers:h});
  const qs = await sq.json();
  const ex = qs.value.find(q => q.SqlCode === 'ldm_costos_bom');
  if(ex) {
     console.log('Deleting existing...');
     await fetch(S+'/SQLQueries(\'ldm_costos_bom\')',{method:'DELETE',headers:h});
  }
  const cr = await fetch(S+'/SQLQueries',{method:'POST',headers:h,body:JSON.stringify({SqlCode:'ldm_costos_bom',SqlName:'LDM Costos BOM Multi-Nivel',SqlText:SQL,ParamList:'code1,code2'})});
  console.log('Create:', cr.status, await cr.text());
})().catch(console.error);