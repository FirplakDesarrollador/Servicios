import fetch from 'node-fetch';

async function fetchDoc() {
  try {
    const res = await fetch('http://localhost:3000/api/sap/quotations?docNum=2003508&type=Order');
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
  } catch(e) {
    console.error(e);
  }
}

fetchDoc();
