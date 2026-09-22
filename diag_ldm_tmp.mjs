process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const SAP = 'https://200.7.96.194:50000/b1s/v1';
const CODE = 'VBAN01-0038-000-0100';
async function run() {
  const lr = await fetch(SAP+'/Login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({CompanyDB:'Firplak_SA',UserName:'manager',Password:'2023Fir#.*'})});
  if(!lr.ok){console.log('Login error:',await lr.text());return;}
  const cookie = lr.headers.get('set-cookie');
  console.log('Login OK');
  const h = {'Cookie':cookie,'Prefer':'odata.maxpagesize=20','Accept':'application/json'};
  const s1 = await fetch(SAP+'/SQLQueries?=30',{headers:h});
  console.log('SQLQueries list:', s1.status);
  if(s1.ok){const d=await s1.json();(d.value||[]).forEach(q=>console.log('  QID:',q.QueryId,'Desc:',q.QueryDescription||q.InternalKey));}
  else console.log(await s1.text().then(t=>t.slice(0,300)));
  const s2 = await fetch(SAP+'/Items('+JSON.stringify(CODE)+')?=ItemCode,ItemName',{headers:h});
  console.log('Item exists:', s2.status, s2.ok? (await s2.json().then(d=>d.ItemCode)) : await s2.text().then(t=>t.slice(0,150)));
  const s3 = await fetch(SAP+'/ItemTreeLines?=ParentItem eq '+JSON.stringify(CODE),{headers:h});
  console.log('ItemTreeLines:', s3.status, await s3.text().then(t=>t.slice(0,400)));
}
run().catch(e=>console.error(e.message));
