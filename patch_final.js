const fs = require('fs');
let txt = fs.readFileSync('public/indicador-quejas.html', 'utf8');

// Helper to replace a whole function body more reliably
function replaceFunction(original, funcName, newBody) {
    const startIdx = original.indexOf(`function ${funcName}`);
    if (startIdx === -1) return original;
    
    // Find the matching closing brace for the function
    let braceCount = 0;
    let endIdx = -1;
    let started = false;
    
    for (let i = startIdx; i < original.length; i++) {
        if (original[i] === '{') {
            braceCount++;
            started = true;
        } else if (original[i] === '}') {
            braceCount--;
        }
        
        if (started && braceCount === 0) {
            endIdx = i + 1;
            break;
        }
    }
    
    if (endIdx === -1) return original;
    
    return original.substring(0, startIdx) + newBody + original.substring(endIdx);
}

// 1. Redefine applyFiltersToData
txt = replaceFunction(txt, 'applyFiltersToData', `function applyFiltersToData(data, excludeKey) {
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
        }`);

// 2. Redefine apply
txt = replaceFunction(txt, 'apply', `function apply() {
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
        }`);

// 3. Redefine renderProblem
txt = replaceFunction(txt, 'renderProblem', `function renderProblem() {
            if(charts.p) charts.p.destroy();
            const localData = applyFiltersToData(raw, 'problem');
            const q = {}, u = {};
            localData.forEach(x => { const p = x._prob || 'SIN TIPO'; q[p] = (q[p]||0)+1; u[p] = (u[p]||0)+x._qty; });
            const top = Object.entries(q).sort((a,b)=>b[1]-a[1]);
            const totalQ = localData.length;

            const calcHeight = Math.max(400, top.length * 65);
            document.getElementById('cProblemWrapper').style.height = calcHeight + 'px';

            charts.p = new Chart(document.getElementById('cProblem'), {
                type: 'bar',
                data: {
                    labels: top.map(x => x[0]),
                    datasets: [
                        {
                            label: 'Registros', data: top.map(x => x[1]), 
                            backgroundColor: (ctx) => getChartColor(globalFilters.problem, top[ctx.dataIndex]?.[0], '#3b82f6'),
                            borderRadius: 3, barPercentage: 0.85, categoryPercentage: 0.8,
                            datalabels: getBarLabelConfig('main', totalQ)
                        },
                        {
                            label: 'Cantidades', data: top.map(x => u[x[0]] || 0), 
                            backgroundColor: (ctx) => getChartColor(globalFilters.problem, top[ctx.dataIndex]?.[0], '#94a3b8'),
                            borderRadius: 3, barPercentage: 0.85, categoryPercentage: 0.8,
                            datalabels: getBarLabelConfig('sec')
                        }
                    ]
                },
                options: {
                    indexAxis:'y', responsive:true, maintainAspectRatio:false,
                    layout:{padding:{right:160}},
                    onClick:(e,el)=>{if(el[0]) toggleFilterArr('problem', top[el[0].index][0])},
                    scales:{
                        x:{display:false},
                        y:{afterFit:(s)=>{s.width=180;}, ticks:{color:'#475569',font:{size:10,weight:'bold'},autoSkip:false}, grid:{display:false}, border:{display:false}}
                    },
                    plugins:{
                        legend:{position:'top',align:'end',labels:{color:'#64748b',font:{size:10,weight:'bold'},boxWidth:12,padding:10}},
                        datalabels:{display:true}
                    }
                }
            });
        }`);

// 4. Redefine renderFamily
txt = replaceFunction(txt, 'renderFamily', `function renderFamily() {
            if(charts.f) charts.f.destroy();
            const localData = applyFiltersToData(raw, 'family');
            const m = {}; localData.forEach(x => { const f = x._family.includes('-') ? x._family.split('-')[1].trim() : x._family; m[f] = (m[f]||0)+1; });
            const top = Object.entries(m).sort((a,b)=>b[1]-a[1]).slice(0, 15);
            const total = localData.length;

            const calcHeight = Math.max(400, top.length * 65);
            document.getElementById('cAgentWrapper').style.height = calcHeight + 'px';

            charts.f = new Chart(document.getElementById('cAgent'), {
                type: 'bar',
                data: {
                    labels: top.map(x => x[0]),
                    datasets: [{
                        label: 'Registros', data: top.map(x => x[1]),
                        backgroundColor: (ctx) => getChartColor(globalFilters.family, top[ctx.dataIndex]?.[0], '#8b5cf6'),
                        borderRadius: 3, barPercentage: 0.85, categoryPercentage: 0.8,
                        datalabels: getBarLabelConfig('main', total)
                    }]
                },
                options: {
                    indexAxis:'y', responsive:true, maintainAspectRatio:false,
                    layout:{padding:{right:80}},
                    onClick:(e,el)=>{if(el[0]) toggleFilterArr('family', top[el[0].index][0])},
                    scales:{
                        x:{display:false},
                        y:{afterFit:(s)=>{s.width=150;}, ticks:{color:'#475569',font:{size:10,weight:'bold'},autoSkip:false}, grid:{display:false}, border:{display:false}}
                    },
                    plugins:{
                        legend:{display:false},
                        datalabels:{display:true}
                    }
                }
            });
        }`);

