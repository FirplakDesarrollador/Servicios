process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const S = 'https://200.7.96.194:50000/b1s/v1';
(async () => {
  const l = await fetch(S+'/Login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({CompanyDB:'Firplak_SA',UserName:'manager',Password:'2023Fir#.*'})});
  const c = l.headers.get('set-cookie');
  const h = {Cookie:c,'Content-Type':'application/json'};
  // 1. Borrar query existente
  const del = await fetch(S+'/SQLQueries(\'ldm_costos_bom\')',{method:'DELETE',headers:h});
  console.log('Delete:', del.status);
  // 2. Probar columnas OITM
  const colTests = ['InvntryUom','InvntryUOM','InventoryUOM','ItemName'];
  for(const col of colTests){
    const r = await fetch(S+'/SQLQueries',{method:'POST',headers:h,body:JSON.stringify({SqlCode:'tmp_oitm',SqlName:'tmp',SqlText:'SELECT TOP 1 T3.'+col+' FROM OITM T3 WHERE T3.ItemCode = \'VBAN01-0038-000-0100\'',ParamList:null})});
    const rt = await r.text();
    console.log('OITM.'+col+': '+r.status+(r.ok?' OK':(' '+JSON.parse(rt).error.message.value.slice(0,60))));
    if(r.ok) await fetch(S+'/SQLQueries(\'tmp_oitm\')',{method:'DELETE',headers:h});
  }
})().catch(e => console.error(e.message));