const fs = require('fs');
const dataRaw = fs.readFileSync('C:/Users/analista2.desarrollo/.gemini/antigravity-ide/brain/5e079bf3-2a86-460b-975c-b416fbaa7cb2/.system_generated/steps/21/output.txt', 'utf8');
const jsonStr = dataRaw.split('<untrusted-data-1dce8d4e-a19c-4e3d-b02c-c7df133d6760>')[1].split('</untrusted-data-1dce8d4e-a19c-4e3d-b02c-c7df133d6760>')[0].trim();
const data = JSON.parse(jsonStr);

let md = '# NITs que empiezan con MIG\n\n';
md += '| NIT Base | Nombre de la Empresa |\n';
md += '|---|---|\n';
data.forEach(r => {
    md += `| ${r.nit_base} | ${r.nombre} |\n`;
});

fs.writeFileSync('C:/Users/analista2.desarrollo/.gemini/antigravity-ide/brain/5e079bf3-2a86-460b-975c-b416fbaa7cb2/clientes_mig.md', md);
