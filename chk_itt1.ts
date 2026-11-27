process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const S = 'https://200.7.96.194:50000/b1s/v1';
(async () => {
  const l = await fetch(S+'/Login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({CompanyDB:'Firplak_SA',UserName:'manager',Password:'2023Fir#.*'})});
  const c = l.headers.get('set-cookie');
  const h = {Cookie:c,'Content-Type':'application/json'};
  const cols = ['Father','Code','Quantity','Level','Uom','UoMEntry','CmpntDesc','ItemName','ItemCode','CompIndex','VisOrder','RelEntry'];
  const valid = [];
  for(const col of cols){
    const r = await fetch(S+'/SQLQueries',{method:'POST',headers:h,body:JSON.stringify({SqlCode:'tmp_test',SqlName:'tmp',SqlText:'SELECT TOP 1 T1.'+col+' FROM ITT1 T1 WHERE T1.Father = \'VBAN01-0038-000-0100\'',ParamList:null})});
    const rt = await r.text();
    if(r.ok){
      console.log('✅ '+col);
      valid.push(col);
      await fetch(S+'/SQLQueries(\'tmp_test\')',{method:'DELETE',headers:h});
    } else {
      const e = JSON.parse(rt);
      console.log('❌ '+col+': '+e.error.message.value.slice(0,60));
    }
  }
  console.log('Valid cols:', valid.join(', '));
})().catch(e => console.error(e.message));