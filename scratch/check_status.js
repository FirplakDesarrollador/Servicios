const token = "EAGJBa2zR4FgBR3PGGBwZC0f5ZAgqZBAo8h9vwRwLzboEvPIzbSsFiWq1ZAnZAh8eJYDXZBdCZCnTHCx6qAGwDj3tBZBQ2FIv27Yuc1qgNS3nACcdfE6gTape7QYnhS3PZA6ZAXQpCOjzpLA6fSOZAeZCBpRpirYK5bCP4F5G2w0G9VL33Ty4Hnca00dzlmFcT4ZBoabSZAdgZDZD";
const phoneId = "1248348921691642";

fetch(`https://graph.facebook.com/v17.0/${phoneId}?fields=name_status,quality_rating,status,messaging_limit_tier`, {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
.then(r => r.json())
.then(data => console.log(JSON.stringify(data, null, 2)))
.catch(console.error);
