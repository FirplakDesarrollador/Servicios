process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const SAP = 'https://200.7.96.194:50000/b1s/v1';
const CODE = 'VBAN01-0038-000-0100';
async function run() {
  const lr = await fetch(SAP+'/Login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({CompanyDB:'Firplak_SA',UserName:'manager',Password:'2023Fir#.*'})});
  const cookie = lr.headers.get('set-cookie');
  console.log('Login:', lr.status);
  const h = {'Cookie':cookie,'Prefer':'odata.maxpagesize=20'};

  // 1. Listar SQLQueries sin filtros OData
  const sq = await fetch(SAP+'/SQLQueries',{headers:h});
  console.log('\n1. SQLQueries list:', sq.status);
  if(sq.ok){const d=await sq.json();const qs=d.value||[];console.log('Total queries:',qs.length);qs.slice(0,15).forEach(q=>console.log('  KEY:',q.InternalKey,'|',q.QueryDescription));}
  else console.log(await sq.text().then(t=>t.slice(0,200)));

  // 2. Item con comillas simples correctas
  const it = await fetch(SAP+"/Items('"+CODE+"')?=ItemCode,ItemName,InventoryUOM,AvgPrice",{headers:h});
  console.log('\n2. Item:', it.status);
  if(it.ok){const d=await it.json();console.log('  ItemCode:',d.ItemCode,'|',d.ItemName,'| Costo promedio:',d.AvgPrice);}
  else console.log(await it.text().then(t=>t.slice(0,200)));

  // 3. Intentar BOM via SQLQuery POST con parametros
  const sqp = await fetch(SAP+"/SQLQueries('costo_actual_producto_terminado')/List",{method:'POST',headers:{...h,'Content-Type':'application/json'},body:JSON.stringify({ParamList:[{Name:'code1',Value:CODE},{Name:'code2',Value:CODE}]})});
  console.log('\n3. SQLQuery POST:', sqp.status, await sqp.text().then(t=>t.slice(0,300)));
}
run().catch(e=>console.error(e.message));
