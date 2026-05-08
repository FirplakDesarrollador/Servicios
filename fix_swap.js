const fs = require('fs');
let txt = fs.readFileSync('public/indicador-quejas.html', 'utf8');
const lines = txt.split('\n');

// Find ROW 4 start (line 222, 0-indexed 221)
const row4Start = lines.findIndex(l => l.includes('<!-- ROW 4: Zona + Ciudad Table -->'));
// Find ROW 5 start
const row5Start = lines.findIndex(l => l.includes('<!-- ROW 5: Clientes -->'));
// Find </main> 
const mainEnd = lines.findIndex(l => l.trim() === '</main>');

if (row4Start === -1 || row5Start === -1 || mainEnd === -1) {
    console.log('Could not find markers', { row4Start, row5Start, mainEnd });
    process.exit(1);
}

// Extract the blank line before ROW 4
const row4Block = lines.slice(row4Start, row5Start); // ROW 4 lines including trailing blank
const row5Block = lines.slice(row5Start, mainEnd);   // ROW 5 lines including trailing blank

// New ROW 4: Clientes as table (replaces old ROW 5 chart)
const newRow4 = `
        <!-- ROW 4: Top Clientes Afectados (Table) -->
        <div class="grid grid-cols-1 gap-5 mb-6">
            <div class="bg-white rounded-2xl border border-slate-200 shadow-sm card-hover overflow-hidden flex flex-col">
                <div class="px-5 py-3 border-b border-slate-100 bg-slate-50/50">
                    <h3 class="text-sm font-black text-brand-800 uppercase tracking-widest flex items-center gap-2">
                        <svg class="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
                        Top Clientes Afectados
                    </h3>
                </div>
                <div class="flex-1 overflow-y-auto max-h-[420px] custom-scrollbar">
                    <table class="w-full text-left text-xs font-medium">
                        <thead class="sticky top-0 bg-slate-50 text-slate-500 border-b border-slate-200 uppercase tracking-wider z-10">
                            <tr>
                                <th class="px-5 py-2.5">Cliente</th>
                                <th class="px-3 py-2.5 text-center">Quejas</th>
                                <th class="px-3 py-2.5 text-center">% Reg</th>
                                <th class="px-3 py-2.5 text-center">Cant</th>
                                <th class="px-3 py-2.5 text-center">% Cant</th>
                                <th class="px-3 py-2.5 text-right">Valor</th>
                            </tr>
                        </thead>
                        <tbody id="tClientBody" class="divide-y divide-slate-100"></tbody>
                        <tfoot id="tClientFoot" class="border-t-2 border-slate-300 bg-slate-50/80"></tfoot>
                    </table>
                </div>
            </div>
        </div>
`;

// New ROW 5 = old ROW 4 (Zona + Ciudades), just re-commented
const newRow5Lines = row4Block.map(l => {
    if (l.includes('<!-- ROW 4:')) return l.replace('ROW 4:', 'ROW 5:');
    return l;
});

// Rebuild the file
const before = lines.slice(0, row4Start);
const after = lines.slice(mainEnd);

const newContent = [
    ...before,
    ...newRow4.split('\n'),
    ...newRow5Lines,
    ...after
].join('\n');

// Now replace renderClient function with table-based version
const oldRenderClient = `        function renderClient() {
            if(charts.c) charts.c.destroy();
            const q={},u={}; 
            filtered.forEach(x => { const c = x._sn; q[c]=(q[c]||0)+1; u[c]=(u[c]||0)+x._qty; });
            const top = Object.entries(q).sort((a,b)=>b[1]-a[1]).slice(0, 15);
            const totalQ=filtered.length;

            const calcHeight = Math.max(400, top.length * 65);
            document.getElementById('cClientWrapper').style.height = calcHeight + 'px';

            charts.c = new Chart(document.getElementById('cClient'),{
                type:'bar',
                data:{
                    labels:top.map(x=>x[0]),
                    datasets:[
                        {label:'Registros',data:top.map(x=>x[1]),
                            backgroundColor:(ctx)=>getChartColor(globalFilters.client, top[ctx.dataIndex]?.[0], '#3b82f6'),
                            borderRadius:3, barPercentage:0.85, categoryPercentage:0.8,
                            datalabels:getBarLabelConfig('main', totalQ)},
                        {label:'Cantidades',data:top.map(x=>u[x[0]]),
                            backgroundColor:(ctx)=>getChartColor(globalFilters.client, top[ctx.dataIndex]?.[0], '#94a3b8'),
                            borderRadius:3, barPercentage:0.85, categoryPercentage:0.8,
                            datalabels:getBarLabelConfig('sec')}
                    ]
                },
                options:{
                    indexAxis:'y',responsive:true,maintainAspectRatio:false,
                    layout:{padding:{right:160}},
                    onClick:(e,el)=>{if(el[0]) toggleFilterArr('client', top[el[0].index][0])},
                    scales:{
                        x:{display:false},
                        y:{afterFit:(s)=>{s.width=180;},ticks:{color:'#475569',font:{size:10,weight:'bold'},autoSkip:false},grid:{display:false},border:{display:false}}
                    },
                    plugins:{
                        legend:{position:'top',align:'end',labels:{color:'#64748b',font:{size:10,weight:'bold'},boxWidth:12,padding:10}},
                        datalabels:{display:true}
                    }
                }
            });
        }`;

