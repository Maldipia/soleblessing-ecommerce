import { readInventoryFromSheets } from "./server/googleSheets";

async function checkTotal() {
  const products = await readInventoryFromSheets();
  
  console.log("Total products from Google Sheets:", products.length);
  
  const grouped = products.reduce((acc, p) => {
    if (!acc[p.sku]) acc[p.sku] = [];
    acc[p.sku].push(p);
    return acc;
  }, {} as Record<string, typeof products>);
  
  console.log("Unique SKUs:", Object.keys(grouped).length);
  
  console.log("\nProducts by status:");
  const byStatus = products.reduce((acc, p) => {
    acc[p.status] = (acc[p.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  console.log(byStatus);
  
  console.log("\nProducts with images:", products.filter(p => p.productsUrl && p.productsUrl.trim() !== '').length);
  console.log("Products without images:", products.filter(p => !p.productsUrl || p.productsUrl.trim() === '').length);
}

checkTotal().catch(console.error);
