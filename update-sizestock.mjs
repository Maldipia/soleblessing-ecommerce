import { drizzle } from "drizzle-orm/mysql2";
import { products } from "./drizzle/schema.js";
import { eq } from "drizzle-orm";

const db = drizzle(process.env.DATABASE_URL);

async function updateSizeStock() {
  console.log("Updating products with sizeStock data...");
  
  const allProducts = await db.select().from(products);
  
  for (const product of allProducts) {
    const sizes = JSON.parse(product.sizes);
    const sizeStock = {};
    
    // Distribute total stock across sizes
    const stockPerSize = Math.floor(product.stock / sizes.length);
    const remainder = product.stock % sizes.length;
    
    sizes.forEach((size, index) => {
      sizeStock[size] = stockPerSize + (index < remainder ? 1 : 0);
    });
    
    await db.update(products)
      .set({ sizeStock: JSON.stringify(sizeStock) })
      .where(eq(products.id, product.id));
    
    console.log(`Updated ${product.name}: ${JSON.stringify(sizeStock)}`);
  }
  
  console.log("Update complete!");
  process.exit(0);
}

updateSizeStock().catch((error) => {
  console.error("Update failed:", error);
  process.exit(1);
});