// 5. Redefine renderZone
txt = replaceFunction(txt, 'renderZone', `function renderZone() {
            if(charts.z) charts.z.destroy();
            const localData = applyFiltersToData(raw, 'zone');
            const m = {}; localData.forEach(x => { const z = x._zone || 'OTRO'; m[z] = (m[z]||0)+1; });
            const keys = Object.keys(m).sort((a,b)=>m[b]-m[a]);
            const total = localData.length;

            charts.z = new Chart(document.getElementById('cZone'), {
                type: 'pie',
                data: {
                    labels: keys,
                    datasets: [{
                        data: keys.map(k=>m[k]),
                        backgroundColor: keys.map(k => getChartColor(globalFilters.zone, k, canalColors[k] || '#3b82f6')),
                        borderWidth: 2, borderColor: '#fff'
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    onClick:(e,el)=>{if(el[0]) toggleFilterArr('zone', keys[el[0].index])},
                    plugins: {
                        legend: { position: 'right', labels: { color: '#475569', font: { size: 10, weight: 'bold' }, boxWidth: 12, padding: 10 } },
                        tooltip: { backgroundColor: 'rgba(255,255,255,0.95)', titleColor: '#1e293b', bodyColor: '#475569', borderColor: '#e2e8f0', borderWidth: 1, callbacks: { label: (ctx) => \` \${ctx.raw} (\${((ctx.raw/total)*100).toFixed(1)}%)\` } },
                        datalabels: { display: true, color: '#1e293b', formatter: (v) => ((v/total)*100).toFixed(0)+'%', font: { weight: 'bold', size: 9 } }
                    }
                }
            });
        }`);

