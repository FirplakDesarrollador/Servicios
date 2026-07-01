const fs = require('fs');
let text = fs.readFileSync('src/app/solicitar-servicio/page.tsx', 'utf8');

const searchStr = '            // Determine Coordinator based on Zone (as requested)\r\n            // Fallback for Ecommerce if no client zone\r\n            if (!zoneId && isEcommerce) {';

const replaceStr = '            // Determine Coordinator based on Zone (as requested)\r\n\r\n            // Si el cliente no tiene zona directa pero tiene ciudad_id, buscamos la zona de esa ciudad\r\n            if (!zoneId && clienteSeleccionado?.ciudad_id) {\r\n                const { data: cityData } = await supabase.from(''ciudades'').select(''zona_id'').eq(''id'', clienteSeleccionado.ciudad_id).single();\r\n                if (cityData?.zona_id) zoneId = cityData.zona_id;\r\n            }\r\n\r\n            // Fallback for Ecommerce if no client zone\r\n            if (!zoneId && isEcommerce) {';

// Intentar CRLF primero
if (text.includes(searchStr)) {
  fs.writeFileSync('src/app/solicitar-servicio/page.tsx', text.replace(searchStr, replaceStr));
  console.log('PATCH_OK');
} else {
  // Intentar LF (Linux/Mac style) si CRLF no se encuentra
  const searchStrLF = searchStr.replace(/\r\n/g, '\n');
  const replaceStrLF = replaceStr.replace(/\r\n/g, '\n');
  if (text.includes(searchStrLF)) {
    fs.writeFileSync('src/app/solicitar-servicio/page.tsx', text.replace(searchStrLF, replaceStrLF));
    console.log('PATCH_OK_LF');
  } else {
    console.log('SEARCH_STRING_NOT_FOUND');
  }
}
