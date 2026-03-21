const SPREADSHEET_ID = '1WZttK5ZsPhnBz91JmBb-V4GCs-42uXjTUXz67V5sSDI';

const SHEET_TABS = [
  { name: '2025', gid: '631652219' },
  { name: '2024', gid: '0' },
  { name: 'ABB',  gid: '1973067738' },
  { name: 'MBB',  gid: '946254902' },
];

const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

// ─── Supabase config ───
const SUPABASE_URL      = process.env.VITE_SUPABASE_URL      || 'https://akualfrqzaierqsfcnkp.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

// In-memory cache
let cachedInventory: ProductRow[] | null = null;
let lastFetchTime   = 0;
let isFetching      = false;

// Supabase image cache (item_code → CDN url)
let imageCache: Map<string, string> = new Map();
let imageCacheLoaded = false;
let imageCacheTime   = 0;
const IMAGE_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

export interface ProductRow {
  itemCode:     string;
  details:      string;
  sku:          string;
  size:         string;
  unitCost:     string;
  sellingPrice: string;
  status:       string;
  supplier:     string;
  condition:    string;
  dateAdded:    string;
  notes:        string;
  srp:          string;
  productsUrl:  string;
  imageUrl:     string;  // ← resolved CDN url (Supabase first, Drive fallback)
}

/**
 * Load image cache from Supabase product_image_cache table
 * Returns a Map<item_code, supabase_url>
 */
async function loadImageCache(): Promise<Map<string, string>> {
  const now = Date.now();
  if (imageCacheLoaded && (now - imageCacheTime) < IMAGE_CACHE_TTL) {
    return imageCache;
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.log('[Supabase] No credentials — skipping image cache');
    return new Map();
  }

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/product_image_cache?select=item_code,supabase_url&sync_status=eq.SYNCED&limit=5000`,
      {
        headers: {
          'apikey':        SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
      }
    );

    if (!res.ok) {
      console.error('[Supabase] Image cache fetch failed:', res.status);
      return imageCache; // return stale cache
    }

    const rows: Array<{ item_code: string; supabase_url: string }> = await res.json();
    const newCache = new Map<string, string>();
    rows.forEach(r => {
      if (r.item_code && r.supabase_url) {
        newCache.set(r.item_code.trim(), r.supabase_url);
      }
    });

    imageCache        = newCache;
    imageCacheLoaded  = true;
    imageCacheTime    = now;

    console.log(`[Supabase] Image cache loaded: ${newCache.size} items`);
    return newCache;

  } catch (err) {
    console.error('[Supabase] Image cache error:', err);
    return imageCache;
  }
}

/**
 * Convert Google Drive share URLs to direct thumbnail URLs (fallback)
 */
export function convertGoogleDriveUrl(url: string): string {
  if (!url || url.trim() === '') return '';
  const viewMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (viewMatch) return `https://drive.google.com/thumbnail?id=${viewMatch[1]}&sz=w400`;
  const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idMatch) return `https://drive.google.com/thumbnail?id=${idMatch[1]}&sz=w400`;
  return url;
}

/**
 * Extract Google Drive file ID from a Drive URL
 */
export function extractDriveId(url: string): string {
  if (!url) return '';
  const viewMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (viewMatch) return viewMatch[1];
  const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idMatch) return idMatch[1];
  return '';
}

/**
 * Fetch products from a single sheet tab
 */
