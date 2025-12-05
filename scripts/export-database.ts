import { writeFileSync } from 'fs';
import { getDb } from '../server/db';
import * as schema from '../drizzle/schema';

async function exportDatabase() {
  console.log('Starting database export...');
  
  const db = await getDb();
  if (!db) {
    console.error('Failed to connect to database');
    process.exit(1);
  }

  const exportData: any = {
    exportDate: new Date().toISOString(),
    tables: {}
  };

  try {
    // Export users
    console.log('Exporting users...');
    const users = await db.select().from(schema.users);
    exportData.tables.users = users;
    console.log(`  ✓ Exported ${users.length} users`);

    // Export products
    console.log('Exporting products...');
    const products = await db.select().from(schema.products);
    exportData.tables.products = products;
    console.log(`  ✓ Exported ${products.length} products`);

    // Export cart_items
    console.log('Exporting cart_items...');
    const cartItems = await db.select().from(schema.cartItems);
    exportData.tables.cartItems = cartItems;
    console.log(`  ✓ Exported ${cartItems.length} cart items`);

    // Export wishlist
    console.log('Exporting wishlist...');
    const wishlist = await db.select().from(schema.wishlist);
    exportData.tables.wishlist = wishlist;
    console.log(`  ✓ Exported ${wishlist.length} wishlist items`);

    // Export orders
    console.log('Exporting orders...');
    const orders = await db.select().from(schema.orders);
    exportData.tables.orders = orders;
    console.log(`  ✓ Exported ${orders.length} orders`);

    // Export order_items
    console.log('Exporting order_items...');
    const orderItems = await db.select().from(schema.orderItems);
    exportData.tables.orderItems = orderItems;
    console.log(`  ✓ Exported ${orderItems.length} order items`);

    // Export browsingHistory
    console.log('Exporting browsingHistory...');
    const browsingHistory = await db.select().from(schema.browsingHistory);
    exportData.tables.browsingHistory = browsingHistory;
    console.log(`  ✓ Exported ${browsingHistory.length} browsing history records`);

    // Export inquiries
    console.log('Exporting inquiries...');
    const inquiries = await db.select().from(schema.inquiries);
    exportData.tables.inquiries = inquiries;
    console.log(`  ✓ Exported ${inquiries.length} inquiries`);

    // Export loyalty_points
    console.log('Exporting loyalty_points...');
    const loyaltyPoints = await db.select().from(schema.loyaltyPoints);
    exportData.tables.loyaltyPoints = loyaltyPoints;
    console.log(`  ✓ Exported ${loyaltyPoints.length} loyalty points records`);

    // Export reviews
    console.log('Exporting reviews...');
    const reviews = await db.select().from(schema.reviews);
    exportData.tables.reviews = reviews;
    console.log(`  ✓ Exported ${reviews.length} reviews`);

    // Export review_images
    console.log('Exporting review_images...');
    const reviewImages = await db.select().from(schema.reviewImages);
    exportData.tables.reviewImages = reviewImages;
    console.log(`  ✓ Exported ${reviewImages.length} review images`);

    // Export review_votes
    console.log('Exporting review_votes...');
    const reviewVotes = await db.select().from(schema.reviewVotes);
    exportData.tables.reviewVotes = reviewVotes;
    console.log(`  ✓ Exported ${reviewVotes.length} review votes`);

    // Write to JSON file
    const outputPath = 'migration/database_export.json';
    writeFileSync(outputPath, JSON.stringify(exportData, null, 2));
    console.log(`\n✅ Database export completed: ${outputPath}`);
    console.log(`   Total size: ${(JSON.stringify(exportData).length / 1024 / 1024).toFixed(2)} MB`);

    // Also create SQL INSERT statements
    console.log('\nGenerating SQL INSERT statements...');
    const sqlStatements: string[] = [];
    
    // Add database creation
    sqlStatements.push('-- SoleBlessing Database Export');
    sqlStatements.push(`-- Generated: ${new Date().toISOString()}`);
    sqlStatements.push('-- \n');
    
    // Helper function to escape SQL values
    const escapeSqlValue = (value: any): string => {
      if (value === null || value === undefined) return 'NULL';
      if (typeof value === 'number') return value.toString();
      if (typeof value === 'boolean') return value ? '1' : '0';
      if (value instanceof Date) return `'${value.toISOString().slice(0, 19).replace('T', ' ')}'`;
      if (typeof value === 'object') return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
      return `'${value.toString().replace(/'/g, "''")}'`;
    };

    // Generate INSERT statements for each table
    for (const [tableName, records] of Object.entries(exportData.tables)) {
      if (!Array.isArray(records) || records.length === 0) continue;
      
      sqlStatements.push(`\n-- Table: ${tableName}`);
      sqlStatements.push(`-- Records: ${records.length}`);
      
      const columns = Object.keys(records[0]);
      for (const record of records) {
        const values = columns.map(col => escapeSqlValue(record[col])).join(', ');
        sqlStatements.push(`INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${values});`);
      }
    }

    const sqlOutputPath = 'migration/database_export.sql';
    writeFileSync(sqlOutputPath, sqlStatements.join('\n'));
    console.log(`✅ SQL export completed: ${sqlOutputPath}`);

  } catch (error) {
    console.error('Export failed:', error);
    process.exit(1);
  }

  process.exit(0);
}

exportDatabase();
