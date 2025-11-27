# SoleBlessing Admin Guide

**Author:** Manus AI  
**Last Updated:** November 28, 2025

## Admin Dashboard Overview

The SoleBlessing admin dashboard provides comprehensive tools for managing your sneaker store operations. This guide covers order management, inventory control, and administrative procedures.

## Accessing Admin Features

### Admin Role Requirements

Admin features are restricted to users with the `admin` role in the database. The store owner's account is automatically assigned admin privileges based on the `OWNER_OPEN_ID` environment variable. Additional admin accounts can be created by updating the `role` field in the users table through the database management interface.

### Navigating the Admin Interface

After logging in with an admin account, click your profile icon in the top navigation to reveal the admin menu options:

**Admin Dashboard**: Overview of store metrics and recent activity  
**Manage Orders**: View and process customer orders  
**Manage Products**: Access product inventory controls

These options only appear for users with admin role. Regular customers do not see admin menu items.

## Dashboard Metrics

### Understanding Key Statistics

The admin dashboard displays four primary metrics providing a snapshot of store performance:

**Total Revenue**: Cumulative value of all completed orders (processing, shipped, and delivered status). This figure represents confirmed sales after payment verification. Pending orders are excluded from revenue calculations until payment is verified.

**Total Orders**: Count of all orders in the system regardless of status. This metric helps track overall order volume and identify trends in customer purchasing behavior.

**Total Products**: Number of products currently in the inventory database. This count includes all products regardless of availability status, providing visibility into catalog size.

**Pending Orders**: Number of orders awaiting payment verification. This metric requires immediate attention as pending orders represent customers waiting for order confirmation.

### Recent Orders Table

Below the metrics cards, the dashboard displays the ten most recent orders with the following information:

| Column | Description |
|--------|-------------|
| Order ID | Unique order identifier for reference |
| Customer | Name of the customer who placed the order |
| Amount | Total order value in Philippine pesos |
| Status | Current order state with color-coded badge |
| Date | Order placement timestamp |

Click any order row to navigate to the detailed order management page for that specific order.

## Order Management

### Viewing All Orders

Navigate to **Admin Dashboard → Manage Orders** to access the complete order list. This page displays all orders in reverse chronological order (newest first) with filtering options at the top.

### Filtering Orders by Status

Use the status filter dropdown to narrow the order list:

**All Orders**: Displays every order regardless of status  
**Pending**: Shows only orders awaiting payment verification  
**Processing**: Displays orders with confirmed payment being prepared  
**Shipped**: Shows orders currently in transit  
**Delivered**: Displays completed orders

Filtering helps you focus on orders requiring specific actions. For example, selecting "Pending" shows all orders needing payment verification, while "Processing" displays orders ready for shipment preparation.

### Verifying Payment Proofs

Payment verification is the most critical admin task. When customers place orders, they upload payment proof images that require manual verification before order processing can begin.

To verify a payment:

1. Locate the order in the pending orders list
2. Click the **View Payment Proof** button in the order row
3. A modal window opens displaying the uploaded payment proof image
4. Examine the image carefully to verify:
   - Payment amount matches order total
   - Payment date is recent and appropriate
   - Reference number is visible
   - Payment was sent to correct account

The lightbox viewer allows you to zoom and examine payment proof details. Use the close button or press ESC to exit the viewer.

### Updating Order Status

After verifying payment proof, update the order status to move it through the fulfillment workflow:

1. Click the **Update Status** dropdown button on the order row
2. Select the new status from the dropdown menu:
   - **Processing**: Confirms payment and begins order preparation
   - **Shipped**: Marks order as dispatched for delivery
   - **Delivered**: Confirms successful delivery completion
3. The status updates immediately with a confirmation toast

The status workflow follows this sequence:

```
Pending → Processing → Shipped → Delivered
```

You can move orders forward through this workflow but cannot move them backward. If an order needs to be cancelled or refunded, contact technical support for database modification.

### Order Details

Each order row displays comprehensive information:

**Order Number**: Unique identifier in format #12345 for customer reference and tracking.

**Customer Information**: Customer name, email, phone number, and complete shipping address. This information is used for delivery coordination.

**Order Items**: List of all products in the order with selected sizes, quantities, and individual prices. The items section helps verify order contents before shipment.

**Payment Information**: Payment method (bank transfer or GCash), total amount, and payment proof URL. The payment proof link opens the verification modal.

**Timestamps**: Order creation date and last update time. These timestamps help track order age and processing time.

## Product Management

### Importing Products from Google Sheets

Product inventory is managed through Google Sheets integration. The import script synchronizes product data from your Google Sheets document to the database.

To import products:

