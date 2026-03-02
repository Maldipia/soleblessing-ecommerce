/**
 * importFromSheets.ts
 *
 * Syncs product inventory from Google Sheets (CSV export) into the MySQL database.
 * This is the authoritative data pipeline: Google Sheets → MySQL → Frontend.
 *
 * Architecture:
 * - Reads directly from Google Sheets CSV export (no Apps Script dependency)
 * - Groups rows by SKU to create unified product records with all sizes
 * - Converts Google Drive image URLs to direct thumbnail URLs
 * - Clears and re-inserts the products table on each sync
 * - Called by admin.syncInventory tRPC endpoint
 */

import { drizzle } from "drizzle-orm/mysql2";
import { products } from "../drizzle/schema";

const SPREADSHEET_ID = '1WZttK5ZsPhnBz91JmBb-V4GCs-42uXjTUXz67V5sSDI';

// All sheet tabs to sync from
const TABS = [
  { name: '2025', gid: '631652219' },
  { name: '2024', gid: '0' },
  { name: 'ABB',  gid: '1973067738' },
  { name: 'MBB',  gid: '946254902' },
];

interface SheetRow {
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Parse a CSV line handling quoted fields that may contain commas */
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

/** Parse price string to a number in pesos (not centavos) */
function parsePricePesos(priceStr: string): number {
  if (!priceStr) return 0;
  const cleaned = priceStr.replace(/[₱,\s]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

/** Convert Google Drive share URLs to direct thumbnail URLs */
function convertGoogleDriveUrl(url: string): string {
  if (!url || url.trim() === '') return '';

  // https://drive.google.com/file/d/FILE_ID/view
  const viewMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (viewMatch) {
    return `https://drive.google.com/thumbnail?id=${viewMatch[1]}&sz=w800`;
  }

  // https://drive.google.com/open?id=FILE_ID  or  uc?id=FILE_ID
  const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idMatch) {
    return `https://drive.google.com/thumbnail?id=${idMatch[1]}&sz=w800`;
  }

  // Non-Drive URL (e.g. adidas CDN) — return as-is
  return url;
}

// ---------------------------------------------------------------------------
// Fetch
// ---------------------------------------------------------------------------

/**
 * Fetch all rows from a single Google Sheets tab via CSV export.
 * The sheet has 2 header rows: row 0 = blank, row 1 = column names.
 * Data starts at row 2.
 */
async function fetchTabRows(tabName: string, gid: string): Promise<SheetRow[]> {
  const csvUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=${gid}`;
  console.log(`[ImportFromSheets] Fetching ${tabName} tab...`);

  const response = await fetch(csvUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${tabName} tab: HTTP ${response.status}`);
  }

  const csvText = await response.text();
  const lines = csvText.split('\n');

  // Skip 2 header rows (row 0 = blank, row 1 = column names)
  const dataLines = lines.slice(2);

  const rows: SheetRow[] = [];
  for (const line of dataLines) {
    if (!line.trim()) continue;
    const cols = parseCSVLine(line);
    if (cols.length < 7) continue;

    rows.push({
      itemCode:     cols[0]  || '',
      details:      cols[1]  || '',
      sku:          cols[2]  || '',
      size:         cols[3]  || '',
      unitCost:     cols[4]  || '',
      sellingPrice: cols[5]  || '',
      status:       cols[6]  || '',
      supplier:     cols[7]  || '',
      condition:    cols[8]  || '',
      dateAdded:    cols[9]  || '',
      notes:        cols[10] || '',
      srp:          cols[13] || '',
      productsUrl:  cols[18] || '',
    });
  }

