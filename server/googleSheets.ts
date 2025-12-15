const SPREADSHEET_ID = '1WZttK5ZsPhnBz91JmBb-V4GCs-42uXjTUXz67V5sSDI';
const SHEET_GID = '631652219'; // 2025 tab
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

// In-memory cache
let cachedInventory: ProductRow[] | null = null;
let lastFetchTime: number = 0;
let isFetching = false;

export interface ProductRow {
  itemCode: string;
  details: string;
  sku: string;
  size: string;
  unitCost: string;
  sellingPrice: string;
  status: string;
  supplier: string;
  condition: string;
  dateAdded: string;
  notes: string;
  srp: string;
  productsUrl: string;
}

/**
 * Internal function to fetch fresh data from Google Sheets
 * This is called by the cached version below
 */
async function fetchInventoryFromSheets(): Promise<ProductRow[]> {
  try {
    // Use CSV export URL for public sheets
    const csvUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=${SHEET_GID}`;
    
    const response = await fetch(csvUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch sheet: ${response.status} ${response.statusText}`);
    }
    
    const csvText = await response.text();
    const lines = csvText.split('\n');
    
    // Skip header row (first line)
    const dataLines = lines.slice(1);
    
    const products: ProductRow[] = [];
    
    for (const line of dataLines) {
      if (!line.trim()) continue;
      
      // Parse CSV line (handle quoted fields with commas)
      const row = parseCSVLine(line);
      
      if (row.length < 7) continue; // Skip incomplete rows
      
      const product: ProductRow = {
        itemCode: row[0] || '',        // A: ITEM CODE
        details: row[1] || '',          // B: DETAILS
        sku: row[2] || '',              // C: SKU
        size: row[3] || '',             // D: SIZE
        unitCost: row[4] || '',         // E: Unit cost
        sellingPrice: row[5] || '',     // F: SELLING PRICE (discounted price)
        status: row[6] || '',           // G: STATUS
        supplier: row[7] || '',         // H: SUPPLIER
        condition: row[8] || '',        // I: CONDITION
        dateAdded: row[9] || '',        // J: DATE ADDED
        notes: row[10] || '',           // K: NOTES
        srp: row[13] || '',             // N: SRP (original price)
        productsUrl: row[18] || '',     // S: PRODUCTS URL (was Q, but actually S)
      };
      
      // Filter only AVAILABLE products with images, valid price, and size
      // Skip if: no image URL, status is not AVAILABLE, status is SOLD/OUT, no size, or zero price
      const hasImage = product.productsUrl && product.productsUrl.trim() !== '';
      const statusUpper = product.status.toUpperCase().trim();
      const isAvailable = statusUpper === 'AVAILABLE';
      const isSoldOut = statusUpper.includes('SOLD') || statusUpper.includes('OUT') || statusUpper.includes('MISSING');
      const hasSize = product.size && product.size.trim() !== '';
      const hasValidPrice = parsePrice(product.sellingPrice) > 0 || parsePrice(product.srp) > 0;
      
      if (hasImage && isAvailable && !isSoldOut && hasSize && hasValidPrice) {
        products.push(product);
      }
    }
    
    const timestamp = new Date().toISOString();
    console.log(`[GoogleSheets] Successfully fetched ${products.length} available products at ${timestamp}`);
    return products;
    
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

/**
 * Parse price string to number in centavos
 * Handles formats like "₱2,250.00" or "2250"
 * Returns price in centavos (multiply by 100) to match frontend expectations
 */
export function parsePrice(priceStr: string): number {
  if (!priceStr) return 0;
  
  // Remove currency symbols, commas, and spaces
  const cleaned = priceStr.replace(/[₱,\s]/g, '');
  const parsed = parseFloat(cleaned);
  
  // Convert pesos to centavos (multiply by 100)
  return isNaN(parsed) ? 0 : Math.round(parsed * 100);
}

/**
 * Calculate discount percentage
 */
export function calculateDiscount(srp: string, sellingPrice: string): number {
  const originalPrice = parsePrice(srp);
  const salePrice = parsePrice(sellingPrice);
  
  if (originalPrice === 0 || salePrice === 0) return 0;
  if (salePrice >= originalPrice) return 0;
  
  const discount = ((originalPrice - salePrice) / originalPrice) * 100;
  return Math.round(discount);
}

/**
 * Cached version of inventory with automatic 5-minute refresh
 * This is the main export that should be used by the application
 */
export async function readInventoryFromSheets(): Promise<ProductRow[]> {
  const now = Date.now();
  const cacheAge = now - lastFetchTime;
  
  // Return cached data if it's fresh and not currently fetching
  if (cachedInventory && cacheAge < CACHE_DURATION_MS && !isFetching) {
    const minutesOld = Math.floor(cacheAge / 60000);
    console.log(`[GoogleSheets] Returning cached inventory (${minutesOld}m old, ${cachedInventory.length} products)`);
    return cachedInventory;
  }
  
  // If already fetching, wait for it to complete
  if (isFetching) {
    console.log('[GoogleSheets] Fetch already in progress, waiting...');
    // Wait up to 10 seconds for the fetch to complete
    for (let i = 0; i < 20; i++) {
      await new Promise(resolve => setTimeout(resolve, 500));
      if (!isFetching && cachedInventory) {
        return cachedInventory;
      }
    }
    // If still fetching after 10s, return cached data or empty array
    return cachedInventory || [];
  }
  
  // Fetch fresh data
  isFetching = true;
  try {
    const freshData = await fetchInventoryFromSheets();
    cachedInventory = freshData;
    lastFetchTime = now;
    console.log(`[GoogleSheets] Cache updated with ${freshData.length} products`);
    return freshData;
  } catch (error) {
    console.error('[GoogleSheets] Error updating cache:', error);
    // Return stale cache if available, otherwise empty array
    return cachedInventory || [];
  } finally {
    isFetching = false;
  }
}

/**
 * Start automatic background refresh every 5 minutes
 * Call this once when the server starts
 */
export function startAutoSync() {
  console.log('[GoogleSheets] Starting auto-sync every 5 minutes...');
  
  // Initial fetch
  readInventoryFromSheets().then(() => {
    console.log('[GoogleSheets] Initial inventory loaded');
  });
  
  // Set up interval for automatic refresh
  setInterval(async () => {
    try {
      console.log('[GoogleSheets] Auto-sync triggered...');
      // Force a fresh fetch by clearing the cache timestamp
      lastFetchTime = 0;
      await readInventoryFromSheets();
    } catch (error) {
      console.error('[GoogleSheets] Auto-sync error:', error);
    }
  }, CACHE_DURATION_MS);
}
