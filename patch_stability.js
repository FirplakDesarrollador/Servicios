const fs = require('fs');
let txt = fs.readFileSync('public/indicador-quejas.html', 'utf8');

// 1. Update applyFiltersToData
const newApplyFilters = `        function applyFiltersToData(data, excludeKey) {
            const s = window._activeStartDate || new Date(0);
            const e = window._activeEndDate || new Date(2100,0,1);
            
            return data.filter(x => {
                if (x._d < s || x._d > e) return false;
                if (excludeKey !== 'tipo' && globalFilters.tipo && x._serie !== globalFilters.tipo) return false;
                if (excludeKey !== 'city' && globalFilters.city.length && !globalFilters.city.includes(x._city)) return false;
                if (excludeKey !== 'channel' && globalFilters.channel && x._chan !== globalFilters.channel) return false;
                if (excludeKey !== 'monthKey' && globalFilters.monthKey.length && !globalFilters.monthKey.includes(x._monthKey)) return false;
                if (excludeKey !== 'problem' && globalFilters.problem.length && !globalFilters.problem.includes(x._prob)) return false;
                if (excludeKey !== 'family' && globalFilters.family.length) {
                    const fam = x._family.includes('-') ? x._family.split('-')[1].trim() : x._family;
                    if (!globalFilters.family.includes(fam)) return false;
                }
                if (excludeKey !== 'resp' && globalFilters.resp.length && !globalFilters.resp.includes(x._resp)) return false;
                if (excludeKey !== 'zone' && globalFilters.zone.length && !globalFilters.zone.includes(x._zone)) return false;
                if (excludeKey !== 'client' && globalFilters.client.length && !globalFilters.client.includes(x._sn)) return false;
                if (excludeKey !== 'plant' && globalFilters.plant.length && !globalFilters.plant.includes(x._plant)) return false;
                return true;
            });
        }`;

txt = txt.replace(/function applyFiltersToData\(data\) \{[\s\S]*?\}\s*?\}/, newApplyFilters);

// 2. Update apply()
const newApply = `        function apply() {
            const startVal = document.getElementById('dateStart').value;
            const endVal = document.getElementById('dateEnd').value;
            
            const fCityVal = document.getElementById('fCity').value;
            if (fCityVal && !globalFilters.city.includes(fCityVal)) { 
                globalFilters.city = [fCityVal]; 
            }
            globalFilters.channel = document.getElementById('fChan').value;
            globalFilters.tipo = document.getElementById('fTipo').value;

            let s = startVal ? new Date(startVal) : new Date(0);
            let e = endVal ? new Date(endVal) : new Date(2100,0,1);
            if(endVal) e.setHours(23,59,59);

            window._activeStartDate = s;
            window._activeEndDate = e;

            filtered = applyFiltersToData(raw);

            document.getElementById('v-quejas').innerText = filtered.length.toLocaleString('en-US');
            document.getElementById('v-units').innerText = Math.round(filtered.reduce((a,b)=>a+b._qty,0)).toLocaleString('en-US');
            const totalCost = Math.round(filtered.reduce((a,b)=>a+b._cost,0));
            document.getElementById('v-cost').innerText = '$' + totalCost.toLocaleString('en-US');

            renderCanalCards();
            renderCharts();
            renderDynamicGrowth();
            renderTable();
        }`;

txt = txt.replace(/function apply\(\) \{[\s\S]*?renderTable\(\);\s*?\}/, newApply);

// 3. Update renderCharts to pass specific data to each renderer
const newRenderCharts = `        function renderCharts() {
            renderTrend();
            renderProblem();
            renderFamily();
            renderPlantTable();
            renderAgent();
            renderZone();
            renderClient();
        }`;
// Already looks like this, but ensure it's correct.

// 4. Update renderProblem to use partial filter
const oldRenderProblemStart = `        function renderProblem() {
            if(charts.p) charts.p.destroy();
            const q = {}, u = {};
            filtered.forEach(x => { const p = x._prob || 'SIN TIPO'; q[p] = (q[p]||0)+1; u[p] = (u[p]||0)+x._qty; });`;

const newRenderProblemStart = `        function renderProblem() {
            if(charts.p) charts.p.destroy();
            const localData = applyFiltersToData(raw, 'problem');
            const q = {}, u = {};
            localData.forEach(x => { const p = x._prob || 'SIN TIPO'; q[p] = (q[p]||0)+1; u[p] = (u[p]||0)+x._qty; });`;

txt = txt.replace(oldRenderProblemStart, newRenderProblemStart);

// 5. Update renderFamily to use partial filter
const oldRenderFamilyStart = `        function renderFamily() {
            if(charts.f) charts.f.destroy();
            const m = {}; filtered.forEach(x => { const f = x._family.includes('-') ? x._family.split('-')[1].trim() : x._family; m[f] = (m[f]||0)+1; });`;

const newRenderFamilyStart = `        function renderFamily() {
            if(charts.f) charts.f.destroy();
            const localData = applyFiltersToData(raw, 'family');
            const m = {}; localData.forEach(x => { const f = x._family.includes('-') ? x._family.split('-')[1].trim() : x._family; m[f] = (m[f]||0)+1; });`;

