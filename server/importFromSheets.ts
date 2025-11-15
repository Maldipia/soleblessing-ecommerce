import { drizzle } from "drizzle-orm/mysql2";
import { products } from "../drizzle/schema";

const SHEETS_API_URL = "https://script.google.com/macros/s/AKfycbzpAMnNug5WkWJ6kqm7zeEvoIx7C_wMHCd_jEZ5s0clTxG8f1CZhtBefDRsKS5NWBLcwA/exec";
const TABS = ["2025", "2024", "ABB", "MBB", "ABKK", "PERFUME"];

interface SheetRow {
  "ITEM CODE": string | number;
  DETAILS: string;
  SKU: string;
  SIZE: string | number;
  "Unit cost": number | string;
  "SELLING PRICE": number | string;
  STATUS: string;
  SUPPLIER?: string;
  CONDITION?: string;
  "DATE ADDED"?: string;
  NOTES?: string;
  SRP?: number | string;
  "PRODUCTS URL"?: string;
}

function convertGoogleDriveUrl(url: string): string {
  if (!url) return "";
  
  // Match Google Drive URLs
  const driveMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (driveMatch) {
    const fileId = driveMatch[1];
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
  }
  
  return url;
}

async function fetchSheetData(tab: string): Promise<SheetRow[]> {
  const url = `${SHEETS_API_URL}?sheet=${tab}`;
  
  const response = await fetch(url);
  const json = await response.json();
  
  if (json.status !== "success") {
    throw new Error(`Failed to fetch ${tab}: ${json.message}`);
  }
  
  return json.data as SheetRow[];
}

export async function importProductsFromSheets(): Promise<{
  success: boolean;
  imported: number;
  skipped: number;
  message: string;
}> {
  try {
    const db = drizzle(process.env.DATABASE_URL!);
    
    // Clear existing products
    await db.delete(products);
    
    // Fetch data from all tabs
    const allRows: SheetRow[] = [];
    let skipped = 0;
    
    for (const tab of TABS) {
      const rows = await fetchSheetData(tab);
      allRows.push(...rows);
    }
    
    // Group products by SKU
    const productMap = new Map<string, {
      name: string;
      brand: string;
      category: string;
      basePrice: number;
      salePrice: number | null;
      images: string[];
      sizes: string[];
      sizeStock: Record<string, number>;
      condition: string;
      supplier: string;
    }>();
    
    for (const row of allRows) {
      // Skip if no SELLING PRICE
      const sellingPrice = parseFloat(String(row["SELLING PRICE"] || "0").replace(/[^0-9.]/g, ""));
      if (!sellingPrice || isNaN(sellingPrice)) {
        skipped++;
        continue;
      }
      
      // Skip if no image URL
      if (!row["PRODUCTS URL"] || String(row["PRODUCTS URL"]).trim() === "") {
        skipped++;
        continue;
      }
      
      // Skip if STATUS is not AVAILABLE
      if (row.STATUS !== "AVAILABLE") {
        skipped++;
        continue;
      }
      
      // Skip if CONDITION is "NO RECORD" or SUPPLIER is "2024"
      if (row.CONDITION === "NO RECORD" || row.SUPPLIER === "2024") {
        skipped++;
        continue;
      }
      
      const sku = String(row.SKU);
      const size = String(row.SIZE);
      const imageUrl = convertGoogleDriveUrl(String(row["PRODUCTS URL"]));
      
      // Parse SRP (original price)
      const srp = row.SRP ? parseFloat(String(row.SRP).replace(/[^0-9.]/g, "")) : null;
      
      // Determine base price and sale price
      let basePrice = sellingPrice;
      let salePrice: number | null = null;
      
      if (srp && srp > sellingPrice) {
        basePrice = srp;
        salePrice = sellingPrice;
      }
      
      if (!productMap.has(sku)) {
        // Extract brand from DETAILS (first word)
        const details = String(row.DETAILS || "");
        const brand = details.split(" ")[0] || "Unknown";
        
        productMap.set(sku, {
          name: details,
          brand,
          category: "Sneakers",
          basePrice,
          salePrice,
          images: [imageUrl],
          sizes: [size],
          sizeStock: { [size]: 1 },
          condition: row.CONDITION || "GOOD",
          supplier: row.SUPPLIER || "UNKNOWN",
        });
      } else {
        const existing = productMap.get(sku)!;
        if (!existing.sizes.includes(size)) {
          existing.sizes.push(size);
        }
        existing.sizeStock[size] = (existing.sizeStock[size] || 0) + 1;
        
        // Add image if not already present
        if (!existing.images.includes(imageUrl)) {
          existing.images.push(imageUrl);
        }
      }
    }
    
    // Insert products into database
    const productsToInsert = Array.from(productMap.entries()).map(([sku, data]) => ({
      name: data.name,
      sku,
      brand: data.brand,
      category: data.category,
      basePrice: data.basePrice,
      salePrice: data.salePrice,
      images: JSON.stringify(data.images),
      sizes: JSON.stringify(data.sizes),
      sizeStock: JSON.stringify(data.sizeStock),
      description: `${data.brand} ${data.name}`,
      featured: 0,
      clearance: 0,
    }));
    
    if (productsToInsert.length > 0) {
      await db.insert(products).values(productsToInsert);
    }
    
    return {
      success: true,
      imported: productsToInsert.length,
      skipped,
      message: `Successfully imported ${productsToInsert.length} products (${skipped} rows skipped)`,
    };
  } catch (error) {
    console.error("Import error:", error);
    return {
      success: false,
      imported: 0,
      skipped: 0,
      message: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
