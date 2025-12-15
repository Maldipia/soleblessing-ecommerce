import { readInventoryFromSheets } from "./server/googleSheets";

async function checkImageUrls() {
  console.log("Fetching inventory from Google Sheets...\n");
  
  const products = await readInventoryFromSheets();
  
  console.log(`Total products: ${products.length}\n`);
  
  // Group by SKU to match website display
  const groupedBySku = products.reduce((acc, item) => {
    const sku = item.sku;
    if (!acc[sku]) {
      acc[sku] = [];
    }
    acc[sku].push(item);
    return acc;
  }, {} as Record<string, typeof products>);
  
  console.log(`Unique SKUs: ${Object.keys(groupedBySku).length}\n`);
  console.log("=" .repeat(80));
  console.log("CHECKING IMAGE URLs...\n");
  
  const broken: any[] = [];
  const working: any[] = [];
  
  for (const [sku, items] of Object.entries(groupedBySku)) {
    const firstItem = items[0];
    const imageUrl = firstItem.productsUrl;
    
    if (!imageUrl || imageUrl.trim() === '') {
      broken.push({
        sku,
        name: firstItem.details,
        itemCode: firstItem.itemCode,
        issue: 'EMPTY - No URL in Column S',
        url: imageUrl
      });
    } else if (!imageUrl.includes('drive.google.com')) {
      broken.push({
        sku,
        name: firstItem.details,
        itemCode: firstItem.itemCode,
        issue: 'INVALID - Not a Google Drive URL',
        url: imageUrl
      });
    } else {
      working.push({
        sku,
        name: firstItem.details,
        itemCode: firstItem.itemCode,
        url: imageUrl
      });
    }
  }
  
  console.log(`\n✅ WORKING IMAGES: ${working.length}\n`);
  working.slice(0, 5).forEach(item => {
    console.log(`  ${item.sku} - ${item.name}`);
    console.log(`  URL: ${item.url.substring(0, 80)}...`);
    console.log();
  });
  
  console.log("=" .repeat(80));
  console.log(`\n❌ BROKEN IMAGES: ${broken.length}\n`);
  
  if (broken.length > 0) {
    broken.forEach(item => {
      console.log(`  SKU: ${item.sku}`);
      console.log(`  Name: ${item.name}`);
      console.log(`  Item Code: ${item.itemCode}`);
      console.log(`  Issue: ${item.issue}`);
      console.log(`  URL: ${item.url || '(empty)'}`);
      console.log();
    });
    
    console.log("=" .repeat(80));
    console.log("\n📋 SUMMARY:\n");
    console.log(`Total products on website: ${Object.keys(groupedBySku).length}`);
    console.log(`Products with working images: ${working.length}`);
    console.log(`Products with broken images: ${broken.length}`);
    console.log(`\nBroken products: ${broken.map(b => b.sku).join(', ')}`);
    console.log("\n💡 TO FIX:");
    console.log("1. Open your Google Sheets (NSB INVENTORY → 2025 tab)");
    console.log("2. Find the products listed above by their SKU or Item Code");
    console.log("3. Add valid Google Drive image URLs to Column S (PRODUCTS URL)");
    console.log("4. Make sure the Google Drive files are set to 'Anyone with the link can view'");
    console.log("5. Wait 5 minutes for auto-sync OR click 'Sync Inventory' in admin dashboard");
  } else {
    console.log("All products have valid image URLs! ✨");
  }
}

checkImageUrls().catch(console.error);
