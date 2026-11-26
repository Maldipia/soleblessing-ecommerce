
const SPREADSHEET_ID = '1WZttK5ZsPhnBz91JmBb-V4GCs-42uXjTUXz67V5sSDI';
const GID_2025 = '631652219';
const GID_2024 = '0';
const SUPABASE_URL = 'https://akualfrqzaierqsfcnkp.supabase.co';
// Service role (server-side only): sb_inventory is no longer anon-readable.
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

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

// Flash sales (Promotions module): the ACTIVE campaign's price is applied here
// server-side, so every page, the cart and the catalog all see the flash price.
// Checkout re-validates in sb_place_order, so stale carts can never keep it.
const normCode = s => String(s || '').toUpperCase().replace(/\s+/g, '');
async function fetchActiveFlash(sbAuth) {
  const now = new Date().toISOString();
  const r = await fetch(`${SUPABASE_URL}/rest/v1/sb_flash_sales?status=eq.active&starts_at=lte.${encodeURIComponent(now)}&ends_at=gt.${encodeURIComponent(now)}&order=starts_at.desc`, { headers: sbAuth });
  if (!r.ok) return [];
  const rows = await r.json().catch(() => []);
  // stock-limit reached → campaign no longer prices anything
  return (Array.isArray(rows) ? rows : []).filter(f => f.stock_limit == null || (f.sold || 0) < f.stock_limit);
}
const flashPriceOf = (f, basePrice) => f.sale_price || Math.max(Math.floor(basePrice * (100 - (f.percent || 0)) / 100), 0);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');

  try {
    // Single source of truth: sb_inventory (DB). Images from product_image_cache CDN.
    // PostgREST caps each response at the project's max-rows (1000), so page
    // through with Range headers until a short page — a single capped request
    // silently drops everything past the first 1000 item codes.
    const sbAuth = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` };
    const PAGE = 1000;
    async function fetchAll(path) {
      const out = [];
      for (let from = 0; from < 20000; from += PAGE) {
        const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
          headers: { ...sbAuth, Range: `${from}-${from + PAGE - 1}` },
        });
        if (!r.ok) { if (from === 0) throw new Error(`fetch ${path}: ${r.status}`); break; }
        const page = await r.json();
        if (!Array.isArray(page)) break;
        out.push(...page);
        if (page.length < PAGE) break;
      }
      return out;
    }

    // Fast path for the site-wide banner: ?flash=1 returns only the active
    // banner-enabled campaign (cheap — no inventory scan).
    if (req.query && req.query.flash) {
      res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');
      const actives = await fetchActiveFlash(sbAuth);
      const fb = actives.find(f => f.banner);
      if (!fb) return res.status(200).json({ flash: null });
      let origPrice = 0, imageUrl = '', prodName = '';
      try {
        const code = (fb.item_codes || [])[0] || '';
        if (code) {
          const r = await fetch(`${SUPABASE_URL}/rest/v1/sb_inventory?item_code=eq.${encodeURIComponent(code)}&select=name,srp,selling_price&limit=1`, { headers: sbAuth });
          const [row] = await r.json().catch(() => []);
          if (row) { origPrice = row.srp || row.selling_price || 0; prodName = row.name || ''; }
          const ri = await fetch(`${SUPABASE_URL}/rest/v1/product_image_cache?item_code=eq.${encodeURIComponent(code)}&sync_status=eq.OK&is_box=not.is.true&select=supabase_url&limit=1`, { headers: sbAuth });
          const [img] = await ri.json().catch(() => []);
          if (img) imageUrl = img.supabase_url || '';
        }
      } catch {}
      return res.status(200).json({ flash: {
        name: fb.name, endsAt: fb.ends_at,
        price: fb.sale_price || null, percent: fb.percent || null,
        origPrice, imageUrl, productName: prodName,
        sku: (fb.skus || [])[0] || '', search: ((fb.skus || [])[0] || '').toLowerCase().replace(/\s+/g, '-'),
      }});
    }

    const [invRes, imgRes, flashRows] = await Promise.allSettled([
      fetchAll('sb_inventory?select=*&order=item_code.asc'),
      // is_box=true are warehouse box/label scans — never storefront material
      fetchAll('product_image_cache?select=item_code,supabase_url&sync_status=eq.OK&is_box=not.is.true&order=item_code.asc'),
      fetchActiveFlash(sbAuth),
    ]);

    if (invRes.status !== 'fulfilled') {
      return res.status(502).json({ error: 'Inventory fetch failed' });
    }
    const rows = invRes.value;

    const cdnImages = new Map();
    if (imgRes.status === 'fulfilled' && Array.isArray(imgRes.value)) {
      imgRes.value.forEach(r => { if (r.supabase_url) cdnImages.set(r.item_code, r.supabase_url); });
    }

    // normCode(item_code) → its active flash sale (first match wins)
    const flashByCode = new Map();
    const actives = flashRows.status === 'fulfilled' ? flashRows.value : [];
    for (const f of actives) for (const c of (f.item_codes || [])) {
      const k = normCode(c);
      if (!flashByCode.has(k)) flashByCode.set(k, f);
    }

    const products = [];
    for (const r of rows) {
      const status = (r.status || '').toUpperCase().trim();
      // 6-state model: only Available items are sellable. Reserved/Sold/Returned/
      // Damaged/Archived never reach the public store.
      const notSellable = status.includes('SOLD') || ['MISSING', 'RESERVED', 'RETURNED', 'DAMAGED', 'ARCHIVED'].includes(status);
      if (notSellable) continue;
      // Intake condition gate: Missing pair / Unknown are held off the store
      const cond = (r.condition || '').toUpperCase().trim();
      if (cond === 'MISSING PAIR' || cond === 'UNKNOWN') continue;
      const basePrice = r.selling_price || r.srp || 0;
      if (!basePrice) continue;
      if ((r.stock ?? 1) <= 0) continue;

      // Active flash sale covering this pair? Flash price becomes the selling
      // price everywhere (cards, cart, checkout display). SRP stays for the
      // strikethrough, so the discount % recomputes automatically.
      const fsHit = flashByCode.get(normCode(r.item_code));
      const flashPrice = fsHit ? flashPriceOf(fsHit, basePrice) : 0;

      products.push({
        ...(fsHit && flashPrice > 0 ? { flash: { name: fsHit.name, endsAt: fsHit.ends_at, origPrice: basePrice } } : {}),
        itemCode: r.item_code,
        name: r.name,
        sku: r.sku || '',
        size: r.size || '',
        sellingPrice: (fsHit && flashPrice > 0) ? flashPrice : (r.selling_price || 0),
        srp: r.srp || 0,
        status: status || 'AVAILABLE',
        imageUrl: cdnImages.get(r.item_code) || convertDriveUrl(r.drive_url || ''),
        productsUrl: r.drive_url || '',
        stock: r.stock ?? 1,
        discount: (() => {
          const sp = r.srp || 0;
          const pp = (fsHit && flashPrice > 0) ? flashPrice : (r.selling_price || 0);
          if (!sp || !pp || pp >= sp) return 0;
          return Math.round(((sp - pp) / sp) * 100);
        })(),
        tab: r.tab || '2025',
        brand: r.brand || detectBrand(r.name || '', r.sku || ''),
        condition: r.condition || 'New',
        category: r.category || 'Sneakers',
        sizeEur: r.size_eur || '',
        sizeCm: r.size_cm || '',
        barcode: r.barcode || '',
        // unit_cost NEVER leaves the server here — this API feeds the public
        // website. Admin reads costs through the authenticated admin channel.
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
