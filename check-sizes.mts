import { readInventoryFromSheets } from "./server/googleSheets";

async function checkSizes() {
  const products = await readInventoryFromSheets();
  
  console.log('Checking size data from Google Sheets:\n');
  console.log('='.repeat(80));
  
  // Get unique sizes
  const sizes = [...new Set(products.map(p => p.size))].sort();
  console.log(`\nUnique sizes found (${sizes.length} total):`);
  console.log(sizes.join(', '));
  
  console.log('\n' + '='.repeat(80));
  console.log('\nFirst 15 products with their sizes:\n');
  
  products.slice(0, 15).forEach((p, i) => {
    console.log(`${i + 1}. ${p.sku} - ${p.details}`);
    console.log(`   Size: "${p.size}" (length: ${p.size.length} chars)`);
  });
}

checkSizes().catch(console.error);