1. Ensure your Google Sheets document is properly formatted with required columns
2. Open a terminal or SSH into the server
3. Navigate to the project directory: `cd /home/ubuntu/soleblessing`
4. Run the import script: `pnpm exec tsx scripts/import-from-sheets.ts`

The import process performs the following operations:

**Data Validation**: Verifies that all required columns are present and contain valid data. Products with missing required fields are skipped with warning messages.

**Image Processing**: Downloads product images from Google Drive URLs, generates three optimized sizes (400px, 800px, 1200px), and uploads them to S3 storage. The original Google Drive URLs are replaced with S3 URLs in the database.

**Incremental Updates**: Compares existing products with sheet data and only updates products that have changed. New products are inserted, existing products are updated, and products not in the sheet remain unchanged.

**Status Filtering**: Automatically filters out products with STATUS ≠ "AVAILABLE", CONDITION = "NO RECORD", or SUPPLIER = "2024" to maintain inventory quality.

### Google Sheets Format

Your product sheet must include these columns:

| Column | Description | Required |
|--------|-------------|----------|
| NAME | Product name | Yes |
| BRAND | Manufacturer brand | Yes |
| CATEGORY | Product category | Yes |
| PRICE | Current selling price | Yes |
| ORIGINAL PRICE | Price before discount | Yes |
| SIZES | Available sizes (comma-separated) | Yes |
| SKU | Stock keeping unit | Yes |
| STATUS | Availability status | Yes |
| CONDITION | Product condition | Yes |
| SUPPLIER | Supplier name | Yes |
| DESCRIPTION | Product description | No |
| IMAGE URL | Google Drive image URL | No |
| IS NEW | New arrival flag (TRUE/FALSE) | No |
| IS FEATURED | Featured product flag (TRUE/FALSE) | No |

Prices should be entered in pesos (e.g., 2625 for ₱2,625). The import script automatically converts to centavos for database storage.

### Managing Product Images

Product images must be hosted on Google Drive with public sharing enabled. To add images:

1. Upload sneaker photos to Google Drive
2. Right-click the image and select "Get link"
3. Change sharing settings to "Anyone with the link can view"
4. Copy the sharing URL
5. Paste the URL into the IMAGE URL column in your Google Sheets

The import script automatically converts Google Drive sharing URLs to direct image URLs and generates optimized versions. If images fail to load, verify that sharing permissions are set correctly.

### Updating Product Availability

To mark products as unavailable without deleting them:

1. Change the STATUS column to "UNAVAILABLE" in Google Sheets
2. Run the import script to sync changes
3. Unavailable products remain in the database but are hidden from customer-facing pages

This approach preserves order history and product data while preventing new purchases of out-of-stock items.

## Database Management

### Accessing the Database

The Management UI provides a database interface for direct data access. Navigate to **Database** in the Management UI sidebar to view tables and execute queries.

### Common Database Operations

**Promoting Users to Admin**: To grant admin privileges to a user, update their role in the users table:

```sql
UPDATE users SET role = 'admin' WHERE email = 'user@example.com';
```

**Viewing Order Statistics**: Query order totals by status:

```sql
SELECT status, COUNT(*) as count, SUM(totalAmount) as revenue
FROM orders
GROUP BY status;
```

**Finding Products by Brand**: List all products from a specific brand:

```sql
SELECT id, name, price, status
FROM products
WHERE brand = 'ADIDAS'
ORDER BY createdAt DESC;
```

### Database Backup and Restore

The Manus platform automatically creates daily database backups with 30-day retention. To restore a backup:

1. Navigate to **Database** in the Management UI
2. Click the **Backups** tab
3. Select the backup date you want to restore
4. Click **Restore** and confirm the operation

Restoring a backup replaces all current data with the backup snapshot. Create a manual checkpoint before restoring to preserve the current state if needed.

## User Management

### Managing Customer Accounts

Customer accounts are created automatically through the Manus OAuth system. Admin users can view customer information through the database interface but cannot directly modify authentication credentials.

To view customer details:

```sql
SELECT id, name, email, role, createdAt, lastSignedIn
FROM users
ORDER BY createdAt DESC;
```

### Handling Account Issues

If a customer reports account problems, verify their account exists in the database using their email address. Common issues include:

**Cannot Login**: Ensure the customer is using the correct authentication method (email, Google, etc.) that they originally signed up with.

**Missing Orders**: Verify the customer is logged into the correct account. Orders are tied to the user ID, so logging in with a different account will not show previous orders.

**Profile Updates**: Direct customers to update their profile information through the Manus authentication portal accessible via the "My Profile" link in the account menu.

## Analytics and Reporting

