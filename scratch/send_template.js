const token = "EAGJBa2zR4FgBR3PGGBwZC0f5ZAgqZBAo8h9vwRwLzboEvPIzbSsFiWq1ZAnZAh8eJYDXZBdCZCnTHCx6qAGwDj3tBZBQ2FIv27Yuc1qgNS3nACcdfE6gTape7QYnhS3PZA6ZAXQpCOjzpLA6fSOZAeZCBpRpirYK5bCP4F5G2w0G9VL33Ty4Hnca00dzlmFcT4ZBoabSZAdgZDZD";
const phoneId = "1248348921691642";
const to = "573175451466";

fetch(`https://graph.facebook.com/v17.0/${phoneId}/messages`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    messaging_product: "whatsapp",
    to: to,
    type: "template",
    template: {
      name: "apertura_inicial",
      language: {
        code: "es_CO"
      },
      components: [
        {
          type: "body",
          parameters: [
            {
              type: "text",
              text: "mayerle"
            }
          ]
        }
      ]
    }
  })
})
.then(r => r.json())
.then(data => console.log("Response:", JSON.stringify(data, null, 2)))
.catch(console.error);
