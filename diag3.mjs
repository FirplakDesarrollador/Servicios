process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const SAP = 'https://200.7.96.194:50000/b1s/v1';
const CODE = 'VBAN01-0038-000-0100';
async function run() {
  const lr = await fetch(SAP+'/Login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({CompanyDB:'Firplak_SA',UserName:'manager',Password:'2023Fir#.*'})});
  const cookie = lr.headers.get('set-cookie');
  const h = {'Cookie':cookie,'Prefer':'odata.maxpagesize=20'};

  // Ver estructura real de SQLQueries
  const sq = await fetch(SAP+'/SQLQueries',{headers:h});
  const d = await sq.json();
  const qs = d.value || [];
  console.log('TOTAL QUERIES:', qs.length);
  console.log('KEYS del primer registro:', Object.keys(qs[0] || {}));
  qs.forEach((q,i) => console.log('Q'+i+':', JSON.stringify(q).slice(0,200)));

  // Probar Item sin 
  const it2 = await fetch(SAP+"/Items('"+CODE+"')",{headers:h});
  console.log('\nItem sin select:', it2.status);
  if(it2.ok){const d2=await it2.json();console.log('Keys:',Object.keys(d2).slice(0,20).join(', '));}
  else console.log(await it2.text().then(t=>t.slice(0,200)));
}
run().catch(e=>console.error(e.message));
