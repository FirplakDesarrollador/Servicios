process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
const S = "https://200.7.96.194:50000/b1s/v1";
const SQL = "SELECT T2.Code AS Codigo_Padre, T1.Code AS Codigo, T1.Dscription AS Descripcion, T1.UomCode AS UnidadMedida, T1.Level AS Nivel, T1.Quantity AS Cantidad, ISNULL(T3.LastEvalPrice,0) AS Costo_Unitario, ISNULL(T3.LastEvalPrice,0) * T1.Quantity AS Costo_Mp, 0 AS Costo_Mo, 0 AS Costo_Cif FROM OITT T2 INNER JOIN ITT1 T1 ON T2.Code = T1.Father LEFT JOIN OITM T3 ON T1.Code = T3.ItemCode WHERE T2.Code >= :code1 AND T2.Code <= :code2 ORDER BY T2.Code, T1.Level, T1.Code";
const CODE1 = "VBAN01-0038-000-0100";
(async () => {
  const l = await fetch(S+"/Login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({CompanyDB:"Firplak_SA",UserName:"manager",Password:"2023Fir#.*"})});
  const c = l.headers.get("set-cookie") as string;
  console.log("Login:", l.status);
  const h: any = {Cookie:c,"Content-Type":"application/json"};
  // Crear la SQLQuery en SAP
  const cr = await fetch(S+"/SQLQueries",{method:"POST",headers:h,body:JSON.stringify({SqlCode:"ldm_costos_bom",SqlName:"LDM Costos BOM Multi-Nivel",SqlText:SQL,ParamList:"code1,code2"})});
  console.log("Create SQLQuery:", cr.status, await cr.text().then((t:string)=>t.slice(0,400)));
  // Probar la query recien creada
  const tr = await fetch(S+"/SQLQueries("+JSON.stringify("ldm_costos_bom")+")/List?code1="+JSON.stringify(CODE1)+"&code2="+JSON.stringify(CODE1),{headers:{Cookie:c,Prefer:"odata.maxpagesize=200"}});
  console.log("Test query:", tr.status, await tr.text().then((t:string)=>t.slice(0,500)));
})().catch((e:any)=>console.error(e.message));
