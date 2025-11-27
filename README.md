# SoleBlessing - Premium Sneaker Store

**Author:** Manus AI  
**Last Updated:** November 28, 2025

## Overview

SoleBlessing is a full-featured e-commerce platform designed specifically for premium sneaker retail. The platform provides a modern, responsive shopping experience with advanced features including product browsing, shopping cart, wishlist management, raffle entries, secure checkout with payment proof upload, and comprehensive admin order management.

Built with React 19, TypeScript, Tailwind CSS 4, Express, and tRPC, the application delivers type-safe end-to-end communication between frontend and backend while maintaining excellent performance through optimized image loading and lazy rendering techniques.

## Key Features

### Customer-Facing Features

The platform offers customers a seamless shopping experience through an intuitive interface with multiple product discovery methods. The homepage showcases featured drops, new arrivals, and personalized recommendations based on browsing history. Product pages display detailed information including multiple high-resolution images with click-to-zoom lightbox functionality, size availability, pricing with discount calculations, and similar product suggestions.

Shopping cart functionality includes persistent storage across sessions, quantity adjustments, size selection, and real-time price calculations. The wishlist feature allows customers to save favorite products for later purchase with one-click add-to-cart functionality. The checkout process supports multiple payment methods (bank transfer and GCash) with secure payment proof upload to Amazon S3 storage.

### Administrative Features

Store administrators have access to a comprehensive dashboard displaying key metrics including total revenue, order counts, product inventory, and recent order activity. The order management system provides detailed views of all orders with filtering by status (pending, processing, shipped, delivered), payment proof verification through modal image viewer, and status update capabilities.

Product management features include bulk import from Google Sheets with automatic image optimization, inventory tracking, and pricing management. The admin interface is protected by role-based access control ensuring only authorized users can access sensitive operations.

### Technical Highlights

The application architecture emphasizes performance and developer experience. Images are automatically optimized during import with three sizes generated (400px thumbnails for cards, 800px for previews, 1200px for detail views) and lazy loading implemented across all pages. The tRPC integration provides end-to-end type safety eliminating runtime errors from API mismatches.

Authentication is handled through Manus OAuth with JWT session management, providing secure user authentication without requiring custom credential storage. The database schema uses MySQL with Drizzle ORM for type-safe queries and automatic migration generation.

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React 19 | UI framework with latest concurrent features |
| Styling | Tailwind CSS 4 | Utility-first CSS with custom design tokens |
| UI Components | shadcn/ui | Accessible, customizable component library |
| Backend | Express 4 | Node.js web application framework |
| API Layer | tRPC 11 | Type-safe API with automatic client generation |
| Database | MySQL/TiDB | Relational database with cloud scalability |
| ORM | Drizzle | Type-safe database queries and migrations |
| Authentication | Manus OAuth | Secure authentication with JWT sessions |
| File Storage | Amazon S3 | Scalable object storage for images and documents |
| Image Processing | Sharp | High-performance image resizing and optimization |

## Project Structure

The codebase follows a clear separation of concerns with distinct directories for client, server, and shared code:

```
soleblessing/
├── client/                 # Frontend React application
│   ├── public/            # Static assets (favicon, robots.txt)
│   └── src/
│       ├── components/    # Reusable UI components
│       ├── pages/         # Page-level components
│       ├── contexts/      # React context providers
│       ├── hooks/         # Custom React hooks
│       └── lib/           # Utility functions and tRPC client
├── server/                # Backend Express application
│   ├── _core/            # Framework-level code (auth, context)
│   ├── db.ts             # Database query helpers
│   └── routers.ts        # tRPC API endpoints
├── drizzle/              # Database schema and migrations
│   └── schema.ts         # Table definitions
├── storage/              # S3 storage helpers
├── shared/               # Code shared between client and server
└── scripts/              # Utility scripts (data import, etc.)
```

## Quick Start Guide

### Prerequisites

Before running the application, ensure you have Node.js 22.x or later installed along with pnpm package manager. The application requires access to a MySQL database and Amazon S3 bucket, though these are automatically configured when deployed through the Manus platform.

### Installation

Clone the repository and install dependencies using pnpm. The installation process will set up all required packages for both frontend and backend:

```bash
cd /home/ubuntu/soleblessing
pnpm install
```

### Environment Configuration

The application uses environment variables for configuration. When deployed through Manus, these are automatically injected. For local development, the following variables are required:

- **DATABASE_URL**: MySQL connection string
- **JWT_SECRET**: Secret key for session token signing
- **VITE_APP_ID**: Manus OAuth application identifier
- **OAUTH_SERVER_URL**: Manus OAuth backend URL
- **BUILT_IN_FORGE_API_URL**: Manus API endpoint for storage and services
- **BUILT_IN_FORGE_API_KEY**: Authentication token for Manus services

### Database Setup

Initialize the database schema by pushing migrations to your MySQL instance:

```bash
pnpm db:push
```

