const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

function loadEnv() {
  const envFiles = ['.env.local', '.env'];
  for (const file of envFiles) {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf8');
      content.split('\n').forEach(line => {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
          let val = match[2] || '';
          val = val.replace(/^['"]|['"]$/g, '').trim();
          process.env[match[1]] = val;
        }
      });
    }
  }
}
loadEnv();
console.log("Supabase URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const normalizeGrupoName = (g) => {
    if (!g) return 'OTROS';
    const norm = String(g).trim().toUpperCase();
    if (['COCINA', 'COCINAS', 'MESON', 'MESONES', 'LAVAPLATOS'].includes(norm)) return 'COCINAS';
    if (['BAÑO', 'BAÑOS', 'BANO', 'BANOS', 'LAVAMANOS', 'MUEBLE', 'MUEBLES'].includes(norm)) return 'BAÑOS';
    if (['HIDROMASAJE', 'HIDROMASAJES', 'SPA', 'TINA'].includes(norm)) return 'HIDROMASAJES';
    if (['REPUESTO', 'REPUESTOS', 'REPOSICION', 'MPDIRECT'].includes(norm)) return 'COMERCIALIZADOS';
    if (['LAVARROPAS', 'ROPA', 'ROPAS'].includes(norm)) return 'ROPAS';
    if (['INFRAESTRUCTURA', 'PATA', 'PISO'].includes(norm)) return 'INFRAESTRUCTURA';
    if (norm.includes('HIDROPOR')) return 'HIDROMASAJES';
    if (norm.includes('MPDIRECT')) return 'COMERCIALIZADOS';
    if (norm.includes('HIDROEMP')) return 'HIDROMASAJES';
    return norm;
};

const getGrupoFromProduct = (p) => {
    let grupoRaw = p._grupo || p.grupo || p.grupo_producto || p.linea || p.familia || p.categoria || '';
    if (!grupoRaw) {
        const desc = (p.descripcion || p.nombre || '').toUpperCase();
        if (desc.includes('COCINA') || desc.includes('MESON') || desc.includes('LAVAPLATOS')) grupoRaw = 'COCINAS';
        else if (desc.includes('BAÑO') || desc.includes('BANO') || desc.includes('LAVAMANOS') || desc.includes('LVM') || desc.includes('MUEBLE') || desc.includes('MBLE')) grupoRaw = 'BAÑOS';
        else if (desc.includes('HIDROMASAJE') || desc.includes('SPA') || desc.includes('TINA')) grupoRaw = 'HIDROMASAJES';
        else if (desc.includes('REPUESTO')) grupoRaw = 'REPUESTOS';
        else if (desc.includes('INFRAESTRUCTURA')) grupoRaw = 'INFRAESTRUCTURA';
        else grupoRaw = 'OTROS';
    }
    return normalizeGrupoName(grupoRaw);
};

async function findRecords() {
    const { data: records, error } = await supabase
        .from('registro_solicitudes')
        .select('consecutivo, productos_novedad, created_at')
        .limit(10000)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error fetching records:", error);
        return;
    }

    console.log("Fetched records count:", records ? records.length : 0);

    const matchedRecords = [];

    const { data: productosCatalog } = await supabase.from('Productos').select('nombre, sku, grupo, planta');
    const skuToPlantaMap = new Map();
    const nombreToPlantaMap = new Map();
    const skuToGrupoMap = new Map();
    const nombreToGrupoMap = new Map();

    if (productosCatalog) {
        productosCatalog.forEach((prod) => {
            if (prod.grupo) {
                const grupoVal = String(prod.grupo).trim().toUpperCase();
                if (prod.sku) skuToGrupoMap.set(String(prod.sku).trim().toLowerCase(), grupoVal);
                if (prod.nombre) nombreToGrupoMap.set(String(prod.nombre).trim().toLowerCase(), grupoVal);
            }
            if (prod.planta) {
                const plantaVal = String(prod.planta).trim().toUpperCase();
                if (prod.sku) skuToPlantaMap.set(String(prod.sku).trim().toLowerCase(), plantaVal);
                if (prod.nombre) nombreToPlantaMap.set(String(prod.nombre).trim().toLowerCase(), plantaVal);
            }
        });
    }

    const normalizePlantaName = (planta) => {
        const p = String(planta).toUpperCase().trim();
        if (p === 'MBL') return 'MUEBLES';
        if (p === 'PC') return 'MARMOL';
        if (p === 'KIT') return 'KIT';
        if (p === 'FVHM' || p === 'FVHMP' || p === 'FV') return 'FIBRA';
        return p;
    };

    const getPlantaForProduct = (p) => {
        let rawPlanta = p.planta || p._planta || '';
        if (rawPlanta) return normalizePlantaName(rawPlanta);

        const code = String(p.codigo || p.referencia || p.sku || p.codigo_producto || p.cod_producto || p.cod || '').trim().toLowerCase();
        if (code && skuToPlantaMap.has(code)) return normalizePlantaName(skuToPlantaMap.get(code));

        const desc = String(p.descripcion || p.nombre || p.producto || '').trim().toLowerCase();
        if (desc && nombreToPlantaMap.has(desc)) return normalizePlantaName(nombreToPlantaMap.get(desc));

        return 'SIN PLANTA';
    };

    const getGrupoForProductWithMap = (p) => {
        const code = String(p.codigo || p.referencia || p.sku || p.codigo_producto || p.cod_producto || p.cod || '').trim().toLowerCase();
        if (code && skuToGrupoMap.has(code)) return normalizeGrupoName(skuToGrupoMap.get(code));
        
        const desc = String(p.descripcion || p.nombre || p.producto || '').trim().toLowerCase();
        if (desc && nombreToGrupoMap.has(desc)) return normalizeGrupoName(nombreToGrupoMap.get(desc));

        return getGrupoFromProduct(p);
    };

    const plantCounts = {};
    records.forEach(r => {
        if (Array.isArray(r.productos_novedad)) {
            r.productos_novedad.forEach(p => {
                const planta = getPlantaForProduct(p);
                plantCounts[planta] = (plantCounts[planta] || 0) + 1;
            });
        }
    });

    console.log("Plant counts:", plantCounts);
}

findRecords();
