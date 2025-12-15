import { readInventoryFromSheets, calculateDiscount, parsePrice } from "./server/googleSheets";

function convertGoogleDriveUrl(url: string): string {
  if (!url) return "";
  
  // Match Google Drive URLs with /d/ format
  const driveMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (driveMatch) {
    const fileId = driveMatch[1];
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
  }
  
  // Match Google Drive URLs with id= parameter
  const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idMatch) {
    const fileId = idMatch[1];
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
  }
  
  // Match Google Drive folder URLs (folders/FILE_ID)
  const folderMatch = url.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch) {
    const fileId = folderMatch[1];
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
  }
  
  return url;
}

async function checkImageUrls() {
  const products = await readInventoryFromSheets();
  
  console.log("Checking image URL conversion...\n");
  console.log("="  .repeat(100));
  
  const grouped = products.reduce((acc, p) => {
    if (!acc[p.sku]) acc[p.sku] = [];
    acc[p.sku].push(p);
    return acc;
  }, {} as Record<string, typeof products>);
  
  for (const [sku, items] of Object.entries(grouped).slice(0, 10)) {
    const firstItem = items[0];
    const originalUrl = firstItem.productsUrl;
    const convertedUrl = convertGoogleDriveUrl(originalUrl);
    
    console.log(`SKU: ${sku} - ${firstItem.details}`);
    console.log(`Original:  ${originalUrl}`);
    console.log(`Converted: ${convertedUrl}`);
    console.log(`Match: ${originalUrl === convertedUrl ? 'NO CHANGE' : 'CONVERTED'}`);
    console.log();
  }
}

checkImageUrls().catch(console.error);