This command generates SQL migrations from the schema definition in `drizzle/schema.ts` and applies them to the database.

### Importing Product Data

Products can be imported from Google Sheets using the import script. The script automatically downloads product images from Google Drive, generates optimized versions at multiple sizes, and uploads them to S3 storage:

```bash
pnpm exec tsx scripts/import-from-sheets.ts
```

The import process filters products based on availability status and condition, skipping items marked as unavailable or without proper records.

### Running the Development Server

Start the development server which runs both frontend and backend concurrently:

```bash
pnpm dev
```

The application will be available at `http://localhost:3000` with hot module replacement enabled for rapid development.

## Database Schema

### Users Table

The users table stores customer and administrator accounts with the following structure:

| Column | Type | Description |
|--------|------|-------------|
| id | INT | Auto-incrementing primary key |
| openId | VARCHAR(64) | Unique Manus OAuth identifier |
| name | TEXT | User's display name |
| email | VARCHAR(320) | Email address |
| loginMethod | VARCHAR(64) | Authentication provider |
| role | ENUM('user', 'admin') | Access level |
| createdAt | TIMESTAMP | Account creation time |
| updatedAt | TIMESTAMP | Last profile update |
| lastSignedIn | TIMESTAMP | Most recent login |

### Products Table

The products table contains the complete sneaker inventory:

| Column | Type | Description |
|--------|------|-------------|
| id | INT | Auto-incrementing primary key |
| name | VARCHAR(255) | Product name |
| brand | VARCHAR(100) | Manufacturer brand |
| category | VARCHAR(100) | Product category |
| description | TEXT | Detailed description |
| price | INT | Current price in centavos |
| originalPrice | INT | Original price before discount |
| images | JSON | Array of image URLs at different sizes |
| sizes | JSON | Available sizes array |
| sku | VARCHAR(100) | Stock keeping unit identifier |
| condition | VARCHAR(50) | Product condition |
| supplier | VARCHAR(100) | Supplier name |
| status | VARCHAR(50) | Availability status |
| isNew | BOOLEAN | New arrival flag |
| isFeatured | BOOLEAN | Featured product flag |
| createdAt | TIMESTAMP | Product creation time |
| updatedAt | TIMESTAMP | Last modification time |

### Cart Items Table

The cart items table tracks products added to customer shopping carts:

| Column | Type | Description |
|--------|------|-------------|
| id | INT | Auto-incrementing primary key |
| userId | INT | Foreign key to users table |
| productId | INT | Foreign key to products table |
| size | VARCHAR(10) | Selected size |
| quantity | INT | Item quantity |
| createdAt | TIMESTAMP | Addition time |

### Wishlist Items Table

The wishlist items table stores products customers have saved for later:

| Column | Type | Description |
|--------|------|-------------|
| id | INT | Auto-incrementing primary key |
| userId | INT | Foreign key to users table |
| productId | INT | Foreign key to products table |
| createdAt | TIMESTAMP | Addition time |

### Orders Table

The orders table records all customer purchases:

| Column | Type | Description |
|--------|------|-------------|
| id | INT | Auto-incrementing primary key |
| userId | INT | Foreign key to users table |
| status | ENUM | Order status (pending, processing, shipped, delivered) |
| totalAmount | INT | Total order value in centavos |
| shippingAddress | TEXT | Delivery address |
| contactNumber | VARCHAR(20) | Customer phone number |
| paymentMethod | VARCHAR(50) | Payment type (bank_transfer, gcash) |
| paymentProofUrl | TEXT | S3 URL of payment proof image |
| createdAt | TIMESTAMP | Order placement time |
| updatedAt | TIMESTAMP | Last status update |

### Order Items Table

The order items table contains the products included in each order:

| Column | Type | Description |
|--------|------|-------------|
| id | INT | Auto-incrementing primary key |
| orderId | INT | Foreign key to orders table |
| productId | INT | Foreign key to products table |
| size | VARCHAR(10) | Ordered size |
| quantity | INT | Item quantity |
| price | INT | Price per unit in centavos |
| createdAt | TIMESTAMP | Record creation time |

### Product Views Table

The product views table tracks customer browsing behavior for recommendation generation:

| Column | Type | Description |
|--------|------|-------------|
| id | INT | Auto-incrementing primary key |
| userId | INT | Foreign key to users table |
| productId | INT | Foreign key to products table |
| viewedAt | TIMESTAMP | View timestamp |

## API Endpoints

### Authentication Endpoints

**GET /api/oauth/callback**  
Handles OAuth callback from Manus authentication service. Exchanges authorization code for user profile and creates session cookie.

**Query: auth.me**  
Returns current authenticated user profile or null if not logged in.

**Mutation: auth.logout**  
Clears session cookie and logs out current user.

### Product Endpoints

**Query: products.list**  
Returns paginated list of products with optional filtering by brand, category, search term, and price range. Supports sorting by price, date, and popularity.

**Query: products.getById**  
Fetches detailed information for a single product including all images, available sizes, and pricing.

