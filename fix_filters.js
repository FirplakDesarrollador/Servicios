const fs = require('fs');
let txt = fs.readFileSync('public/indicador-quejas.html', 'utf8');

// ============================================================
// 1. ADD SEARCH BOX to Clientes table header
// ============================================================
const oldClientHeader = `                <div class="px-5 py-3 border-b border-slate-100 bg-slate-50/50">
                    <h3 class="text-sm font-black text-brand-800 uppercase tracking-widest flex items-center gap-2">
                        <svg class="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
                        Top Clientes Afectados
                    </h3>
                </div>`;

const newClientHeader = `                <div class="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between gap-4">
                    <h3 class="text-sm font-black text-brand-800 uppercase tracking-widest flex items-center gap-2 shrink-0">
                        <svg class="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
                        Top Clientes Afectados
                    </h3>
                    <div class="relative max-w-xs w-full">
                        <input id="clientSearch" type="text" placeholder="Buscar cliente..." oninput="renderClient()"
                            class="w-full pl-9 pr-3 py-1.5 text-xs font-medium border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent placeholder-slate-400 transition-all" />
                        <svg class="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                    </div>
                </div>`;

txt = txt.replace(oldClientHeader, newClientHeader);
console.log('1. Search box added');

// ============================================================
// 2. REPLACE table headers with SORTABLE headers
// ============================================================
const oldTh = `                            <tr>
                                <th class="px-5 py-2.5">Cliente</th>
                                <th class="px-3 py-2.5 text-center">Quejas</th>
                                <th class="px-3 py-2.5 text-center">% Reg</th>
                                <th class="px-3 py-2.5 text-center">Cant</th>
                                <th class="px-3 py-2.5 text-center">% Cant</th>
                                <th class="px-3 py-2.5 text-right">Valor</th>
                            </tr>`;

const newTh = `                            <tr>
                                <th class="px-5 py-2.5 cursor-pointer select-none hover:text-blue-600 transition-colors" onclick="sortClientTable('name')">Cliente <span id="sortIco_name" class="text-blue-500"></span></th>
                                <th class="px-3 py-2.5 text-center cursor-pointer select-none hover:text-blue-600 transition-colors" onclick="sortClientTable('q')">Quejas <span id="sortIco_q" class="text-blue-500"></span></th>
                                <th class="px-3 py-2.5 text-center cursor-pointer select-none hover:text-blue-600 transition-colors" onclick="sortClientTable('pctQ')">% Reg <span id="sortIco_pctQ" class="text-blue-500"></span></th>
                                <th class="px-3 py-2.5 text-center cursor-pointer select-none hover:text-blue-600 transition-colors" onclick="sortClientTable('u')">Cant <span id="sortIco_u" class="text-blue-500"></span></th>
                                <th class="px-3 py-2.5 text-center cursor-pointer select-none hover:text-blue-600 transition-colors" onclick="sortClientTable('pctU')">% Cant <span id="sortIco_pctU" class="text-blue-500"></span></th>
                                <th class="px-3 py-2.5 text-right cursor-pointer select-none hover:text-blue-600 transition-colors" onclick="sortClientTable('c')">Valor <span id="sortIco_c" class="text-blue-500"></span></th>
                            </tr>`;

txt = txt.replace(oldTh, newTh);
console.log('2. Sortable headers added');

// ============================================================
// 3. REPLACE renderClient with search + sort logic
// ============================================================
const oldRender = `        function renderClient() {
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
            const maxQ = sorted.length > 0 ? sorted[0][1].q : 1;`;

const newRender = `        // Client table sort state
        let _clientSort = { col: 'q', dir: 'desc' }; // default: quejas desc

        function sortClientTable(col) {
            if (_clientSort.col === col) {
                _clientSort.dir = _clientSort.dir === 'desc' ? 'asc' : _clientSort.dir === 'asc' ? 'default' : 'desc';
            } else {
                _clientSort = { col, dir: 'desc' };
            }
            if (_clientSort.dir === 'default') _clientSort = { col: 'q', dir: 'desc' };
            renderClient();
        }

        function renderClient() {
            const searchVal = (document.getElementById('clientSearch')?.value || '').toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g, "");
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
            });`;

txt = txt.replace(oldRender, newRender);
console.log('3. renderClient with search + sort replaced');

// ============================================================
// 4. FIX Cities table to use toggleFilterArr (multi-select)
// ============================================================
txt = txt.replace(
    /onclick="globalFilters\.city='([^']*?)'; document\.getElementById\('fCity'\)\.value='([^']*?)'; apply\(\);"/g,
    `onclick="toggleFilterArr('city', '\$1')"`
);
console.log('4. Cities table multi-select fixed');

// ============================================================
// 5. FIX city filter to support array (currently string)
// ============================================================
// Change globalFilters.city from string to array
txt = txt.replace(
    `let globalFilters = { tipo: "Queja", city: "", zone: [], channel: "", monthKey: [], problem: [], agent: [], family: [], resp: [], client: [], plant: [] };`,
    `let globalFilters = { tipo: "Queja", city: [], zone: [], channel: "", monthKey: [], problem: [], agent: [], family: [], resp: [], client: [], plant: [] };`
);

// Fix clearAllFilters
txt = txt.replace(
    `globalFilters = { tipo:"Queja", city:"", channel:"", monthKey:[], problem:[], agent:[], family:[], resp:[], zone:[], client:[], plant:[] };`,
    `globalFilters = { tipo:"Queja", city:[], channel:"", monthKey:[], problem:[], agent:[], family:[], resp:[], zone:[], client:[], plant:[] };`
);

// Fix filter conditions: city was string-based, now array-based
// In applyFiltersToData & apply & applyVariationFilter
txt = txt.replace(
    /\(!globalFilters\.city \|\| x\._city === globalFilters\.city\)/g,
    `(!globalFilters.city.length || globalFilters.city.includes(x._city))`
);

// Fix the city dropdown sync in apply()
txt = txt.replace(
    `globalFilters.city = document.getElementById('fCity').value;`,
    `// City filter now array-based, dropdown sets single value for compat
            const fCityVal = document.getElementById('fCity').value;
            if (fCityVal && !globalFilters.city.includes(fCityVal)) { globalFilters.city = [fCityVal]; }
            else if (!fCityVal) { globalFilters.city = globalFilters.city; }`
);

// Fix clearAllFilters city dropdown reset
txt = txt.replace(
    `document.getElementById('fCity').value = "";`,
    `document.getElementById('fCity').value = ""; globalFilters.city = [];`
);

console.log('5. City filter converted to multi-select array');

fs.writeFileSync('public/indicador-quejas.html', txt);
console.log('\nAll changes applied successfully!');
