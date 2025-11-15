import { drizzle } from "drizzle-orm/mysql2";
import { products } from "../drizzle/schema";

const SHEETS_API_URL = "https://script.google.com/macros/s/AKfycbwJxkSFhjuPAWbIEmKa80w404DVtQ3k2h4YuaLdMEMTAoPTXGF2LhtQ_X98IDk8yY-oiA/exec";
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
  SRP?: number;
  "PRODUCTS URL"?: string;
}

async function fetchSheetData(tab: string): Promise<SheetRow[]> {
  const url = `${SHEETS_API_URL}?sheet=${tab}`;
  console.log(`📥 Fetching data from ${tab} tab...`);
  
  const response = await fetch(url);
  const json = await response.json();
  
  if (json.status !== "success") {
    throw new Error(`Failed to fetch ${tab}: ${json.message}`);
  }
  
  console.log(`✅ Fetched ${json.count} rows from ${tab}`);
  return json.data as SheetRow[];
}

async function importProducts() {
  console.log("🚀 Starting Google Sheets import...");
  
  const db = drizzle(process.env.DATABASE_URL!);
  
  // Clear existing products
  console.log("🗑️  Clearing existing products...");
  await db.delete(products);
  console.log("✅ Cleared existing products");
  
  // Fetch data from all tabs
  const allRows: SheetRow[] = [];
  let skipped = 0;
  
  for (const tab of TABS) {
    try {
      const rows = await fetchSheetData(tab);
      allRows.push(...rows);
    } catch (error) {
      console.error(`❌ Error fetching ${tab}:`, error);
    }
  }
  
  // Process and group products by CODE (SKU)
  const productMap = new Map<string, any>();
  
  for (const row of allRows) {
    // Skip if not AVAILABLE
    if (row.STATUS !== "AVAILABLE") {
      skipped++;
      continue;
    }
    
    // Skip if no product name
    if (!row.DETAILS || !row["ITEM CODE"]) {
      skipped++;
      continue;
    }
    
    // Parse prices (handle empty/zero values and empty strings)
    const parsePrice = (val: any): number => {
      if (val === null || val === undefined || val === '') return 0;
      const num = Number(val);
      return isNaN(num) ? 0 : num;
    };
    
    const sellingPrice = parsePrice(row["SELLING PRICE"]);
    const srp = parsePrice(row.SRP);
    
    // Skip if no price at all
    if (sellingPrice === 0 && srp === 0) {
      skipped++;
      continue;
    }
    
    // Determine final price to show
    const price = sellingPrice > 0 ? sellingPrice : srp;
    const originalPrice = srp > 0 && srp > price ? srp : null;
    
    // Extract brand from product name (first word usually)
    const brand = row.DETAILS.split(" ")[0] || "Unknown";
    
    // Use ITEM CODE as the unique key to group sizes
    const productKey = String(row["ITEM CODE"]);
    
    if (!productMap.has(productKey)) {
      // Create new product entry
      // Get image URL and convert Google Drive links to direct image URLs
      let imageUrl = row["PRODUCTS URL"] || "";
      if (imageUrl && imageUrl.includes("drive.google.com")) {
        // Convert Google Drive link to direct image URL
        const fileIdMatch = imageUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
        if (fileIdMatch) {
          imageUrl = `https://drive.google.com/uc?export=view&id=${fileIdMatch[1]}`;
        }
      }
      
      productMap.set(productKey, {
        name: row.DETAILS,
        brand: brand,
        category: "Sneakers",
        basePrice: Math.round(price * 100), // Convert to centavos (PHP cents)
        salePrice: originalPrice ? Math.round(price * 100) : null,
        description: `${row.DETAILS}\nSKU: ${row.SKU || productKey}\nCondition: ${row.CONDITION || "New"}${row.SUPPLIER ? `\nSupplier: ${row.SUPPLIER}` : ""}`,
        images: imageUrl ? [imageUrl] : [], // Store image URL if available
        sizes: [] as string[], // Temporary array
        sizeStock: {} as Record<string, number>, // Temporary object
        stock: 0,
      });
    }
    
    // Add size to the product
    const product = productMap.get(productKey);
    if (row.SIZE) {
      const sizeKey = String(row.SIZE).trim();
      if (!product.sizes.includes(sizeKey)) {
        product.sizes.push(sizeKey);
        product.sizeStock[sizeKey] = 1;
        product.stock += 1;
      }
    }
  }
  
  // Convert map to array and stringify JSON fields
  const productsToInsert = Array.from(productMap.values()).map(p => ({
    ...p,
    images: JSON.stringify(p.images),
    sizes: JSON.stringify(p.sizes),
    sizeStock: JSON.stringify(p.sizeStock),
  }));
  
  console.log(`📦 Inserting ${productsToInsert.length} unique products into database...`);
  
  // Insert in batches of 100
  const batchSize = 100;
  for (let i = 0; i < productsToInsert.length; i += batchSize) {
    const batch = productsToInsert.slice(i, i + batchSize);
    await db.insert(products).values(batch);
    console.log(`   Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(productsToInsert.length / batchSize)}`);
  }
  
  console.log("✅ Import complete!");
  console.log(`📊 Total products imported: ${productsToInsert.length}`);
  console.log(`⏭️  Total rows skipped: ${skipped}`);
}

importProducts()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Import failed:", error);
    process.exit(1);
  });