### Revenue Tracking

Monitor revenue trends by querying orders grouped by date:

```sql
SELECT DATE(createdAt) as date, 
       COUNT(*) as orders,
       SUM(totalAmount) as revenue
FROM orders
WHERE status IN ('processing', 'shipped', 'delivered')
GROUP BY DATE(createdAt)
ORDER BY date DESC
LIMIT 30;
```

This query shows daily revenue for the past 30 days, helping identify sales patterns and peak periods.

### Popular Products

Identify best-selling products by analyzing order items:

```sql
SELECT p.name, p.brand, 
       COUNT(oi.id) as times_ordered,
       SUM(oi.quantity) as total_quantity
FROM order_items oi
JOIN products p ON oi.productId = p.id
GROUP BY p.id
ORDER BY times_ordered DESC
LIMIT 20;
```

Use this information to inform inventory decisions and promotional strategies.

### Customer Insights

Analyze customer behavior by examining product views and purchase patterns:

```sql
SELECT u.name, u.email,
       COUNT(DISTINCT o.id) as orders,
       SUM(o.totalAmount) as lifetime_value
FROM users u
LEFT JOIN orders o ON u.id = o.userId
WHERE u.role = 'user'
GROUP BY u.id
ORDER BY lifetime_value DESC
LIMIT 50;
```

This query identifies your most valuable customers based on total purchase value.

## Operational Procedures

### Daily Tasks

Perform these tasks daily to maintain smooth operations:

1. **Check Pending Orders**: Review all pending orders and verify payment proofs within 24 hours of submission
2. **Update Order Status**: Move verified orders to processing status and update shipped orders to delivered after confirmation
3. **Monitor Inventory**: Check product availability and update Google Sheets if items sell out
4. **Respond to Inquiries**: Answer customer size inquiries and product questions submitted through the inquiry form

### Weekly Tasks

Complete these tasks weekly for optimal store management:

1. **Review Analytics**: Analyze sales trends, popular products, and revenue patterns
2. **Update Featured Products**: Rotate featured products on the homepage to showcase different inventory
3. **Import New Products**: Add new arrivals to Google Sheets and run the import script
4. **Backup Verification**: Confirm automatic backups are running successfully

### Monthly Tasks

Perform these tasks monthly for long-term planning:

1. **Inventory Audit**: Compare database inventory with physical stock to identify discrepancies
2. **Customer Feedback Review**: Analyze customer inquiries and support requests to identify common issues
3. **Performance Optimization**: Review page load times and optimize slow-loading pages
4. **Security Review**: Verify admin accounts are appropriate and remove unnecessary admin privileges

## Troubleshooting

### Common Admin Issues

**Payment Proof Images Not Loading**: Verify S3 bucket permissions and CORS configuration. Ensure the `BUILT_IN_FORGE_API_KEY` environment variable is set correctly.

**Import Script Failures**: Check Google Sheets sharing permissions and verify the sheet ID in the import script configuration. Ensure all required columns are present.

**Order Status Not Updating**: Confirm you have admin role in the database. Check browser console for error messages indicating permission issues.

**Dashboard Metrics Incorrect**: Verify database queries are running successfully. Check for database connection issues in the server logs.

### Getting Technical Support

For technical issues beyond standard troubleshooting, contact Manus platform support at https://help.manus.im. Provide the following information when requesting assistance:

- Detailed description of the issue
- Steps to reproduce the problem
- Error messages from browser console or server logs
- Screenshot of the issue if applicable
- Your website version ID (found in Management UI)

## Security Best Practices

### Protecting Admin Access

Admin accounts have full control over store operations and customer data. Follow these security practices:

**Limit Admin Accounts**: Only grant admin role to trusted staff members who require administrative access. Regular employees should use standard user accounts.

**Use Strong Passwords**: Ensure all admin accounts use strong, unique passwords through the Manus authentication portal.

**Monitor Admin Activity**: Periodically review database logs to verify admin actions are appropriate and authorized.

**Revoke Unused Access**: When staff members leave or no longer require admin privileges, immediately update their role to 'user' in the database.

### Data Protection

Customer data including names, addresses, and payment information must be protected:

**Never Share Credentials**: Do not share database passwords or API keys with unauthorized parties.

**Secure Communication**: When discussing customer orders or payment issues, use secure communication channels and avoid including sensitive information in emails.

**Regular Backups**: Verify automatic backups are running and test restore procedures periodically to ensure data can be recovered if needed.

**Access Logging**: Monitor database access logs for unusual activity that might indicate unauthorized access attempts.

---

**Guide Version:** 1.0  
**Website Version:** be68b0c9  
**Generated by:** Manus AI
