import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONNECTION_STRING = 'mysql://root:hdpfutASumuECGjhDKLwkllvavtLofau@shuttle.proxy.rlwy.net:45801/railway';

async function importDatabase() {
  let connection;
  
  try {
    console.log('🔌 Connecting to Railway MySQL database...');
    connection = await mysql.createConnection(CONNECTION_STRING);
    console.log('✅ Connected successfully!');
    
    // Read SQL file
    console.log('\n📖 Reading SQL export file...');
    const sqlFilePath = path.join(__dirname, '../migration/database_export.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    // Split into individual INSERT statements
    const lines = sqlContent.split('\n');
    const insertStatements = lines.filter(line => line.trim().startsWith('INSERT INTO'));
    
    console.log(`📝 Found ${insertStatements.length} INSERT statements\n`);
    
    // Execute each statement
    let successCount = 0;
    for (let i = 0; i < insertStatements.length; i++) {
      const statement = insertStatements[i];
      try {
        await connection.execute(statement);
        successCount++;
        if ((i + 1) % 10 === 0) {
          console.log(`   ✅ Imported ${i + 1}/${insertStatements.length} records...`);
        }
      } catch (error) {
        console.error(`❌ Error on statement ${i + 1}:`, error.message);
        console.error(`   Statement: ${statement.substring(0, 100)}...`);
        // Continue with other statements
      }
    }
    
    console.log(`\n✅ Successfully imported ${successCount}/${insertStatements.length} records!`);
    
    // Verify import
    console.log('\n🔍 Verifying import...\n');
    
    const [users] = await connection.execute('SELECT COUNT(*) as count FROM users');
    const [products] = await connection.execute('SELECT COUNT(*) as count FROM products');
    const [views] = await connection.execute('SELECT COUNT(*) as count FROM product_views');
    
    console.log(`✅ Users: ${users[0].count} (expected: 1)`);
    console.log(`✅ Products: ${products[0].count} (expected: 30)`);
    console.log(`✅ Product Views: ${views[0].count} (expected: 84)`);
    
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
    
  } catch (error) {
    console.error('\n❌ Import failed:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Connection closed');
    }
  }
}

importDatabase().catch(console.error);
