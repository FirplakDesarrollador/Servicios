const fs = require('fs');
let txt = fs.readFileSync('public/indicador-quejas.html', 'utf8');

// Container & Padding adjustments
txt = txt.replace(/px-8 py-5/g, 'px-6 md:px-10 2xl:px-16 py-6');
txt = txt.replace(/px-8 py-2\.5/g, 'px-6 md:px-10 2xl:px-16 py-3');
txt = txt.replace(/w-full mx-auto px-8/g, 'w-full px-6 md:px-10 2xl:px-16');
txt = txt.replace(/w-full mx-auto flex/g, 'w-full flex');

// Typography: KPIs
txt = txt.replace(/text-\[9px\] font-bold text-blue-300\/80 uppercase tracking-\[0\.25em\]/g, 'text-[11px] font-bold text-blue-300/80 uppercase tracking-[0.2em]');
txt = txt.replace(/text-4xl font-black leading-none mt-1/g, 'text-6xl font-black leading-none mt-2');
txt = txt.replace(/text-\[8px\] font-bold text-blue-300\/60 uppercase/g, 'text-[10px] font-bold text-blue-300/60 uppercase');
txt = txt.replace(/text-sm font-black text-blue-200 ml-1/g, 'text-lg font-black text-blue-200 ml-1.5');
txt = txt.replace(/text-sm font-black text-emerald-400 ml-1/g, 'text-lg font-black text-emerald-400 ml-1.5');

// Typography: Variacion
txt = txt.replace(/text-\[8px\] font-bold text-slate-400 uppercase tracking-\[0\.2em\] mb-1\.5/g, 'text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2');
txt = txt.replace(/text-xl font-black text-/g, 'text-3xl font-black text-');
txt = txt.replace(/text-2xl font-black text-/g, 'text-4xl font-black text-'); // in JS dynamically
txt = txt.replace(/text-\[7px\] font-bold text-slate-400 uppercase tracking-wider mt-2/g, 'text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-3');

// Typography: Card Titles
txt = txt.replace(/text-xs font-black text-brand-800 uppercase tracking-\[0\.2em\]/g, 'text-sm font-black text-brand-800 uppercase tracking-widest');

// Grid & Heights
txt = txt.replace(/lg:grid-cols-5 gap-5 mb-6/g, 'lg:grid-cols-12 gap-6 mb-8');
txt = txt.replace(/lg:col-span-3/g, 'lg:col-span-7 2xl:col-span-8');
txt = txt.replace(/lg:col-span-2/g, 'lg:col-span-5 2xl:col-span-4');

// Chart Heights (250px -> 320px/380px)
txt = txt.replace(/h-\[250px\]/g, 'h-[320px] 2xl:h-[380px]');
txt = txt.replace(/min-h-\[250px\]/g, 'min-h-[320px] 2xl:min-h-[380px]');

txt = txt.replace(/h-\[260px\]/g, 'h-[320px] 2xl:h-[380px]');
txt = txt.replace(/min-h-\[260px\]/g, 'min-h-[320px] 2xl:min-h-[380px]');

txt = txt.replace(/h-\[300px\]/g, 'h-[400px] 2xl:h-[480px]');
txt = txt.replace(/min-h-\[300px\]/g, 'min-h-[400px] 2xl:min-h-[480px]');

// Table Typography
txt = txt.replace(/text-\[11px\] font-medium/g, 'text-xs font-medium');
// In JS for tables:
txt = txt.replace(/text-\[10px\] font-bold/g, 'text-[11px] 2xl:text-xs font-bold');
txt = txt.replace(/text-xs font-black/g, 'text-sm font-black');

// Internal JS logic updates for typography
// Chart config: font:{size:8,weight:'bold'} -> font:{size:10,weight:'bold'}
txt = txt.replace(/font:\{size:8,weight:'bold'\}/g, 'font:{size:10,weight:\'bold\'}');
txt = txt.replace(/font:\{size:8,family:'Inter',weight:'700'\}/g, 'font:{size:10,family:\'Inter\',weight:\'700\'}');

// Datalabels config
txt = txt.replace(/size: 10/g, 'size: 11'); // for bar labels
txt = txt.replace(/size:11/g, 'size:13'); // for pie labels
txt = txt.replace(/boxWidth:8/g, 'boxWidth:12'); // legend box size
txt = txt.replace(/padding:6/g, 'padding:10'); // legend padding

// Update JS for Math.max(250, ...) -> Math.max(320, ...)
txt = txt.replace(/Math\.max\(250,/g, 'Math.max(320,');
txt = txt.replace(/Math\.max\(300,/g, 'Math.max(400,');

fs.writeFileSync('public/indicador-quejas.html', txt);
console.log('Layout updated successfully');
