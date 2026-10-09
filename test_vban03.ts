import { getSapSessionCookie } from './src/lib/sapServiceLayer.ts';

async function test() {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  const cookie = await getSapSessionCookie();
  const code = 'VBAN03-0680-000-0103';
  const url = `https://200.7.96.194:50000/b1s/v1/SQLQueries('ldm_costos_bom')/List?code1='${code}'&code2='${code}'`;
  
  console.log('Fetching:', url);
  const res = await fetch(url, {
    method: 'GET',
    headers: { 'Cookie': cookie, 'Prefer': 'odata.maxpagesize=500', 'Accept': 'application/json' },
  });

  if (!res.ok) {
    console.error('Error:', res.status, await res.text());
  } else {
    const data = await res.json();
    console.log('Success:', JSON.stringify(data, null, 2));
  }
}

test();
