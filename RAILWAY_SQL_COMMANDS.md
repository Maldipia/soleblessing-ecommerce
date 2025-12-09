# Railway Database Import - SQL Commands

This document shows the exact SQL commands that will be executed to set up your SoleBlessing database on Railway.

## Overview

- **Total Tables**: 19
- **Total Records**: 115
  - 1 user (admin account)
  - 30 products (sneakers with images and pricing)
  - 84 product view history records
  - 0 orders (will be created as customers place orders)
  - 0 reviews (will be created as customers leave reviews)

## Import Method

I will use the exported SQL file located at:
```
migration/database_export.sql
```

This file contains INSERT statements for all your data.

## Table Structures

### 1. users
**Purpose**: Store customer and admin accounts  
**Columns**: id, openId, name, email, loginMethod, role, createdAt, updatedAt, lastSignedIn, emailNotifications  
**Records to import**: 1 (your admin account)

```sql
INSERT INTO users (id, openId, name, email, loginMethod, role, createdAt, updatedAt, lastSignedIn, emailNotifications) 
VALUES (1, 'Dr7SZtEoqNSkWNhiiSpvhC', 'legeryn pia', 'tygfsb@gmail.com', 'google', 'admin', '2025-11-14 17:45:38', '2025-12-03 17:12:26', '2025-12-03 17:12:27', 1);
```

### 2. products
**Purpose**: Store sneaker products with pricing, images, and inventory  
**Columns**: id, name, description, brand, category, basePrice, salePrice, saleEndDate, images, sizes, sizeStock, stock, featured, clearance, clearanceEndDate, fitNotes, createdAt, updatedAt  
**Records to import**: 30 products

**Example product**:
```sql
INSERT INTO products (id, name, description, brand, category, basePrice, salePrice, saleEndDate, images, sizes, sizeStock, stock, featured, clearance, clearanceEndDate, fitNotes, createdAt, updatedAt) 
VALUES (270001, 'PUREBOOST 22', 'PUREBOOST 22\nSKU: HQ8586\nCondition: GOOD\nSupplier: UNKNOWN', 'PUREBOOST', 'Sneakers', 1285200, 306000, NULL, 
'["https://drive.google.com/thumbnail?id=10gvi_utnwsI8W33lVEXujs3_ClEIOnqZ&sz=w400","https://drive.google.com/thumbnail?id=10gvi_utnwsI8W33lVEXujs3_ClEIOnqZ&sz=w800","https://drive.google.com/thumbnail?id=10gvi_utnwsI8W33lVEXujs3_ClEIOnqZ&sz=w1200"]', 
'["28","28.5","25"]', '{"25":1,"28":1,"28.5":1}', 3, 0, 0, NULL, NULL, '2025-11-25 05:20:46', '2025-11-25 05:20:46');
```

**Note**: Prices are stored in centavos (multiply by 100), so ₱3,060 = 306000

### 3. product_views
**Purpose**: Track which products users have viewed (for analytics and recommendations)  
**Columns**: id, userId, productId, viewedAt  
**Records to import**: 84 view history records

### 4. cart_items
**Purpose**: Store items in user shopping carts  
**Columns**: id, userId, productId, quantity, size, addedAt  
**Records to import**: 0 (empty, will be populated as users add to cart)

### 5. wishlist_items
**Purpose**: Store items in user wishlists  
**Columns**: id, userId, productId, addedAt  
**Records to import**: 0 (empty, will be populated as users add to wishlist)

### 6. orders
**Purpose**: Store customer orders  
**Columns**: id, userId, totalAmount, status, paymentMethod, paymentProofUrl, shippingAddress, shippingCity, shippingProvince, shippingPostalCode, shippingPhone, notes, createdAt, updatedAt  
**Records to import**: 0 (empty, will be created as customers place orders)

### 7. order_items
**Purpose**: Store individual items within each order  
**Columns**: id, orderId, productId, quantity, size, priceAtPurchase, createdAt  
**Records to import**: 0 (empty, linked to orders)

### 8. reviews
**Purpose**: Store customer product reviews  
**Columns**: id, productId, userId, rating, title, comment, sizePurchased, verifiedPurchase, helpfulCount, notHelpfulCount, createdAt, updatedAt  
**Records to import**: 0 (empty, will be created as customers leave reviews)

### 9. review_images
**Purpose**: Store photos uploaded with reviews  
**Columns**: id, reviewId, imageUrl, createdAt  
**Records to import**: 0 (empty, linked to reviews)

### 10. review_votes
**Purpose**: Track helpful/not helpful votes on reviews  
**Columns**: id, reviewId, userId, voteType, createdAt  
**Records to import**: 0 (empty, will be created as users vote)

