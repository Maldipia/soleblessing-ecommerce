import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { users, products, browsingHistory } from '../drizzle/schema.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONNECTION_STRING = 'mysql://root:hdpfutASumuECGjhDKLwkllvavtLofau@shuttle.proxy.rlwy.net:45801/railway';

async function importDatabase() {
  let connection;
  
  try {
    console.log('🔌 Connecting to Railway MySQL database...');
    connection = await mysql.createConnection(CONNECTION_STRING);
    const db = drizzle(connection);
    console.log('✅ Connected successfully!');
    
    // Read JSON export file
    console.log('\n📖 Reading database export...');
    const jsonFilePath = path.join(__dirname, '../migration/database_export.json');
    const data = JSON.parse(fs.readFileSync(jsonFilePath, 'utf8'));
    
    // Import users
    console.log(`\n👤 Importing ${data.tables.users.length} user(s)...`);
    for (const user of data.tables.users) {
      await db.insert(users).values(user);
    }
    console.log(`✅ Users imported successfully`);
    
    // Import products
    console.log(`\n📦 Importing ${data.tables.products.length} products...`);
    for (const product of data.tables.products) {
      await db.insert(products).values(product);
    }
    console.log(`✅ Products imported successfully`);
    
    // Import browsing history
    console.log(`\n👁️  Importing ${data.tables.browsingHistory.length} browsing history records...`);
    for (const view of data.tables.browsingHistory) {
      await db.insert(browsingHistory).values(view);
    }
    console.log(`✅ Browsing history imported successfully`);
    
    // Verify import
    console.log('\n🔍 Verifying import...\n');
    
    const [usersCount] = await connection.execute('SELECT COUNT(*) as count FROM users');
    const [productsCount] = await connection.execute('SELECT COUNT(*) as count FROM products');
    const [viewsCount] = await connection.execute('SELECT COUNT(*) as count FROM browsingHistory');
    
    console.log(`✅ Users: ${usersCount[0].count} (expected: ${data.tables.users.length})`);
    console.log(`✅ Products: ${productsCount[0].count} (expected: ${data.tables.products.length})`);
    console.log(`✅ Browsing History: ${viewsCount[0].count} (expected: ${data.tables.browsingHistory.length})`);
    
    // Sample query
    console.log('\n📦 Sample products:\n');
    const [sampleProducts] = await connection.execute(
      'SELECT id, name, brand, salePrice FROM products LIMIT 5'
    );
    
    sampleProducts.forEach(p => {
      const price = (p.salePrice / 100).toFixed(2);
      console.log(`   ${p.id}: ${p.name} (${p.brand}) - ₱${price}`);
    });
    
    console.log('\n🎉 Database import complete!');
    console.log('\n📋 Your Railway DATABASE_URL for Vercel:');
    console.log(CONNECTION_STRING);
    console.log('\n⚠️  Security Reminder: Rotate your Railway database password after deployment');
    
  } catch (error) {
    console.error('\n❌ Import failed:', error.message);
    console.error(error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Connection closed');
    }
  }
}

importDatabase().catch(console.error);
