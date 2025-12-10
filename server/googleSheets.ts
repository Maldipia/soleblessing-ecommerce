const SPREADSHEET_ID = '1WZttK5ZsPhnBz91JmBb-V4GCs-42uXjTUXz67V5sSDI';
const SHEET_GID = '631652219'; // GID for 2025 tab (from URL: gid=631652219)

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
 * Read products from Google Sheets NSB INVENTORY using CSV export
 * Since the sheet is public ("Anyone with the link can view"), we can fetch it as CSV
 * 
 * Columns: A=ITEM CODE, B=DETAILS, C=SKU, D=SIZE, E=Unit cost, F=SELLING PRICE,
 *          G=STATUS, H=SUPPLIER, I=CONDITION, J=DATE ADDED, K=NOTES,
 *          N=SRP, P=ITEM CODE (dup), Q=Unit cost (dup), R=STATUS (dup), S=PRODUCTS URL
 */
export async function readInventoryFromSheets(): Promise<ProductRow[]> {
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
      
      // Filter only AVAILABLE products
      if (product.status.toUpperCase() === 'AVAILABLE') {
        products.push(product);
      }
    }
    
    console.log(`[GoogleSheets] Successfully read ${products.length} available products`);
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
 * Parse price string to number
 * Handles formats like "₱2,250.00" or "2250"
 */
export function parsePrice(priceStr: string): number {
  if (!priceStr) return 0;
  
  // Remove currency symbols, commas, and spaces
  const cleaned = priceStr.replace(/[₱,\s]/g, '');
  const parsed = parseFloat(cleaned);
  
  return isNaN(parsed) ? 0 : parsed;
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
