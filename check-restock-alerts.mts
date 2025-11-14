import { drizzle } from "drizzle-orm/mysql2";
import { products, restockAlerts, users } from "./drizzle/schema";
import { eq, and } from "drizzle-orm";
import { sendRestockAlertEmail } from "./server/email";

const db = drizzle(process.env.DATABASE_URL!);

/**
 * Check for products that are back in stock and send alerts
 * Run this script when products are restocked
 */
async function checkRestockAlerts() {
  console.log("🔍 Checking for restock alerts...");
  
  // Get all unnotified alerts
  const alerts = await db.select()
    .from(restockAlerts)
    .where(eq(restockAlerts.notified, 0));
  
  console.log(`Found ${alerts.length} pending restock alerts`);
  
  let sentCount = 0;
  
  for (const alert of alerts) {
    // Check if product is back in stock
    const product = await db.select()
      .from(products)
      .where(eq(products.id, alert.productId))
      .limit(1);
    
    if (!product[0]) continue;
    
    // Check if specific size is in stock (if size was specified)
    let inStock = false;
    if (alert.size) {
      try {
        const sizeStock = product[0].sizeStock ? JSON.parse(product[0].sizeStock) : {};
        inStock = (sizeStock[alert.size] || 0) > 0;
      } catch (e) {
        console.error(`Error parsing sizeStock for product ${product[0].id}:`, e);
      }
    } else {
      // No specific size, check general stock
      inStock = product[0].stock > 0;
    }
    
    if (inStock) {
      // Get user info
      const user = await db.select()
        .from(users)
        .where(eq(users.id, alert.userId))
        .limit(1);
      
      if (user[0] && user[0].email && user[0].emailNotifications === 1) {
        // Send restock alert email
        const success = await sendRestockAlertEmail(
          user[0].email,
          user[0].name || 'Customer',
          product[0].name,
          product[0].id,
          alert.size || undefined
        );
        
        if (success) {
          // Mark as notified
          await db.update(restockAlerts)
            .set({ notified: 1 })
            .where(eq(restockAlerts.id, alert.id));
          
          sentCount++;
          console.log(`✅ Sent restock alert to ${user[0].email} for ${product[0].name}${alert.size ? ` (Size ${alert.size})` : ''}`);
        }
      }
    }
  }
  
  console.log(`\n📧 Sent ${sentCount} restock alert emails`);
}

checkRestockAlerts()
  .then(() => {
    console.log("✅ Restock alert check complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Error checking restock alerts:", error);
    process.exit(1);
  });