// 6. Redefine renderClient (THE BIG ONE)
txt = replaceFunction(txt, 'renderClient', `function renderClient() {
            const searchVal = (document.getElementById('clientSearch')?.value || '').toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g, "");
            const localData = applyFiltersToData(raw, 'client');
            const cMap = {};
            localData.forEach(x => {
                const c = x._sn || 'SIN CLIENTE';
                if(!cMap[c]) cMap[c] = { q:0, u:0, c:0 };
                cMap[c].q++;
                cMap[c].u += x._qty;
                cMap[c].c += x._cost;
            });
            const totalQ = localData.length;
            const totalU = localData.reduce((a,b) => a + b._qty, 0);
            const totalC = localData.reduce((a,b) => a + b._cost, 0);
            let entries = Object.entries(cMap);
            // Apply search filter
            if (searchVal) {
                entries = entries.filter(([name]) => name.toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").includes(searchVal));
            }
            // Apply sort
            const sc = _clientSort.col;
            const sd = _clientSort.dir === 'asc' ? 1 : -1;
            entries.sort((a, b) => {
                if (sc === 'name') return sd * a[0].localeCompare(b[0]);
                const av = sc === 'pctQ' ? (totalQ > 0 ? a[1].q/totalQ : 0) : sc === 'pctU' ? (totalU > 0 ? a[1].u/totalU : 0) : a[1][sc];
                const bv = sc === 'pctQ' ? (totalQ > 0 ? b[1].q/totalQ : 0) : sc === 'pctU' ? (totalU > 0 ? b[1].u/totalU : 0) : b[1][sc];
                return sd * (av - bv);
            });
            const sorted = entries;
            const maxQ = sorted.length > 0 ? Math.max(...sorted.map(e => e[1].q)) : 1;
            // Update sort icons
            ['name','q','pctQ','u','pctU','c'].forEach(k => {
                const el = document.getElementById('sortIco_'+k);
                if(el) el.textContent = (_clientSort.col === k) ? (_clientSort.dir === 'desc' ? '▼' : '▲') : '';
            });
            
            const tbody = document.getElementById('tClientBody');
            tbody.innerHTML = sorted.map(([cli, d]) => {
                const pctQ = totalQ > 0 ? ((d.q / totalQ) * 100).toFixed(1) : '0.0';
                const pctU = totalU > 0 ? ((d.u / totalU) * 100).toFixed(1) : '0.0';
                const barW = Math.round((d.q / maxQ) * 100);
                const isActive = !globalFilters.client.length || globalFilters.client.includes(cli);
                const opCls = isActive ? '' : 'opacity-40';
                return \`
                <tr onclick="toggleFilterArr('client', '\\\${cli.replace(/'/g, "\\\\\\'")}')"
                    class="hover:bg-blue-50/50 transition-colors cursor-pointer group \\\${opCls}">
                    <td class="px-5 py-2.5">
                        <span class="text-xs font-bold text-slate-700 group-hover:text-blue-700 uppercase transition-colors">\\\${cli}</span>
                        <div class="mt-1 w-full bg-slate-100 rounded-full h-1"><div class="h-1 rounded-full bg-blue-400" style="width:\\\${barW}%"></div></div>
                    </td>
                    <td class="px-3 py-2.5 text-center text-sm font-black text-blue-700">\\\${d.q}</td>
                    <td class="px-3 py-2.5 text-center text-xs font-bold text-emerald-600">\\\${pctQ}%</td>
                    <td class="px-3 py-2.5 text-center text-xs font-bold text-slate-500">\\\${Math.round(d.u)}</td>
                    <td class="px-3 py-2.5 text-center text-xs font-bold text-emerald-600">\\\${pctU}%</td>
                    <td class="px-3 py-2.5 text-right text-xs font-bold text-emerald-600">$\\\${Math.round(d.c).toLocaleString('en-US')}</td>
                </tr>\`;
            }).join('');
            
            document.getElementById('tClientFoot').innerHTML = \`
                <tr class="font-black">
                    <td class="px-5 py-3 text-xs text-brand-800 uppercase tracking-wider">Total General</td>
                    <td class="px-3 py-3 text-center text-sm text-brand-800">\\\${totalQ}</td>
                    <td class="px-3 py-3 text-center text-xs text-brand-800">100%</td>
                    <td class="px-3 py-3 text-center text-xs text-slate-700">\\\${Math.round(totalU).toLocaleString('en-US')}</td>
                    <td class="px-3 py-3 text-center text-xs text-brand-800">100%</td>
                    <td class="px-3 py-3 text-right text-xs text-brand-800">$\\\${Math.round(totalC).toLocaleString('en-US')}</td>
                </tr>\`;
        }`);