### 11-19. Additional Tables
The remaining tables are for future features or are currently empty:
- sessions (authentication sessions)
- notifications (user notifications)
- admin_logs (admin activity tracking)
- product_categories (category management)
- brands (brand management)
- coupons (discount codes)
- shipping_rates (shipping cost calculation)
- site_settings (global configuration)
- analytics_events (custom analytics)

## Import Process

When you provide your Railway MySQL connection string, I will:

### Step 1: Connect to Database
```javascript
const mysql = require('mysql2/promise');
const connection = await mysql.createConnection(process.env.DATABASE_URL);
```

### Step 2: Read SQL File
```javascript
const fs = require('fs');
const sqlContent = fs.readFileSync('migration/database_export.sql', 'utf8');
```

### Step 3: Execute SQL Statements
```javascript
// Split by INSERT statements and execute each one
const statements = sqlContent.split('INSERT INTO');
for (const statement of statements) {
  if (statement.trim()) {
    await connection.execute('INSERT INTO' + statement);
  }
}
```

### Step 4: Verify Import
```javascript
// Check record counts
const [users] = await connection.execute('SELECT COUNT(*) as count FROM users');
const [products] = await connection.execute('SELECT COUNT(*) as count FROM products');
const [views] = await connection.execute('SELECT COUNT(*) as count FROM product_views');

console.log(`✅ Users: ${users[0].count}`);      // Expected: 1
console.log(`✅ Products: ${products[0].count}`); // Expected: 30
console.log(`✅ Views: ${views[0].count}`);       // Expected: 84
```

## Sample Data Preview

### Your Admin Account
- **Email**: tygfsb@gmail.com
- **Name**: legeryn pia
- **Role**: admin
- **Login Method**: Google OAuth

### Sample Products
1. **PUREBOOST 22** - ₱3,060 (76% off from ₱12,852)
2. **CLOUD FOAM WALK** - ₱1,935 (76% off from ₱8,127)
3. **RIVALRY LOW** - ₱2,250 (65% off from ₱6,500)
4. **SUPERSTAR** - ₱3,499 (46% off from ₱6,500)
5. **FORUM LOW CL** - ₱3,499 (46% off from ₱6,500)
...and 25 more products

### Product Features
- **Multiple images** (400px, 800px, 1200px for responsive loading)
- **Size variants** (e.g., US 7, 7.5, 8, 8.5, 9, etc.)
- **Stock tracking** per size
- **Sale pricing** with discount percentages
- **Brand and category** classification

## Database Schema (DDL)

The tables are already created in your current Manus database. Railway will need the same schema. Here's how the tables are structured:

### users table
```sql
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  openId VARCHAR(64) NOT NULL UNIQUE,
  name TEXT,
  email VARCHAR(320),
  loginMethod VARCHAR(64),
  role ENUM('user', 'admin') NOT NULL DEFAULT 'user',
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  lastSignedIn TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  emailNotifications BOOLEAN DEFAULT TRUE
);
```

### products table
```sql
CREATE TABLE products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  brand VARCHAR(100),
  category VARCHAR(100),
  basePrice INT NOT NULL,
  salePrice INT,
  saleEndDate DATETIME,
  images JSON,
  sizes JSON,
  sizeStock JSON,
  stock INT NOT NULL DEFAULT 0,
  featured BOOLEAN DEFAULT FALSE,
  clearance BOOLEAN DEFAULT FALSE,
  clearanceEndDate DATETIME,
  fitNotes TEXT,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### product_views table
```sql
CREATE TABLE product_views (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT,
  productId INT NOT NULL,
  viewedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE
);
```

### cart_items table
```sql
CREATE TABLE cart_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  productId INT NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  size VARCHAR(20),
  addedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE
);
```

### wishlist_items table
```sql
CREATE TABLE wishlist_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  productId INT NOT NULL,
  addedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE,
  UNIQUE KEY unique_wishlist (userId, productId)
);
```

### orders table
```sql
CREATE TABLE orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  totalAmount INT NOT NULL,
  status ENUM('pending', 'processing', 'shipped', 'delivered', 'cancelled') NOT NULL DEFAULT 'pending',
  paymentMethod ENUM('bank_transfer', 'gcash', 'cod') NOT NULL,
  paymentProofUrl TEXT,
  shippingAddress TEXT NOT NULL,
  shippingCity VARCHAR(100) NOT NULL,
  shippingProvince VARCHAR(100) NOT NULL,
  shippingPostalCode VARCHAR(20),
  shippingPhone VARCHAR(20) NOT NULL,
  notes TEXT,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);