txt = txt.replace(oldRenderFamilyStart, newRenderFamilyStart);

// 6. Update renderZone to use partial filter
const oldRenderZoneStart = `        function renderZone() {
            if(charts.z) charts.z.destroy();
            const m = {}; filtered.forEach(x => { const z = x._zone || 'OTRO'; m[z] = (m[z]||0)+1; });`;

const newRenderZoneStart = `        function renderZone() {
            if(charts.z) charts.z.destroy();
            const localData = applyFiltersToData(raw, 'zone');
            const m = {}; localData.forEach(x => { const z = x._zone || 'OTRO'; m[z] = (m[z]||0)+1; });`;

txt = txt.replace(oldRenderZoneStart, newRenderZoneStart);

// 7. Update renderClient to use partial filter AND fix stability
const oldRenderClientStart = `        function renderClient() {
            const searchVal = (document.getElementById('clientSearch')?.value || '').toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g, "");
            const cMap = {};
            filtered.forEach(x => {`;

const newRenderClientStart = `        function renderClient() {
            const searchVal = (document.getElementById('clientSearch')?.value || '').toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g, "");
            const localData = applyFiltersToData(raw, 'client');
            const cMap = {};
            localData.forEach(x => {`;

txt = txt.replace(oldRenderClientStart, newRenderClientStart);

// Update renderClient to show totals correctly (based on FULL filtered for active context, or local?)
// KPIs should use total filtered. Table percentages should probably use total available in localData.
txt = txt.replace(/const totalQ = filtered\.length;/, "const totalQ = localData.length;");
txt = txt.replace(/const totalU = filtered\.reduce\(\(a,b\) => a \+ b\._qty, 0\);/, "const totalU = localData.reduce((a,b) => a + b._qty, 0);");
txt = txt.replace(/const totalC = filtered\.reduce\(\(a,b\) => a \+ b\._cost, 0\);/, "const totalC = localData.reduce((a,b) => a + b._cost, 0);");

// 8. Update renderPlantTable to use partial filter
const oldRenderPlantStart = `        function renderPlantTable() {
            const pMap = {};
            filtered.forEach(x => {
                const p = x._plant || 'SIN PLANTA';`;

const newRenderPlantStart = `        function renderPlantTable() {
            const pMap = {};
            const localData = applyFiltersToData(raw, 'plant');
            localData.forEach(x => {
                const p = x._plant || 'SIN PLANTA';`;

txt = txt.replace(oldRenderPlantStart, newRenderPlantStart);
txt = txt.replace(/const totalQ = filtered\.length;/, "const totalQ = localData.length;");
// wait, apply regex to ensure it only hits inside this function?
// Let's do it more carefully.

// Fix for Plant Table
txt = txt.replace(/const totalQ = filtered\.length;[\s\S]*?const totalU = filtered\.reduce/, (m) => m.replace(/filtered/g, 'localData'));

// 9. Update renderTable (Cities) to use partial filter
const oldRenderTable = `        function renderTable() {
            const m={}; filtered.forEach(x=>{if(!m[x._city])m[x._city]={q:0,u:0,c:0};m[x._city].q++;m[x._city].u+=x._qty;m[x._city].c+=x._cost;});`;

const newRenderTable = `        function renderTable() {
            const localData = applyFiltersToData(raw, 'city');
            const m={}; localData.forEach(x=>{if(!m[x._city])m[x._city]={q:0,u:0,c:0};m[x._city].q++;m[x._city].u+=x._qty;m[x._city].c+=x._cost;});`;

txt = txt.replace(oldRenderTable, newRenderTable);

// 10. Fix highlighting in Cities table (it was missing isActive check)
const cityTableMapping = `                const barW = Math.round((s[1].q / maxQ)*100);
                return \`
                <tr onclick="toggleFilterArr('city', '\\\${s[0]}')" class="hover:bg-blue-50/50 transition-colors cursor-pointer group">`;

const cityTableMappingFixed = `                const barW = Math.round((s[1].q / maxQ)*100);
                const isActive = !globalFilters.city.length || globalFilters.city.includes(s[0]);
                const opCls = isActive ? '' : 'opacity-40';
                return \`
                <tr onclick="toggleFilterArr('city', '\\\${s[0]}')" class="hover:bg-blue-50/50 transition-colors cursor-pointer group \\\${opCls}">`;

txt = txt.replace(cityTableMapping, cityTableMappingFixed);

// 11. Fix highlighting in Plant table
const plantTableMapping = `                const isActive = !globalFilters.plant.length || globalFilters.plant.includes(plant);
                const opCls = isActive ? '' : 'opacity-40';
                return \`
                <tr onclick="toggleFilterArr('plant', '\\\${plant.replace(/'/g, "\\\\\\'")}')"
                    class="hover:bg-blue-50/50 transition-colors cursor-pointer group \\\${opCls}">`;
// This already seems to have it, but let's be sure.

fs.writeFileSync('public/indicador-quejas.html', txt);
console.log('Patch applied via node script.');
