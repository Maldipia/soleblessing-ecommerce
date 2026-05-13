
const SPREADSHEET_ID = '1WZttK5ZsPhnBz91JmBb-V4GCs-42uXjTUXz67V5sSDI';
const GID_2025 = '631652219';
const SUPABASE_URL = 'https://akualfrqzaierqsfcnkp.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

function parseCSVLine(line) {
  const result = []; let current = ''; let inQuotes = false;
  for (const ch of line) {
    if (ch === '"') { inQuotes = !inQuotes; }
    else if (ch === ',' && !inQuotes) { result.push(current.trim()); current = ''; }
    else { current += ch; }
  }
  result.push(current.trim());
  return result;
}
function parsePrice(str) {
  if (!str) return 0;
  const n = parseFloat(str.replace(/[₱,\s]/g, ''));
  return isNaN(n) ? 0 : Math.round(n * 100);
}
function convertDriveUrl(url) {
  if (!url || !url.trim()) return '';
  const m = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (m) return `https://drive.google.com/thumbnail?id=${m[1]}&sz=w400`;
  const m2 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (m2) return `https://drive.google.com/thumbnail?id=${m2[1]}&sz=w400`;
  return url;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');

  try {
    // Fetch Google Sheets CSV + Supabase overrides in parallel
    const [csvRes, sbRes] = await Promise.allSettled([
      fetch(`https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=${GID_2025}`,
        { headers: { 'User-Agent': 'Mozilla/5.0' } }),
      SUPABASE_KEY ? fetch(`${SUPABASE_URL}/rest/v1/sb_inventory?select=*`,
        { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }) : Promise.resolve(null),
    ]);

    if (csvRes.status !== 'fulfilled' || !csvRes.value.ok) {
      return res.status(502).json({ error: 'Sheet fetch failed' });
    }

    // Build Supabase overrides map keyed by item_code
    const overrides = new Map();
    if (sbRes.status === 'fulfilled' && sbRes.value && sbRes.value.ok) {
      const rows = await sbRes.value.json();
      if (Array.isArray(rows)) rows.forEach(r => overrides.set(r.item_code, r));
    }

    const csvText = await csvRes.value.text();
    const lines = csvText.split('\n').slice(2);
    const products = [];
    const seen = new Set();

    for (const line of lines) {
      if (!line.trim()) continue;
      const row = parseCSVLine(line);
      if (row.length < 7) continue;

      const itemCode    = (row[0]  || '').trim();
      const details     = (row[1]  || '').trim();
      const sku         = (row[2]  || '').trim();
      const size        = (row[3]  || '').trim();
      const unitCost    = parsePrice(row[4]  || '');  // col E — admin only, never in response
      const srp         = parsePrice(row[13] || '');
      const sellingPrice = parsePrice(row[5]  || '');
      const status      = (row[6]  || '').toUpperCase().trim();
      const driveUrl    = (row[18] || '').trim();

      if (!itemCode || !details) continue;
      if (!size) continue;
      const isSoldOut = status.includes('SOLD') || status === 'MISSING';
      if (isSoldOut) continue;
      // Sanity cap: reject prices > ₱99,999 (corrupt sheet cell like 55356005300)
      const MAX_PRICE = 9999900; // ₱99,999 in centavos
      const cleanSelling = sellingPrice <= MAX_PRICE ? sellingPrice : 0;
      const cleanSrp     = srp <= MAX_PRICE ? srp : 0;
      const price = cleanSelling || cleanSrp;
      if (!price) continue;
      if (seen.has(itemCode)) continue;
      seen.add(itemCode);

      // Apply Supabase overrides if they exist
      const ov = overrides.get(itemCode) || {};
      const finalUnitCost = ov.unit_cost != null ? ov.unit_cost : unitCost; // admin-only
      const finalSrp = ov.srp != null ? ov.srp : cleanSrp;
      const finalSelling = ov.selling_price != null ? ov.selling_price : cleanSelling;
      const finalSku = ov.sku || sku;
      const finalSize = ov.size || size;
      const finalName = ov.name || details;
      const finalStock = ov.stock != null ? ov.stock : 1;
      const hasSbOverride = overrides.has(itemCode);

      products.push({
        itemCode,
        name: finalName,
        sku: finalSku,
        size: finalSize,
        sellingPrice: finalSelling,
        srp: finalSrp,
        status: ov.status?.toUpperCase() || status,
        imageUrl: convertDriveUrl(driveUrl),
        productsUrl: driveUrl,
        stock: finalStock,
        discount: (() => {
          const s = finalSrp, p = finalSelling;
          if (!s || !p || p >= s) return 0;
          return Math.round(((s - p) / s) * 100);
        })(),
        edited: hasSbOverride,
      });
    }

    res.status(200).json({ products, count: products.length, tab: '2025' });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
}
