const fs = require('fs');
let txt = fs.readFileSync('public/indicador-quejas.html', 'utf8');

// 1. Fix getBarLabelConfig to use globalMax for true physical scale
const newConfig = `        const getBarLabelConfig = (type, totalRef) => {
            const isMain = type === 'main';
            return {
                display: true,
                clip: false,
                anchor: 'end',
                align: (ctx) => {
                    const v = ctx.dataset.data[ctx.dataIndex];
                    if (!v) return 'end';
                    const globalMax = Math.max(...ctx.chart.data.datasets.flatMap(d => d.data));
                    const threshold = isMain ? 0.35 : 0.15;
                    return (globalMax && (v / globalMax) > threshold) ? 'start' : 'end';
                },
                color: (ctx) => {
                    const v = ctx.dataset.data[ctx.dataIndex];
                    if (!v) return 'transparent';
                    const globalMax = Math.max(...ctx.chart.data.datasets.flatMap(d => d.data));
                    const threshold = isMain ? 0.35 : 0.15;
                    const isInside = (globalMax && (v / globalMax) > threshold);
                    if (isInside) return '#ffffff';
                    return isMain ? '#1e3a5f' : '#64748b';
                },
                font: {
                    weight: isMain ? '900' : '600',
                    size: isMain ? 11 : 10,
                    family: 'Inter'
                },
                offset: (ctx) => {
                    const v = ctx.dataset.data[ctx.dataIndex];
                    const globalMax = Math.max(...ctx.chart.data.datasets.flatMap(d => d.data));
                    const threshold = isMain ? 0.35 : 0.15;
                    const isInside = (globalMax && (v / globalMax) > threshold);
                    return isInside ? 6 : 6; // Keep 6px offset for both inside and outside to ensure visual consistency
                },
                formatter: (v) => {
                    if (!v) return '';
                    if (isMain) {
                        const pct = totalRef ? ((v / totalRef) * 100).toFixed(1) : 0;
                        return \`\${v} (\${pct}%)\`;
                    } else {
                        return \`\${Math.round(v)} uds\`;
                    }
                }
            };
        };`;

let startIdx = txt.indexOf('const getBarLabelConfig = (type, totalRef) => {');
let endIdx = txt.indexOf('};', txt.indexOf('formatter: (v) => {', startIdx));
endIdx = txt.indexOf('};', endIdx + 2) + 2;

txt = txt.substring(0, startIdx) + newConfig + txt.substring(endIdx);

// 2. Fix Y-Axis category width (afterFit) to prevent truncation of category names
txt = txt.replace(/afterFit:\(s\)=>\{s\.width=120;\}/g, 'afterFit:(s)=>{s.width=180;}');
txt = txt.replace(/afterFit:\(s\)=>\{s\.width=100;\}/g, 'afterFit:(s)=>{s.width=180;}');
txt = txt.replace(/afterFit:\(s\)=>\{s\.width=150;\}/g, 'afterFit:(s)=>{s.width=180;}');

// 3. Fix right padding so labels never cut off
txt = txt.replace(/layout:\{padding:\{right:120\}\}/g, 'layout:{padding:{right:160}}');

// 4. Fix vertical breathing room per bar category (45 -> 65)
txt = txt.replace(/top\.length \* 45\)/g, 'top.length * 65)');

fs.writeFileSync('public/indicador-quejas.html', txt);
console.log('Fix applied successfully');
