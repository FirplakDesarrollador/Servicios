const fs = require('fs');
let txt = fs.readFileSync('public/indicador-quejas.html', 'utf8');

const newConfig = `        const getBarLabelConfig = (type, totalRef) => {
            const isMain = type === 'main';
            return {
                display: true,
                clip: false,
                anchor: 'end',
                align: (ctx) => {
                    const v = ctx.dataset.data[ctx.dataIndex];
                    if (!v) return 'end';
                    const maxVal = Math.max(...ctx.dataset.data);
                    const threshold = isMain ? 0.35 : 0.20;
                    return (maxVal && (v / maxVal) > threshold) ? 'start' : 'end';
                },
                color: (ctx) => {
                    const v = ctx.dataset.data[ctx.dataIndex];
                    if (!v) return 'transparent';
                    const maxVal = Math.max(...ctx.dataset.data);
                    const threshold = isMain ? 0.35 : 0.20;
                    const isInside = (maxVal && (v / maxVal) > threshold);
                    if (isInside) return '#ffffff';
                    return isMain ? '#0f2440' : '#64748b';
                },
                font: {
                    weight: isMain ? '900' : '600',
                    size: isMain ? 11 : 9,
                    family: 'Inter'
                },
                offset: (ctx) => {
                    const v = ctx.dataset.data[ctx.dataIndex];
                    const maxVal = Math.max(...ctx.dataset.data);
                    const threshold = isMain ? 0.35 : 0.20;
                    const isInside = (maxVal && (v / maxVal) > threshold);
                    return isInside ? 6 : 4;
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
if(startIdx === -1) {
    console.log('Function getBarLabelConfig not found');
    process.exit(1);
}

let endIdx = txt.indexOf('};', txt.indexOf('formatter: (v) => {', startIdx));
endIdx = txt.indexOf('};', endIdx + 2) + 2;

txt = txt.substring(0, startIdx) + newConfig + txt.substring(endIdx);
fs.writeFileSync('public/indicador-quejas.html', txt);
console.log('Datalabels logic updated successfully');