  console.log(`[ImportFromSheets] ${tabName}: fetched ${rows.length} raw rows`);
  return rows;
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export async function importProductsFromSheets(): Promise<{
  success: boolean;
  imported: number;
  skipped: number;
  message: string;
}> {
  try {
    if (!process.env.DATABASE_URL) {
      return {
        success: false,
        imported: 0,
        skipped: 0,
        message: 'DATABASE_URL environment variable is not set',
      };
    }

    const db = drizzle(process.env.DATABASE_URL);

    // -----------------------------------------------------------------------
    // 1. Fetch all rows from every tab
    // -----------------------------------------------------------------------
    const allRows: SheetRow[] = [];
    for (const tab of TABS) {
      try {
        const rows = await fetchTabRows(tab.name, tab.gid);
        allRows.push(...rows);
      } catch (err) {
        console.error(`[ImportFromSheets] Error fetching ${tab.name}:`, err);
        // Continue with other tabs even if one fails
      }
    }
    console.log(`[ImportFromSheets] Total raw rows from all tabs: ${allRows.length}`);

    // -----------------------------------------------------------------------
    // 2. Group rows by SKU
    // -----------------------------------------------------------------------
    type ProductEntry = {
      name: string;
      brand: string;
      category: string;
      basePrice: number;   // centavos
      salePrice: number | null; // centavos
      description: string;
      images: string[];
      sizes: string[];
      sizeStock: Record<string, number>;
      stock: number;
    };

    const productMap = new Map<string, ProductEntry>();
    let skipped = 0;

    for (const row of allRows) {
      // Must be AVAILABLE
      const statusUpper = row.status.toUpperCase().trim();
      if (statusUpper !== 'AVAILABLE') { skipped++; continue; }

      // Must have a product name and SKU
      if (!row.details.trim() || !row.sku.trim()) { skipped++; continue; }

      // Must have a size
      const size = row.size.trim();
      if (!size) { skipped++; continue; }

      // Must have a valid price
      const sellingPesos = parsePricePesos(row.sellingPrice);
      const srpPesos     = parsePricePesos(row.srp);
      if (sellingPesos === 0 && srpPesos === 0) { skipped++; continue; }

      // Must have an image URL (business rule: no photo = no listing)
      const imageUrl = convertGoogleDriveUrl(row.productsUrl);
      if (!imageUrl) { skipped++; continue; }

      // Pricing: basePrice = SRP (crossed out), salePrice = SELLING PRICE (bold)
      const effectivePrice = sellingPesos > 0 ? sellingPesos : srpPesos;
      const basePrice  = (srpPesos > 0 && srpPesos > effectivePrice)
        ? Math.round(srpPesos * 100)
        : Math.round(effectivePrice * 100);
      const salePrice  = (srpPesos > 0 && srpPesos > effectivePrice)
        ? Math.round(effectivePrice * 100)
        : null;

      const sku   = row.sku.trim();
      const brand = row.details.trim().split(/\s+/)[0] || 'Unknown';

      if (!productMap.has(sku)) {
        productMap.set(sku, {
          name:        row.details.trim(),
          brand,
          category:    'Sneakers',
          basePrice,
          salePrice,
          description: `${row.details.trim()}\nSKU: ${sku}${row.condition ? `\nCondition: ${row.condition}` : ''}`,
          images:      [imageUrl],
          sizes:       [size],
          sizeStock:   { [size]: 1 },
          stock:       1,
        });
      } else {
        const existing = productMap.get(sku)!;
        if (!existing.sizes.includes(size)) {
          existing.sizes.push(size);
          existing.sizeStock[size] = 1;
        } else {
          existing.sizeStock[size] = (existing.sizeStock[size] || 0) + 1;
        }
        existing.stock += 1;
        if (!existing.images.includes(imageUrl)) {
          existing.images.push(imageUrl);
        }
      }
    }

    console.log(`[ImportFromSheets] Unique products: ${productMap.size}, rows skipped: ${skipped}`);

    if (productMap.size === 0) {
      return {
        success: false,
        imported: 0,
        skipped,
        message: 'No valid products found. Check that products have AVAILABLE status, a size, a price, and an image URL.',
      };
    }

    // -----------------------------------------------------------------------
    // 3. Clear existing products and re-insert
    // -----------------------------------------------------------------------
    console.log('[ImportFromSheets] Clearing existing products...');
    await db.delete(products);

    const productsToInsert = Array.from(productMap.values()).map(data => ({
      name:        data.name,
      description: data.description,
      brand:       data.brand,
      category:    data.category,
      basePrice:   data.basePrice,
      salePrice:   data.salePrice,
      images:      JSON.stringify(data.images),
      sizes:       JSON.stringify(data.sizes),
      sizeStock:   JSON.stringify(data.sizeStock),
      stock:       data.stock,
      featured:    0 as const,
      clearance:   0 as const,
    }));

    // Insert in batches of 100 to avoid MySQL packet-size limits
    const BATCH = 100;
    let totalInserted = 0;
    for (let i = 0; i < productsToInsert.length; i += BATCH) {
      const batch = productsToInsert.slice(i, i + BATCH);
      await db.insert(products).values(batch);
      totalInserted += batch.length;
      console.log(`[ImportFromSheets] Inserted ${totalInserted}/${productsToInsert.length}`);
    }

    const message = `Successfully synced ${totalInserted} products from Google Sheets (${skipped} rows skipped)`;
    console.log(`[ImportFromSheets] ${message}`);

    return { success: true, imported: totalInserted, skipped, message };

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[ImportFromSheets] Import failed:', error);
    return { success: false, imported: 0, skipped: 0, message };
  }
}