const newRenderClient = `        function renderClient() {
            const cMap = {};
            filtered.forEach(x => {
                const c = x._sn || 'SIN CLIENTE';
                if(!cMap[c]) cMap[c] = { q:0, u:0, c:0 };
                cMap[c].q++;
                cMap[c].u += x._qty;
                cMap[c].c += x._cost;
            });
            const totalQ = filtered.length;
            const totalU = filtered.reduce((a,b) => a + b._qty, 0);
            const totalC = filtered.reduce((a,b) => a + b._cost, 0);
            const sorted = Object.entries(cMap).sort((a,b) => b[1].q - a[1].q);
            const maxQ = sorted.length > 0 ? sorted[0][1].q : 1;
            document.getElementById('tClientBody').innerHTML = sorted.map(([client, d]) => {
                const pctQ = totalQ > 0 ? ((d.q / totalQ) * 100).toFixed(1) : '0.0';
                const pctU = totalU > 0 ? ((d.u / totalU) * 100).toFixed(1) : '0.0';
                const barW = Math.round((d.q / maxQ) * 100);
                const isActive = !globalFilters.client.length || globalFilters.client.includes(client);
                const opCls = isActive ? '' : 'opacity-40';
                return \`
                <tr onclick="toggleFilterArr('client', '\${client.replace(/'/g, "\\\\\\'")}')"
                    class="hover:bg-blue-50/50 transition-colors cursor-pointer group \${opCls}">
                    <td class="px-5 py-2.5">
                        <span class="text-xs font-bold text-slate-700 group-hover:text-blue-700 uppercase transition-colors">\${client}</span>
                        <div class="mt-1 w-full bg-slate-100 rounded-full h-1"><div class="h-1 rounded-full bg-blue-400" style="width:\${barW}%"></div></div>
                    </td>
                    <td class="px-3 py-2.5 text-center text-sm font-black text-blue-700">\${d.q}</td>
                    <td class="px-3 py-2.5 text-center text-xs font-bold text-emerald-600">\${pctQ}%</td>
                    <td class="px-3 py-2.5 text-center text-xs font-bold text-slate-500">\${Math.round(d.u)}</td>
                    <td class="px-3 py-2.5 text-center text-xs font-bold text-emerald-600">\${pctU}%</td>
                    <td class="px-3 py-2.5 text-right text-xs font-bold text-emerald-600">$\${Math.round(d.c).toLocaleString('en-US')}</td>
                </tr>\`;
            }).join('');
            document.getElementById('tClientFoot').innerHTML = \`
                <tr class="font-black">
                    <td class="px-5 py-3 text-xs text-brand-800 uppercase tracking-wider">Total General</td>
                    <td class="px-3 py-3 text-center text-sm text-brand-800">\${totalQ}</td>
                    <td class="px-3 py-3 text-center text-xs text-brand-800">100%</td>
                    <td class="px-3 py-3 text-center text-xs text-slate-700">\${Math.round(totalU).toLocaleString('en-US')}</td>
                    <td class="px-3 py-3 text-center text-xs text-brand-800">100%</td>
                    <td class="px-3 py-3 text-right text-xs text-brand-800">$\${Math.round(totalC).toLocaleString('en-US')}</td>
                </tr>\`;
        }`;

let finalContent = newContent;
if (finalContent.includes(oldRenderClient)) {
    finalContent = finalContent.replace(oldRenderClient, newRenderClient);
    console.log('renderClient replaced successfully');
} else {
    console.log('WARNING: renderClient not found for replacement - check manually');
}

fs.writeFileSync('public/indicador-quejas.html', finalContent);
console.log('Layout swap completed successfully');
