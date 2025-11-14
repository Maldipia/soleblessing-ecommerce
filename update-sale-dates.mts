import { drizzle } from "drizzle-orm/mysql2";
import { products } from "./drizzle/schema";
import { eq } from "drizzle-orm";

const db = drizzle(process.env.DATABASE_URL!);

// Set sale end dates for products with sale prices
// Products on sale: IDs 2, 4 (from seed data)
const saleEndDate = new Date();
saleEndDate.setDate(saleEndDate.getDate() + 3); // 3 days from now

await db.update(products)
  .set({ saleEndDate })
  .where(eq(products.id, 2)); // Air Jordan 1 Low White

await db.update(products)
  .set({ saleEndDate })
  .where(eq(products.id, 4)); // Yeezy Boost 350 V2 Beluga

console.log("✅ Sale end dates updated successfully!");
process.exit(0);
