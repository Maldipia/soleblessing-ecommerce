# Railway MySQL Database Setup Guide

This comprehensive guide walks you through setting up a MySQL database on Railway and importing your SoleBlessing data step-by-step.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Part 1: Create Railway Account](#part-1-create-railway-account)
3. [Part 2: Provision MySQL Database](#part-2-provision-mysql-database)
4. [Part 3: Get Connection Details](#part-3-get-connection-details)
5. [Part 4: Import Database](#part-4-import-database)
6. [Part 5: Verify Import](#part-5-verify-import)
7. [Troubleshooting](#troubleshooting)
8. [Next Steps](#next-steps)

---

## Prerequisites

Before starting, ensure you have the following ready on your local machine:

**Required Files:**
- `migration/database_export.sql` from this repository
- GitHub account (for Railway login)

**Required Tools:**
- MySQL client installed locally (for Option A)
  - **macOS**: `brew install mysql-client`
  - **Windows**: Download from https://dev.mysql.com/downloads/mysql/
  - **Linux**: `sudo apt-get install mysql-client`
- OR TablePlus/MySQL Workbench (for Option B - easier for beginners)

**Estimated Time:** 20-30 minutes

---

## Part 1: Create Railway Account

Railway offers $5 of free credit per month, which is sufficient for development and testing.

### Step 1.1: Sign Up

Navigate to Railway's homepage and create an account using your preferred method.

1. Go to **https://railway.app**
2. Click **"Start a New Project"** or **"Login"** in the top right
3. Choose one of these sign-up methods:
   - **GitHub** (recommended - fastest)
   - **Email**
   - **Google**

If you choose GitHub, Railway will request permission to access your repositories. This is normal and required for deployment features (though we won't use them for the database).

### Step 1.2: Verify Email

If you signed up with email, check your inbox for a verification email from Railway and click the confirmation link.

### Step 1.3: Add Payment Method (Optional but Recommended)

Railway requires a payment method to prevent abuse, but you won't be charged unless you exceed the free tier limits.

1. Go to **Account Settings** → **Billing**
2. Click **"Add Payment Method"**
3. Enter your credit/debit card details
4. Your $5 monthly credit will be applied automatically

**Free Tier Limits:**
- $5 credit per month
- Sufficient for ~500MB database with moderate usage
- No credit card required for first 7 days

---

## Part 2: Provision MySQL Database

Now we'll create a new MySQL database instance on Railway.

### Step 2.1: Create New Project

Railway organizes services into projects. Each project can contain multiple services (database, backend, frontend, etc.).

1. From the Railway dashboard, click **"New Project"**
2. You'll see several options:
   - Deploy from GitHub repo
   - Deploy from template
   - Provision MySQL
   - Provision PostgreSQL
   - Provision Redis
   - Empty Project

### Step 2.2: Select MySQL

1. Click **"Provision MySQL"**
2. Railway will immediately start provisioning your database
3. Wait 10-30 seconds for the database to be created
4. You'll see a new card appear with the MySQL logo

**What just happened?**
Railway created a MySQL 8.0 instance with:
- Automatic backups
- SSL encryption enabled
- Public network access
- Persistent storage
- Automatic updates

### Step 2.3: Name Your Project

1. Click on the project name (usually "My Project" or similar) at the top
2. Rename it to **"soleblessing-db"** or **"SoleBlessing Database"**
3. Press Enter to save

---

## Part 3: Get Connection Details

You'll need the database connection details to import your data and configure Vercel.

### Step 3.1: Open MySQL Service

1. Click on the **MySQL** card in your Railway project
2. You'll see the service details page with several tabs:
   - **Deployments** - Service status and logs
   - **Variables** - Environment variables (connection details)
   - **Settings** - Service configuration
   - **Metrics** - Usage statistics

### Step 3.2: Copy Connection String

1. Click on the **"Variables"** tab
2. You'll see several environment variables:

| Variable | Description | Example Value |
|----------|-------------|---------------|
| `MYSQL_URL` | Full connection string | `mysql://root:pass@containers-us-west-123.railway.app:6543/railway` |
| `MYSQL_HOST` | Database host | `containers-us-west-123.railway.app` |
| `MYSQL_PORT` | Database port | `6543` |
| `MYSQL_USER` | Username | `root` |
| `MYSQL_PASSWORD` | Password | `random_generated_password` |
| `MYSQL_DATABASE` | Database name | `railway` |

3. Click the **copy icon** next to `MYSQL_URL` to copy the full connection string
4. Save this in a secure location (you'll need it for Vercel later)

**Important Security Notes:**
- Never commit connection strings to git
- Never share your password publicly
- Railway automatically generates a strong random password
- Connection uses SSL by default

### Step 3.3: Test Connection (Optional)

Before importing data, verify you can connect to the database.

**Using MySQL CLI:**
```bash
# Extract host, port, user, password from MYSQL_URL
# Example: mysql://root:abc123@containers-us-west-123.railway.app:6543/railway

mysql -h containers-us-west-123.railway.app \
      -P 6543 \
      -u root \
      -p \
      railway
# Enter password when prompted
```

**Using TablePlus:**
1. Open TablePlus
2. Click **"Create a new connection"**
3. Select **MySQL**
4. Fill in the connection details:
   - **Name**: SoleBlessing Railway DB
   - **Host**: (from MYSQL_HOST)
   - **Port**: (from MYSQL_PORT)
   - **User**: (from MYSQL_USER)
   - **Password**: (from MYSQL_PASSWORD)
   - **Database**: (from MYSQL_DATABASE)
   - **SSL**: Enable
5. Click **"Test"** to verify connection
6. Click **"Connect"**

If the connection succeeds, you're ready to import data!

---

## Part 4: Import Database

You have three options for importing your SQL data. Choose the one that works best for you.

### Option A: Using MySQL CLI (Recommended for Developers)

This method is fastest and most reliable for large datasets.

#### Step A.1: Locate SQL File

```bash
# Navigate to your project directory
cd /path/to/soleblessing-ecommerce

# Verify the SQL file exists
ls -lh migration/database_export.sql
# Should show: -rw-r--r-- 1 user user 29K Dec 3 12:12 database_export.sql
```

#### Step A.2: Import Data

```bash
# Import using the MYSQL_URL connection string
# Replace with your actual values from Railway

mysql -h containers-us-west-123.railway.app \
      -P 6543 \
      -u root \
      -p \
      railway < migration/database_export.sql
```

When prompted, enter your MySQL password (from `MYSQL_PASSWORD` variable).

**Expected Output:**
```
Enter password: ****
# (No output means success!)
```

**If you see errors**, check the [Troubleshooting](#troubleshooting) section below.

#### Step A.3: Verify Import

```bash
# Connect to database
mysql -h containers-us-west-123.railway.app \
      -P 6543 \
      -u root \
      -p \
      railway

# Once connected, run these commands:
SHOW TABLES;
SELECT COUNT(*) FROM products;
SELECT COUNT(*) FROM users;
```

**Expected Results:**
```
+-------------------+
| Tables_in_railway |
+-------------------+
| browsingHistory   |
| cartItems         |
| chatMessages      |
| comparisons       |
| inquiries         |
| loyaltyPoints     |
| orderItems        |
| orders            |
| pointsTransactions|
| products          |
| raffleEntries     |
| raffles           |
| restockAlerts     |
| reviewImages      |
| reviewVotes       |
| reviews           |
| saleEvents        |
| users             |
| wishlist          |
+-------------------+
19 rows in set (0.05 sec)

+----------+
| COUNT(*) |
+----------+
|       30 |
+----------+
1 row in set (0.06 sec)

+----------+
| COUNT(*) |
+----------+
|        1 |
+----------+
1 row in set (0.04 sec)
```

### Option B: Using TablePlus (Recommended for Beginners)

TablePlus provides a user-friendly GUI for database management.

#### Step B.1: Connect to Database

Follow [Step 3.3](#step-33-test-connection-optional) to establish connection.

#### Step B.2: Import SQL File

1. Once connected, click **"File"** → **"Import"** → **"From SQL Dump"**
2. Navigate to `migration/database_export.sql`
3. Click **"Open"**
4. TablePlus will show a preview of the SQL statements
5. Click **"Import"** to execute

#### Step B.3: Monitor Progress

TablePlus will show a progress bar as it imports the data. For the SoleBlessing database (29KB, ~115 records), this should take 5-10 seconds.

#### Step B.4: Verify Import

1. In the left sidebar, click **"Refresh"** to reload the table list
2. You should see 19 tables
3. Click on **"products"** table
4. You should see 30 rows
5. Click on **"users"** table
6. You should see 1 row

### Option C: Using MySQL Workbench

MySQL Workbench is a free official tool from Oracle.

#### Step C.1: Create Connection

1. Open MySQL Workbench
2. Click **"+"** next to "MySQL Connections"
3. Fill in the connection details:
   - **Connection Name**: SoleBlessing Railway
   - **Hostname**: (from MYSQL_HOST)
   - **Port**: (from MYSQL_PORT)
   - **Username**: (from MYSQL_USER)
   - **Password**: Click "Store in Vault" and enter password
   - **Default Schema**: railway
4. Click **"Test Connection"**
5. Click **"OK"** to save

#### Step C.2: Import Data

1. Double-click your connection to open it
2. Go to **"Server"** → **"Data Import"**
3. Select **"Import from Self-Contained File"**
4. Click **"..."** and navigate to `migration/database_export.sql`
5. Under "Default Target Schema", select **"railway"**
6. Click **"Start Import"**

#### Step C.3: Verify Import

1. In the left sidebar, right-click **"railway"** schema
2. Click **"Refresh All"**
3. Expand **"Tables"** to see all 19 tables
4. Right-click **"products"** → **"Select Rows - Limit 1000"**
5. You should see 30 products

---

## Part 5: Verify Import

After importing, it's crucial to verify that all data was imported correctly.

### Step 5.1: Check Table Counts

Run these queries to verify record counts match the expected values:

```sql
-- Expected: 1 user
SELECT COUNT(*) as user_count FROM users;

-- Expected: 30 products
SELECT COUNT(*) as product_count FROM products;

-- Expected: 84 browsing history records
SELECT COUNT(*) as browsing_count FROM browsingHistory;

-- Expected: 0 (empty tables, but schema exists)
SELECT COUNT(*) as cart_count FROM cartItems;
SELECT COUNT(*) as wishlist_count FROM wishlist;
SELECT COUNT(*) as order_count FROM orders;
SELECT COUNT(*) as review_count FROM reviews;
```

### Step 5.2: Verify Data Integrity

Check that actual data looks correct:

```sql
-- Check user data
SELECT id, openId, name, email, role, createdAt 
FROM users 
LIMIT 5;

-- Check product data
SELECT id, title, brand, price, salePrice, images 
FROM products 
LIMIT 5;

-- Check browsing history
SELECT userId, productId, viewedAt 
FROM browsingHistory 
ORDER BY viewedAt DESC 
LIMIT 5;
```

### Step 5.3: Verify Schema

Ensure all tables have the correct structure:

```sql
-- Check products table structure
DESCRIBE products;

-- Check users table structure
DESCRIBE users;

-- Check reviews table structure (should exist even if empty)
DESCRIBE reviews;
```

### Step 5.4: Test Relationships

Verify foreign key relationships work correctly:

```sql
-- This should return browsing history with product details
SELECT 
  bh.id,
  bh.viewedAt,
  p.title as product_title,
  p.brand
FROM browsingHistory bh
JOIN products p ON bh.productId = p.id
LIMIT 10;
```

**Expected Result:** 10 rows showing browsing history with product information.

---

## Troubleshooting

### Error: "Access denied for user"

**Symptom:**
```
ERROR 1045 (28000): Access denied for user 'root'@'xxx' (using password: YES)
```

**Cause:** Incorrect password or username.

**Solution:**
1. Go back to Railway → Variables tab
2. Double-check you copied `MYSQL_PASSWORD` correctly
3. Ensure there are no extra spaces or characters
4. Try copying again and pasting into a text editor first to verify

### Error: "Can't connect to MySQL server"

**Symptom:**
```
ERROR 2003 (HY000): Can't connect to MySQL server on 'xxx' (111)
```

**Cause:** Incorrect host or port, or Railway service is down.

**Solution:**
1. Verify `MYSQL_HOST` and `MYSQL_PORT` are correct
2. Check Railway dashboard - service should show "Active" status
3. Try pinging the host: `ping containers-us-west-123.railway.app`
4. Check your firewall isn't blocking outbound MySQL connections (port 3306 or custom port)

### Error: "Unknown database"

**Symptom:**
```
ERROR 1049 (42000): Unknown database 'railway'
```

**Cause:** Incorrect database name.

**Solution:**
1. Check `MYSQL_DATABASE` variable in Railway
2. Most Railway MySQL instances use `railway` as the default database name
3. If different, update your connection command

### Error: "Table already exists"

**Symptom:**
```
ERROR 1050 (42S01): Table 'products' already exists
```

**Cause:** You're trying to import into a database that already has tables.

**Solution:**

**Option 1: Drop existing tables (CAUTION: This deletes all data)**
```sql
-- Connect to database first
DROP TABLE IF EXISTS reviewVotes;
DROP TABLE IF EXISTS reviewImages;
DROP TABLE IF EXISTS reviews;
DROP TABLE IF EXISTS chatMessages;
DROP TABLE IF EXISTS comparisons;
DROP TABLE IF EXISTS browsingHistory;
DROP TABLE IF EXISTS pointsTransactions;
DROP TABLE IF EXISTS loyaltyPoints;
DROP TABLE IF EXISTS wishlist;
DROP TABLE IF EXISTS restockAlerts;
DROP TABLE IF EXISTS inquiries;
DROP TABLE IF EXISTS saleEvents;
DROP TABLE IF EXISTS raffleEntries;
DROP TABLE IF EXISTS raffles;
DROP TABLE IF EXISTS orderItems;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS cartItems;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS users;
```

Then re-run the import.

**Option 2: Create a new Railway database**
1. Go to Railway dashboard
2. Click "New" → "Provision MySQL"
3. Get new connection details
4. Import into the fresh database

### Error: "Lost connection to MySQL server during query"

**Symptom:**
```
ERROR 2013 (HY000): Lost connection to MySQL server during query
```

**Cause:** Network timeout or Railway service restart.

**Solution:**
1. Wait 1-2 minutes and try again
2. Check Railway service status in dashboard
3. If persists, try importing in smaller chunks (split SQL file)

### Import is Very Slow

**Symptom:** Import takes more than 5 minutes for the 29KB SQL file.

**Possible Causes:**
- Slow internet connection
- Railway service is under heavy load
- Large number of indexes being rebuilt

**Solution:**
1. Check your internet speed: https://fast.com
2. Try importing during off-peak hours
3. For this small dataset (30 products), it should take < 30 seconds
4. If it takes longer, contact Railway support

### Verification Queries Return 0 Rows

**Symptom:** `SELECT COUNT(*) FROM products` returns 0 instead of 30.

**Cause:** Import failed silently or imported to wrong database.

**Solution:**
1. Check for error messages during import
2. Verify you're connected to the correct database:
   ```sql
   SELECT DATABASE();
   ```
3. List all databases to see if data went elsewhere:
   ```sql
   SHOW DATABASES;
   ```
4. Re-run the import with verbose output to see errors

---

## Next Steps

Congratulations! Your Railway database is now set up and populated with your SoleBlessing data.

### Immediate Next Steps

1. **Save your connection string** - You'll need `MYSQL_URL` for Vercel deployment
   - Store it securely in a password manager
   - Never commit it to git

2. **Set up AWS S3** - Follow the S3 setup guide in `RAILWAY_VERCEL_QUICKSTART.md`

3. **Configure authentication** - Choose NextAuth or Clerk

4. **Deploy to Vercel** - Import your GitHub repo and add environment variables

### Database Management

**Accessing your database:**
- Use TablePlus, MySQL Workbench, or CLI anytime
- Connection details are always available in Railway → Variables tab
- Railway provides automatic daily backups

**Monitoring usage:**
- Go to Railway dashboard → MySQL service → Metrics
- Track storage, CPU, and memory usage
- Free tier includes 500MB storage

**Scaling:**
- Railway automatically scales within your plan limits
- Upgrade to paid plan if you exceed free tier
- No downtime during scaling

**Backups:**
- Railway automatically backs up your database daily
- Backups retained for 7 days on free tier
- Manual backups: Use `mysqldump` to export anytime

### Useful Railway Commands

**Install Railway CLI:**
```bash
npm install -g @railway/cli
```

**Login:**
```bash
railway login
```

**Link to your project:**
```bash
cd /path/to/soleblessing-ecommerce
railway link
```

**Connect to database directly:**
```bash
railway connect MySQL
```

**View logs:**
```bash
railway logs
```

**Run migrations:**
```bash
railway run pnpm db:push
```

### Database Maintenance

**Regular tasks:**
- Monitor storage usage weekly
- Review slow queries in Railway metrics
- Update Railway CLI monthly: `npm update -g @railway/cli`

**Optimization tips:**
- Add indexes for frequently queried columns
- Clean up old browsing history periodically
- Archive old orders to separate table

**Security best practices:**
- Rotate password every 90 days (Railway → Settings → Reset Password)
- Enable SSL for all connections (already default)
- Limit database access to Vercel and your IP only
- Never expose connection string in frontend code

---

## Summary

You've successfully completed the Railway database setup! Here's what you accomplished:

✅ Created Railway account  
✅ Provisioned MySQL database  
✅ Obtained connection details  
✅ Imported 115 records across 19 tables  
✅ Verified data integrity  
✅ Ready for Vercel deployment  

**Database Stats:**
- **Users**: 1
- **Products**: 30
- **Browsing History**: 84
- **Total Tables**: 19
- **Database Size**: ~1MB

**Connection String Format:**
```
mysql://root:password@host:port/railway
```

Save this connection string securely - you'll add it as `DATABASE_URL` in Vercel environment variables.

---

## Additional Resources

- **Railway Documentation**: https://docs.railway.app/databases/mysql
- **Railway Community**: https://discord.gg/railway
- **MySQL Documentation**: https://dev.mysql.com/doc/
- **TablePlus**: https://tableplus.com
- **MySQL Workbench**: https://www.mysql.com/products/workbench/

## Getting Help

**Railway Support:**
- Discord: https://discord.gg/railway
- Email: team@railway.app
- Status: https://status.railway.app

**SoleBlessing Migration:**
- GitHub Issues: https://github.com/Maldipia/soleblessing-ecommerce/issues
- Migration README: `migration/README.md`
- Quick Start Guide: `migration/RAILWAY_VERCEL_QUICKSTART.md`

---

**Author**: Manus AI  
**Last Updated**: December 2024  
**Guide Version**: 1.0