async function fetchFromSingleTab(tabName: string, gid: string, imgCache: Map<string, string>): Promise<ProductRow[]> {
  try {
    const csvUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=${gid}`;
    const response = await fetch(csvUrl);
    if (!response.ok) {
      console.error(`[GoogleSheets] Failed to fetch ${tabName}: ${response.status}`);
      return [];
    }

    const csvText  = await response.text();
    const lines    = csvText.split('\n');
    const dataLines = lines.slice(2); // skip 2 header rows
    const products: ProductRow[] = [];

    for (const line of dataLines) {
      if (!line.trim()) continue;
      const row = parseCSVLine(line);
      if (row.length < 7) continue;

      const itemCode = (row[0] || '').trim();

      // ─── Image resolution: Supabase CDN first, Drive thumbnail fallback ───
      const driveUrl   = row[18] || '';
      let   imageUrl   = '';

      if (imgCache.has(itemCode)) {
        // ✅ Fast path: Supabase CDN
        imageUrl = imgCache.get(itemCode)!;
      } else if (driveUrl.trim() !== '') {
        // ⚠️ Fallback: Drive thumbnail (slower)
        imageUrl = convertGoogleDriveUrl(driveUrl);
      }

      const product: ProductRow = {
        itemCode,
        details:      row[1]  || '',
        sku:          row[2]  || '',
        size:         row[3]  || '',
        unitCost:     row[4]  || '',
        sellingPrice: row[5]  || '',
        status:       row[6]  || '',
        supplier:     row[7]  || '',
        condition:    row[8]  || '',
        dateAdded:    row[9]  || '',
        notes:        row[10] || '',
        srp:          row[13] || '',
        productsUrl:  driveUrl,
        imageUrl,
      };

      const hasImage      = driveUrl.trim() !== '' || imgCache.has(itemCode);
      const statusUpper   = product.status.toUpperCase().trim();
      const isAvailable   = statusUpper === 'AVAILABLE';
      const isSoldOut     = statusUpper.includes('SOLD') || statusUpper.includes('OUT') || statusUpper.includes('MISSING');
      const hasSize       = product.size.trim() !== '';
      const hasValidPrice = parsePrice(product.sellingPrice) > 0 || parsePrice(product.srp) > 0;

      if (hasImage && isAvailable && !isSoldOut && hasSize && hasValidPrice) {
        products.push(product);
      }
    }

    console.log(`[GoogleSheets] Tab ${tabName}: ${products.length} available products`);
    return products;

  } catch (error) {
    console.error(`[GoogleSheets] Error reading ${tabName}:`, error);
    return [];
  }
}

/**
 * Fetch products from ALL sheet tabs
 */
async function fetchInventoryFromSheets(): Promise<ProductRow[]> {
  try {
    // Load Supabase image cache first (fast, in parallel with first tab)
    const imgCache = await loadImageCache();

    const allProducts: ProductRow[]  = [];
    const seenItemCodes = new Set<string>();

    const results = await Promise.all(
      SHEET_TABS.map(tab => fetchFromSingleTab(tab.name, tab.gid, imgCache))
    );

    for (const tabProducts of results) {
      for (const product of tabProducts) {
        if (!seenItemCodes.has(product.itemCode)) {
          seenItemCodes.add(product.itemCode);
          allProducts.push(product);
        }
      }
    }

    const supabaseCount = allProducts.filter(p => p.imageUrl.includes('supabase')).length;
    const driveCount    = allProducts.filter(p => p.imageUrl.includes('drive.google')).length;

    console.log(`[GoogleSheets] Total: ${allProducts.length} products | Supabase CDN: ${supabaseCount} | Drive fallback: ${driveCount}`);
    return allProducts;

  } catch (error) {
    console.error('[GoogleSheets] Error reading inventory:', error);
    return [];
  }
}

/**
 * Parse a CSV line handling quoted fields with commas
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

export function parsePrice(priceStr: string): number {
  if (!priceStr) return 0;
  const cleaned = priceStr.replace(/[₱,\s]/g, '');
  const parsed  = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : Math.round(parsed * 100);
}

export function calculateDiscount(srp: string, sellingPrice: string): number {
  const originalPrice = parsePrice(srp);
  const salePrice     = parsePrice(sellingPrice);
  if (originalPrice === 0 || salePrice === 0) return 0;
  if (salePrice >= originalPrice) return 0;
  return Math.round(((originalPrice - salePrice) / originalPrice) * 100);
}

/**
 * Cached inventory with automatic 5-minute refresh
 */
export async function readInventoryFromSheets(): Promise<ProductRow[]> {
  const now      = Date.now();
  const cacheAge = now - lastFetchTime;

  if (cachedInventory && cacheAge < CACHE_DURATION_MS && !isFetching) {
    const minutesOld = Math.floor(cacheAge / 60000);
    console.log(`[GoogleSheets] Returning cached inventory (${minutesOld}m old, ${cachedInventory.length} products)`);
    return cachedInventory;
  }

  if (isFetching) {
    for (let i = 0; i < 20; i++) {
      await new Promise(resolve => setTimeout(resolve, 500));
      if (!isFetching && cachedInventory) return cachedInventory;
    }
    return cachedInventory || [];
  }

  isFetching = true;
  try {
    const freshData  = await fetchInventoryFromSheets();
    cachedInventory  = freshData;
    lastFetchTime    = now;
    console.log(`[GoogleSheets] Cache updated: ${freshData.length} products`);
    return freshData;
  } catch (error) {
    console.error('[GoogleSheets] Error updating cache:', error);
    return cachedInventory || [];
  } finally {
    isFetching = false;
  }
}

export function startAutoSync() {
  console.log('[GoogleSheets] Starting auto-sync every 5 minutes...');
  readInventoryFromSheets().then(() => {
    console.log('[GoogleSheets] Initial inventory loaded');
  });
  setInterval(async () => {
    try {
      lastFetchTime = 0;
      await readInventoryFromSheets();
    } catch (error) {
      console.error('[GoogleSheets] Auto-sync error:', error);
    }
  }, CACHE_DURATION_MS);
}
