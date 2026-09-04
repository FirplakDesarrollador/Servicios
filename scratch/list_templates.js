const token = "EAGJBa2zR4FgBR3PGGBwZC0f5ZAgqZBAo8h9vwRwLzboEvPIzbSsFiWq1ZAnZAh8eJYDXZBdCZCnTHCx6qAGwDj3tBZBQ2FIv27Yuc1qgNS3nACcdfE6gTape7QYnhS3PZA6ZAXQpCOjzpLA6fSOZAeZCBpRpirYK5bCP4F5G2w0G9VL33Ty4Hnca00dzlmFcT4ZBoabSZAdgZDZD";
const wabaId = "2376054559587331";

fetch(`https://graph.facebook.com/v17.0/${wabaId}/message_templates`, {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
.then(r => r.json())
.then(data => {
  if (data.data) {
    const templates = data.data.filter(t => t.components.some(c => c.type === 'BODY' && c.text.includes('Mi nombre es')));
    console.log(JSON.stringify(templates.map(t => ({ name: t.name, language: t.language, components: t.components })), null, 2));
  } else {
    console.log(data);
  }
})
.catch(console.error);
