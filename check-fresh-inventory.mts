import { readInventoryFromSheets } from "./server/googleSheets";

async function checkFreshInventory() {
  console.log('Fetching inventory from Google Sheets (may use 5-min cache)...\n');
  const products = await readInventoryFromSheets();
  
  console.log('Total products:', products.length);
  console.log('\n' + '='.repeat(100));
  console.log('First 10 products with image URLs:\n');
  
  products.slice(0, 10).forEach((p, i) => {
    console.log(`${i + 1}. SKU: ${p.sku} - ${p.details}`);
    console.log(`   Item Code: ${p.itemCode}`);
    console.log(`   Image URL: ${p.productsUrl || '(empty)'}`);
    console.log(`   Status: ${p.status}`);
    console.log();
  });
  
  console.log('='.repeat(100));
  console.log('\nProducts without images:');
  const noImages = products.filter(p => !p.productsUrl || p.productsUrl.trim() === '');
  console.log(`Count: ${noImages.length}`);
  if (noImages.length > 0) {
    noImages.slice(0, 5).forEach(p => {
      console.log(`  - ${p.sku}: ${p.details}`);
    });
  }
}

checkFreshInventory().catch(console.error);
