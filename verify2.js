const fs = require('fs');
const t = fs.readFileSync('public/indicador-quejas.html', 'utf8');
console.log('city array init:', t.includes('city: []'));
console.log('city filter includes:', t.includes('globalFilters.city.includes(x._city)'));
console.log('search box:', t.includes('clientSearch'));
console.log('sortClientTable fn:', t.includes('function sortClientTable'));
console.log('sortIco_q:', t.includes('sortIco_q'));
console.log('old city string gone:', !t.includes('city: ""'));
console.log('toggleFilterArr city:', t.includes("toggleFilterArr('city'"));