// 7. Redefine renderPlantTable
txt = replaceFunction(txt, 'renderPlantTable', `function renderPlantTable() {
            const pMap = {};
            const localData = applyFiltersToData(raw, 'plant');
            localData.forEach(x => {
                const p = x._plant || 'SIN PLANTA';
                if(!pMap[p]) pMap[p] = { q:0, u:0, c:0 };
                pMap[p].q++;
                pMap[p].u += x._qty;
                pMap[p].c += x._cost;
            });
            const sorted = Object.entries(pMap).sort((a,b) => b[1].q - a[1].q);
            const totalQ = localData.length;
            const totalU = localData.reduce((a,b) => a + b._qty, 0);
            const totalC = localData.reduce((a,b) => a + b._cost, 0);
            const maxQ = sorted.length > 0 ? sorted[0][1].q : 1;

            const tbody = document.getElementById('tPlantBody');
            tbody.innerHTML = sorted.map(([plant, d]) => {
                const pctQ = totalQ > 0 ? ((d.q / totalQ) * 100).toFixed(1) : '0.0';
                const pctU = totalU > 0 ? ((d.u / totalU) * 100).toFixed(1) : '0.0';
                const barW = Math.round((d.q / maxQ) * 100);
                const isActive = !globalFilters.plant.length || globalFilters.plant.includes(plant);
                const opCls = isActive ? '' : 'opacity-40';
                return \`
                <tr onclick="toggleFilterArr('plant', '\\\${plant.replace(/'/g, "\\\\\\'")}')"
                    class="hover:bg-blue-50/50 transition-colors cursor-pointer group \\\${opCls}">
                    <td class="px-4 py-2.5">
                        <span class="text-xs font-bold text-slate-700 group-hover:text-blue-700 uppercase transition-colors">\\\${plant}</span>
                        <div class="mt-1 w-full bg-slate-100 rounded-full h-1"><div class="h-1 rounded-full bg-blue-400" style="width:\\\${barW}%"></div></div>
                    </td>
                    <td class="px-3 py-2.5 text-center text-sm font-black text-blue-700">\\\${d.q}</td>
                    <td class="px-3 py-2.5 text-center text-xs font-bold text-slate-500">\\\${Math.round(d.u)}</td>
                    <td class="px-3 py-2.5 text-center text-xs font-bold text-emerald-600">\\\${pctQ}%</td>
                    <td class="px-3 py-2.5 text-center text-xs font-bold text-emerald-600">\\\${pctU}%</td>
                    <td class="px-3 py-2.5 text-right text-xs font-bold text-emerald-600">$\\\${Math.round(d.c).toLocaleString('en-US')}</td>
                </tr>\`;
            }).join('');

            // TOTAL GENERAL row
            document.getElementById('tPlantFoot').innerHTML = \`
                <tr class="font-black">
                    <td class="px-4 py-3 text-xs text-brand-800 uppercase tracking-wider">Total General</td>
                    <td class="px-3 py-3 text-center text-sm text-brand-800">\\\${totalQ}</td>
                    <td class="px-3 py-3 text-center text-xs text-slate-700">\\\${Math.round(totalU).toLocaleString('en-US')}</td>
                    <td class="px-3 py-3 text-center text-xs text-brand-800">100%</td>
                    <td class="px-3 py-3 text-center text-xs text-brand-800">100%</td>
                    <td class="px-3 py-3 text-right text-xs text-brand-800">$\\\${Math.round(totalC).toLocaleString('en-US')}</td>
                </tr>\`;
        }`);

// 8. Redefine renderTable (Cities)
txt = replaceFunction(txt, 'renderTable', `function renderTable() {
            const localData = applyFiltersToData(raw, 'city');
            const m={}; localData.forEach(x=>{if(!m[x._city])m[x._city]={q:0,u:0,c:0};m[x._city].q++;m[x._city].u+=x._qty;m[x._city].c+=x._cost;});
            const sorted=Object.entries(m).sort((a,b)=>b[1].q-a[1].q);
            const maxQ = sorted.length > 0 ? sorted[0][1].q : 1;
            
            const tbody = document.getElementById('tBody');
            tbody.innerHTML = sorted.map(s => {
                const barW = Math.round((s[1].q / maxQ)*100);
                const isActive = !globalFilters.city.length || globalFilters.city.includes(s[0]);
                const opCls = isActive ? '' : 'opacity-40';
                return \`
                <tr onclick="toggleFilterArr('city', '\\\${s[0]}')" class="hover:bg-blue-50/50 transition-colors cursor-pointer group \\\${opCls}">
                    <td class="px-5 py-2.5">
                        <span class="text-xs font-bold text-slate-700 group-hover:text-blue-700 uppercase transition-colors">\\\${s[0] || '(Vacío)'}</span>
                        <div class="mt-1 w-full bg-slate-100 rounded-full h-1"><div class="h-1 rounded-full bg-blue-400" style="width:\\\${barW}%"></div></div>
                    </td>
                    <td class="px-3 py-2.5 text-center text-sm font-black text-blue-700">\\\${s[1].q}</td>
                    <td class="px-3 py-2.5 text-center text-xs font-bold text-slate-500">\\\${Math.round(s[1].u)}</td>
                    <td class="px-3 py-2.5 text-right text-[11px] 2xl:text-xs font-bold text-emerald-600">$\\\${Math.round(s[1].c).toLocaleString('en-US')}</td>
                </tr>\`;
            }).join('');
        }`);

// 9. Fix Layout Stability CSS
const tableStyle = \`<style>
    table { table-layout: fixed; }
    #tClientBody tr, #tPlantBody tr, #tBody tr { contain: content; }
</style>\`;
// Check if style block exists, if not add it to head.
if (!txt.includes('table-layout: fixed')) {
    txt = txt.replace('</head>', tableStyle + '</head>');
}

fs.writeFileSync('public/indicador-quejas.html', txt);
console.log('Final patch applied.');