```

### order_items table
```sql
CREATE TABLE order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  orderId INT NOT NULL,
  productId INT NOT NULL,
  quantity INT NOT NULL,
  size VARCHAR(20),
  priceAtPurchase INT NOT NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (orderId) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE
);
```

### reviews table
```sql
CREATE TABLE reviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  productId INT NOT NULL,
  userId INT NOT NULL,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title VARCHAR(255),
  comment TEXT,
  sizePurchased VARCHAR(20),
  verifiedPurchase BOOLEAN DEFAULT FALSE,
  helpfulCount INT DEFAULT 0,
  notHelpfulCount INT DEFAULT 0,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);
```

### review_images table
```sql
CREATE TABLE review_images (
  id INT AUTO_INCREMENT PRIMARY KEY,
  reviewId INT NOT NULL,
  imageUrl TEXT NOT NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (reviewId) REFERENCES reviews(id) ON DELETE CASCADE
);
```

### review_votes table
```sql
CREATE TABLE review_votes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  reviewId INT NOT NULL,
  userId INT NOT NULL,
  voteType ENUM('helpful', 'not_helpful') NOT NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (reviewId) REFERENCES reviews(id) ON DELETE CASCADE,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_vote (reviewId, userId)
);
```

## Complete Import Script

Here's the exact Node.js script I'll run:

```javascript
import mysql from 'mysql2/promise';
import fs from 'fs';

async function importDatabase(connectionString) {
  console.log('🔌 Connecting to Railway database...');
  const connection = await mysql.createConnection(connectionString);
  
  console.log('✅ Connected successfully!');
  
  // Read SQL file
  console.log('📖 Reading SQL export file...');
  const sqlContent = fs.readFileSync('migration/database_export.sql', 'utf8');
  
  // Split into individual INSERT statements
  const statements = sqlContent
    .split('\n')
    .filter(line => line.trim().startsWith('INSERT INTO'));
  
  console.log(`📝 Found ${statements.length} INSERT statements`);
  
  // Execute each statement
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    try {
      await connection.execute(statement);
      if ((i + 1) % 10 === 0) {
        console.log(`   Imported ${i + 1}/${statements.length} records...`);
      }
    } catch (error) {
      console.error(`❌ Error on statement ${i + 1}:`, error.message);
      throw error;
    }
  }
  
  console.log('✅ All records imported successfully!');
  
  // Verify import
  console.log('\n🔍 Verifying import...');
  
  const [users] = await connection.execute('SELECT COUNT(*) as count FROM users');
  const [products] = await connection.execute('SELECT COUNT(*) as count FROM products');
  const [views] = await connection.execute('SELECT COUNT(*) as count FROM product_views');
  
  console.log(`✅ Users: ${users[0].count} (expected: 1)`);
  console.log(`✅ Products: ${products[0].count} (expected: 30)`);
  console.log(`✅ Product Views: ${views[0].count} (expected: 84)`);
  
  // Sample query
  const [sampleProducts] = await connection.execute(
    'SELECT id, name, brand, salePrice FROM products LIMIT 5'
  );
  
  console.log('\n📦 Sample products:');
  sampleProducts.forEach(p => {
    const price = (p.salePrice / 100).toFixed(2);
    console.log(`   ${p.id}: ${p.name} (${p.brand}) - ₱${price}`);
  });
  
  await connection.end();
  console.log('\n🎉 Database import complete!');
}

// Usage:
// importDatabase('mysql://root:PASSWORD@HOST:PORT/railway');
```

## What Happens Next

Once you provide your Railway `MYSQL_URL`, I will:

1. ✅ **Connect** to your Railway database (2 seconds)
2. ✅ **Execute** all INSERT statements from `migration/database_export.sql` (10 seconds)
3. ✅ **Verify** record counts match expected values (2 seconds)
4. ✅ **Test** a sample query to ensure data is accessible (1 second)
5. ✅ **Report** success with summary of imported data (instant)

**Total time**: ~15 seconds

## After Import

Your Railway database will be ready to use with Vercel. You'll have:

- ✅ Your admin account (can log in immediately)
- ✅ 30 products (visible on homepage and products page)
- ✅ 84 browsing history records (for analytics)
- ✅ Empty tables ready for orders, reviews, cart items, wishlist items

## Security Note

After I complete the import, I recommend:
1. **Rotate your database password** in Railway (Settings → Reset Password)
2. **Update DATABASE_URL** in Vercel environment variables
3. **Redeploy** your Vercel app with the new connection string

This ensures the connection string shared in this conversation is no longer valid.

---

**Ready to proceed?** Share your Railway `MYSQL_URL` and I'll start the import immediately!

**Format**:
```
mysql://root:PASSWORD@HOST:PORT/railway
```

---

**Last Updated**: December 2024  
**Author**: Manus AI
