import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// ─── SAP B1 Config ───────────────────────────────────────────────
// Puerto HTTP (50001) para evitar error de certificado SSL
const SAP_BASE_URL = "http://200.7.96.194:50001/b1s/v1";
const SAP_COMPANY  = "Firplak_SA";
const SAP_USER     = "manager";
const SAP_PASS     = "2023Fir#.*";

// ─── Supabase Config ─────────────────────────────────────────────
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// ─── Mapeo de prefijo SKU → grupo Supabase ───────────────────────
// Basado en los datos existentes en la tabla Productos
const SKU_PREFIX_TO_GROUP: Record<string, string> = {
  "VBAN": "BANO",
  "VBNA": "BANO",
  "VEXH": "BANO",
  "VPAP": "BANO",
  "VCOC": "COCINAS",
  "VCLO": "COCINAS",
  "VOCO": "COCINAS",
  "VPYM": "COCINAS",
  "VHEM": "HIDROEMP",
  "VHPT": "HIDROPOR",
  "VGRI": "GRIFERIA",
  "VROP": "ROPAS",
  "VMPD": "ROPAS",
  "VTIN": "BANERA",
  "VQUA": "QUARTZSTONE",
  "VCIV": "ZOCALOS",
};

// Mapeo U_Grupo SAP → grupo Supabase (respaldo)
const SAP_GRUPO_TO_SUPABASE: Record<string, string> = {
  "BAÑO":         "BANO",
  "COCINA":       "COCINAS",
  "COCINAS":      "COCINAS",
  "HIDROEMP":     "HIDROEMP",
  "HIDROPOR":     "HIDROPOR",
  "GRIFERIA":     "GRIFERIA",
  "ROPAS":        "ROPAS",
  "BANERA":       "BANERA",
  "QUARTZSTONE":  "QUARTZSTONE",
  "ZOCALOS":      "ZOCALOS",
  "PLOMERIA":     "PLOMERIA",
  "REPUESTO":     "REPUESTO",
  "MPDIRECT":     "MPDIRECT",
  "EXHIBIDOR":    "EXHIBIDOR",
  "SERVICIOS":    "SERVICIOS",
};

function resolveGroup(itemCode: string, uGrupo?: string): string {
  // 1. Intentar por prefijo de SKU (primeros 4 caracteres)
  const prefix = itemCode.substring(0, 4).toUpperCase();
  if (SKU_PREFIX_TO_GROUP[prefix]) {
    return SKU_PREFIX_TO_GROUP[prefix];
  }
  // 2. Intentar por U_Grupo de SAP
  if (uGrupo && SAP_GRUPO_TO_SUPABASE[uGrupo.toUpperCase()]) {
    return SAP_GRUPO_TO_SUPABASE[uGrupo.toUpperCase()];
  }
  // 3. Default
  return "NULL";
}

// ─── SAP Login ───────────────────────────────────────────────────
async function loginSAP(): Promise<string> {
  console.log(`[SAP] Logging in to ${SAP_BASE_URL}/Login`);
  const res = await fetch(`${SAP_BASE_URL}/Login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      CompanyDB: SAP_COMPANY,
      UserName:  SAP_USER,
      Password:  SAP_PASS,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`SAP Login failed (${res.status}): ${text}`);
  }

  await res.json(); // consume body
  return res.headers.get("set-cookie") ?? "";
}

// ─── Fetch SAP Items (paginated) ─────────────────────────────────
async function fetchSAPItems(cookies: string, skip: number, top: number): Promise<any[]> {
  // Solo items válidos, no congelados, que empiecen con V (productos de venta)
  const filter = `startswith(ItemCode,'V') and Valid eq 'tYES' and Frozen eq 'tNO'`;
  const select = `ItemCode,ItemName,BarCode,ItemsGroupCode,ItemPrices,U_Grupo`;
  const url = `${SAP_BASE_URL}/Items?$filter=${encodeURIComponent(filter)}&$select=${select}&$orderby=ItemCode&$top=${top}&$skip=${skip}`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      "Cookie": cookies,
      "Content-Type": "application/json",
      "Prefer": "odata.maxpagesize=500",
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`SAP Items fetch failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  return data.value ?? [];
}

// ─── Map SAP Item → Supabase row ─────────────────────────────────
function mapItem(item: any) {
  // Extraer precio de lista 7 (COP público), o la primera con precio > 0
  let precio: number | null = null;
  if (item.ItemPrices && Array.isArray(item.ItemPrices)) {
    const lista7 = item.ItemPrices.find((p: any) => p.PriceList === 7 && p.Price > 0);
    if (lista7) {
      precio = Math.round(lista7.Price);
    } else {
      const anyPrice = item.ItemPrices.find((p: any) => p.Price > 0);
      if (anyPrice) precio = Math.round(anyPrice.Price);
    }
  }

  return {
    sku:            item.ItemCode,
    nombre:         item.ItemName,
    codigo_barras:  item.BarCode || null,
    grupo:          resolveGroup(item.ItemCode, item.U_Grupo),
    precio:         precio,
    color_base:     "OTRO",
  };
}

// ─── Main Handler ─────────────────────────────────────────────────
Deno.serve(async () => {
  const startTime = Date.now();

  try {
    // 1. Login SAP
    const cookies = await loginSAP();
    console.log("[SAP] Login successful");

    // 2. Get existing SKUs from Supabase for comparison
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: existingProducts, error: fetchError } = await supabase
      .from("Productos")
      .select("sku");

    if (fetchError) throw new Error(`Supabase fetch error: ${fetchError.message}`);

    const existingSkus = new Set((existingProducts || []).map((p: any) => p.sku));
    console.log(`[Supabase] ${existingSkus.size} existing products`);

    // 3. Fetch ALL V-items from SAP in pages
    let allItems: any[] = [];
    let skip = 0;
    const pageSize = 500;
    let hasMore = true;

    while (hasMore) {
      console.log(`[SAP] Fetching items skip=${skip}`);
      const items = await fetchSAPItems(cookies, skip, pageSize);
      allItems = allItems.concat(items);
      skip += pageSize;
      hasMore = items.length === pageSize;
    }

    console.log(`[SAP] Total items fetched: ${allItems.length}`);

    // 4. Filter only NEW items (not in Supabase yet)
    const newItems = allItems.filter((item: any) => !existingSkus.has(item.ItemCode));
    console.log(`[Sync] New items to insert: ${newItems.length}`);

    // 5. Map and upsert in batches of 200
    let inserted = 0;
    const batchSize = 200;

    for (let i = 0; i < newItems.length; i += batchSize) {
      const batch = newItems.slice(i, i + batchSize).map(mapItem);
      const { error: upsertError } = await supabase
        .from("Productos")
        .upsert(batch, { onConflict: "sku" });

      if (upsertError) {
        console.error(`[Supabase] Upsert error (batch ${i}):`, upsertError.message);
      } else {
        inserted += batch.length;
        console.log(`[Supabase] Inserted batch: ${batch.length} items`);
      }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const result = {
      success: true,
      sap_total: allItems.length,
      existing_supabase: existingSkus.size,
      new_inserted: inserted,
      elapsed_seconds: elapsed,
    };

    console.log("[Sync] Complete:", JSON.stringify(result));

    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[Error]", err.message);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
