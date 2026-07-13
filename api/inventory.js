
const SPREADSHEET_ID = '1WZttK5ZsPhnBz91JmBb-V4GCs-42uXjTUXz67V5sSDI';
const GID_2025 = '631652219';
const GID_2024 = '0';
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
function detectBrand(name, sku) {
  const n = (name || '').toUpperCase();
  const s = (sku  || '').toUpperCase();
  // Jordan first (subset of Nike)
  if (n.includes('JORDAN') || n.includes('AIR JORDAN')) return 'Jordan';
  // Nike
  if (n.includes('NIKE') || n.includes('AIR FORCE') || n.includes('LEBRON') ||
      n.includes('DUNK') || n.includes('GAMMA FORCE') || n.includes('PRECISION') ||
      n.includes('COURT ROYALE') || n.includes('COURT LEGACY') || n.includes('COURT VISION') ||
      n.includes('WAFFLE') || n.includes('AF1') || n.includes('SB ') || n.includes('WMNS AIR')) return 'Nike';
  // On Running
  if (s.startsWith('3MF') || s.startsWith('3ME') || n.includes('CLOUD ') ||
      n.includes('NOVA FORM') || n.includes('ON RUNNING')) return 'On Running';
  // VEJA
  if (n.includes('VEJA')) return 'VEJA';
  // Default → Adidas (SUPERSTAR, STAN SMITH, NMD, CAMPUS, SAMBA, GAZELLE, RIVALRY, FORUM, etc.)
  return 'Adidas';
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
    // Single source of truth: sb_inventory (DB). Images from product_image_cache CDN.
    const sbAuth = { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } };
    const [invRes, imgRes] = await Promise.allSettled([
      fetch(`${SUPABASE_URL}/rest/v1/sb_inventory?select=*&order=item_code.asc&limit=5000`, sbAuth),
      fetch(`${SUPABASE_URL}/rest/v1/product_image_cache?select=item_code,supabase_url&sync_status=eq.OK`, sbAuth),
    ]);

    if (invRes.status !== 'fulfilled' || !invRes.value.ok) {
      return res.status(502).json({ error: 'Inventory fetch failed' });
    }
    const rows = await invRes.value.json();

    const cdnImages = new Map();
    if (imgRes.status === 'fulfilled' && imgRes.value && imgRes.value.ok) {
      const imgs = await imgRes.value.json();
      if (Array.isArray(imgs)) imgs.forEach(r => { if (r.supabase_url) cdnImages.set(r.item_code, r.supabase_url); });
    }

    const products = [];
    for (const r of rows) {
      const status = (r.status || '').toUpperCase().trim();
      const isSoldOut = status.includes('SOLD') || status === 'MISSING';
      if (isSoldOut) continue;
      const price = r.selling_price || r.srp || 0;
      if (!price) continue;
      if ((r.stock ?? 1) <= 0) continue;

      products.push({
        itemCode: r.item_code,
        name: r.name,
        sku: r.sku || '',
        size: r.size || '',
        sellingPrice: r.selling_price || 0,
        srp: r.srp || 0,
        status: status || 'AVAILABLE',
        imageUrl: cdnImages.get(r.item_code) || convertDriveUrl(r.drive_url || ''),
        productsUrl: r.drive_url || '',
        stock: r.stock ?? 1,
        discount: (() => {
          const sp = r.srp || 0, pp = r.selling_price || 0;
          if (!sp || !pp || pp >= sp) return 0;
          return Math.round(((sp - pp) / sp) * 100);
        })(),
        tab: r.tab || '2025',
        brand: detectBrand(r.name || '', r.sku || ''),
        unitCost: r.unit_cost || null, // admin only
        edited: !!(r.updated_at && r.created_at && r.updated_at !== r.created_at),
      });
    }

    const count2025 = products.filter(p => p.tab === '2025').length;
    const count2024 = products.filter(p => p.tab === '2024').length;
    res.status(200).json({ products, count: products.length, tabs: { '2025': count2025, '2024': count2024 } });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
}
