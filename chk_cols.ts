process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const S = 'https://200.7.96.194:50000/b1s/v1';
(async () => {
  const l = await fetch(S+'/Login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({CompanyDB:'Firplak_SA',UserName:'manager',Password:'2023Fir#.*'})});
  const c = l.headers.get('set-cookie');
  const h = {Cookie:c,'Content-Type':'application/json'};
  // Test con descripcion correcta - probar diferentes nombres de campo
  const tests = [
    'SELECT TOP 1 T1.Father, T1.Code, T1.ItemName AS Descripcion, T1.UomCode, T1.Level, T1.Quantity FROM ITT1 T1 WHERE T1.Father = \'VBAN01-0038-000-0100\'',
    'SELECT TOP 1 T1.Father, T1.Code, T1.Dscription AS Descripcion, T1.UomCode, T1.Level, T1.Quantity FROM ITT1 T1 WHERE T1.Father = \'VBAN01-0038-000-0100\'',
    'SELECT TOP 1 * FROM ITT1 T1 WHERE T1.Father = \'VBAN01-0038-000-0100\'',
  ];
  for(let i=0;i<tests.length;i++){
    const r = await fetch(S+'/SQLQueries',{method:'POST',headers:h,body:JSON.stringify({SqlCode:'test_col_'+i,SqlName:'test '+i,SqlText:tests[i],ParamList:null})});
    const rt = await r.text();
    console.log('Test'+i+': '+r.status+' '+rt.slice(0,300));
    if(r.ok){
      const tr = await fetch(S+'/SQLQueries(\'test_col_'+i+'\')/List',{headers:{Cookie:c,Prefer:'odata.maxpagesize=5'}});
      const td = await tr.json();
      if(td.value && td.value[0]) console.log('  Keys:', Object.keys(td.value[0]).join(', '));
    }
  }
})().catch(e => console.error(e.message));