**Query: products.getBrands**  
Returns list of all unique brands in the inventory.

**Query: products.getCategories**  
Returns list of all product categories.

### Cart Endpoints

**Query: cart.list**  
Returns all items in the current user's shopping cart with product details.

**Mutation: cart.add**  
Adds a product to the cart with specified size and quantity. Updates quantity if item already exists.

**Mutation: cart.updateQuantity**  
Changes the quantity of an existing cart item.

**Mutation: cart.remove**  
Removes an item from the shopping cart.

**Mutation: cart.clear**  
Removes all items from the cart.

### Wishlist Endpoints

**Query: wishlist.list**  
Returns all products in the current user's wishlist.

**Mutation: wishlist.add**  
Adds a product to the wishlist.

**Mutation: wishlist.remove**  
Removes a product from the wishlist.

**Mutation: wishlist.toggle**  
Adds or removes a product from wishlist based on current state.

### Order Endpoints

**Query: orders.list**  
Returns all orders for the current user with order items and product details.

**Query: orders.getById**  
Fetches detailed information for a specific order.

**Mutation: orders.create**  
Creates a new order from cart items with shipping information and payment proof.

### Recommendation Endpoints

**Query: recommendations.getForUser**  
Returns personalized product recommendations based on browsing history and popular items.

**Mutation: recommendations.trackView**  
Records a product view for recommendation algorithm.

### Admin Endpoints

**Query: admin.orders.list**  
Returns all orders in the system with filtering by status. Requires admin role.

**Mutation: admin.orders.updateStatus**  
Updates the status of an order. Requires admin role.

**Query: admin.dashboard.stats**  
Returns aggregate statistics for admin dashboard including revenue, order counts, and product metrics. Requires admin role.

## Deployment

### Publishing the Website

The application is deployed through the Manus platform which provides automatic build, deployment, and hosting. To publish the website, first ensure all changes are saved in a checkpoint using the Management UI. The checkpoint creates a snapshot of the current codebase and database schema.

Once a checkpoint is created, click the **Publish** button in the Management UI header. The platform will build the production bundle, run database migrations, and deploy the application to a global CDN. The deployment process typically completes within 2-3 minutes.

### Custom Domain Configuration

After publishing, you can connect a custom domain through the Management UI Settings panel. Navigate to **Settings → Domains** and enter your domain name (e.g., `soleblessingofficial.com`). The platform will provide DNS configuration instructions including CNAME or A records to point your domain to the Manus infrastructure.

SSL certificates are automatically provisioned through Let's Encrypt and renewed before expiration. The platform handles all certificate management without requiring manual intervention.

### Environment Variables

Production environment variables are managed through the Manus platform and automatically injected during deployment. To add new environment variables, use the **Settings → Secrets** panel in the Management UI. Never commit sensitive credentials to the codebase.

## Maintenance Procedures

### Updating Product Inventory

Product data is imported from Google Sheets using the import script. To update inventory, modify the Google Sheets document and re-run the import command:

```bash
pnpm exec tsx scripts/import-from-sheets.ts
```

The script performs incremental updates, only modifying products that have changed since the last import. New products are inserted, existing products are updated, and products removed from the sheet remain in the database but can be marked as unavailable.

### Database Backups

The Manus platform automatically creates daily backups of the MySQL database with 30-day retention. Backups can be restored through the Management UI **Database** panel. For critical operations, create a manual checkpoint before making schema changes to enable quick rollback if issues occur.

### Monitoring and Logs

Application logs are accessible through the Management UI **Dashboard** panel. The logs display server errors, API requests, and authentication events. For production debugging, enable detailed logging by setting the `LOG_LEVEL` environment variable to `debug`.

### Performance Optimization

The application implements several performance optimizations including lazy loading of images, code splitting for route-based chunks, and database query optimization through proper indexing. Monitor page load times using the built-in analytics dashboard and investigate slow queries using the database query log.

Image optimization is handled automatically during product import. If images appear slow to load, verify that the Google Drive URLs are publicly accessible and that the S3 bucket has proper CORS configuration.

## Troubleshooting

### Common Issues

**Images not loading**: Verify that Google Drive image URLs are set to public sharing. The import script requires read access to download images for optimization.

**Authentication failures**: Check that the OAuth configuration matches the Manus application settings. The `VITE_APP_ID` must match the application identifier in the Manus dashboard.

**Database connection errors**: Ensure the `DATABASE_URL` environment variable is correctly formatted and the database server is accessible from the application server.

**Payment proof upload failures**: Verify S3 credentials and bucket permissions. The application requires `s3:PutObject` permission for the configured bucket.

### Getting Help

For technical support or questions about the Manus platform, visit the help center at https://help.manus.im or contact support through the Management UI feedback panel.

## License

Copyright © 2024 SoleBlessing - Premium Sneaker Store. All rights reserved.

---

**Documentation Version:** 1.0  
**Website Version:** be68b0c9  
**Generated by:** Manus AI
