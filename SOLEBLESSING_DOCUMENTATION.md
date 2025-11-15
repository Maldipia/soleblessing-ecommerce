# SoleBlessing Website Documentation

**Website:** SoleBlessing.com  
**Type:** E-commerce Sneaker Store  
**Tech Stack:** React 19 + Tailwind 4 + Express 4 + tRPC 11 + MySQL/TiDB  
**Theme:** Dark theme with gold accents (#FFD700)

---

## 🎯 Project Overview

SoleBlessing is a full-featured e-commerce platform for selling premium sneakers. The website includes product catalog, shopping cart, order management, raffle system, customer inquiries, live chat, AI recommendations, and admin dashboard.

---

## 📊 Database Schema

### Products Table
- **Core fields:** id, name, description, brand, category
- **Pricing:** basePrice (in centavos), salePrice, saleEndDate, clearanceEndDate
- **Inventory:** sizes (JSON array), sizeStock (JSON object), stock (total)
- **Media:** images (JSON array of URLs)
- **Flags:** featured, clearance, fitNotes
- **Timestamps:** createdAt, updatedAt

### Users Table
- **Auth:** id, openId (Manus OAuth), name, email, loginMethod
- **Permissions:** role (admin/user)
- **Settings:** emailNotifications (0/1)
- **Timestamps:** createdAt, updatedAt, lastSignedIn

### Cart Items
- userId, productId, size, quantity, createdAt

### Orders
- **Core:** id, userId, totalAmount (centavos), status
- **Status values:** pending, paid, processing, shipped, delivered, cancelled
- **Payment:** paymentMethod, paymentId (PayMongo)
- **Shipping:** shippingAddress, contactNumber
- **Timestamps:** createdAt, updatedAt

### Order Items
- orderId, productId, productName, size, quantity, price (at time of purchase)

### Raffles
- **Core:** id, productId, title, description
- **Timing:** startDate, endDate, drawDate
- **Entry:** entryFee (centavos), maxEntries
- **Status:** status (upcoming/active/closed/drawn), winnerId
- **Timestamps:** createdAt, updatedAt

### Raffle Entries
- id, raffleId, userId, entries (number of tickets), totalPaid, createdAt

### Customer Inquiries
- **Core:** id, userId, productId, subject, message
- **Tracking:** status (pending/responded/closed), adminResponse
- **Timestamps:** createdAt, updatedAt

### Chat Messages
- **Core:** id, userId, message, sender (customer/admin)
- **Tracking:** isRead (0/1)
- **Timestamp:** createdAt

### Wishlist
- id, userId, productId, createdAt

### Browsing History
- id, userId, productId, viewedAt

### Restock Alerts
- id, userId, productId, email, createdAt

---

## 🗂️ File Structure

```
/home/ubuntu/soleblessing/
├── client/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Home.tsx                    # Homepage with featured products, new arrivals, AI recommendations
│   │   │   ├── Products.tsx                # Product listing with filters (brand, category, price, size, search)
│   │   │   ├── ProductDetail.tsx           # Product page with size selector, stock, add to cart, wishlist
│   │   │   ├── Cart.tsx                    # Shopping cart with quantity controls, remove items
│   │   │   ├── MyOrders.tsx                # Customer order history with status tracking
│   │   │   ├── admin/
│   │   │   │   ├── Dashboard.tsx           # Admin overview
│   │   │   │   ├── Products.tsx            # Product CRUD management
│   │   │   │   ├── Orders.tsx              # Order management with status updates
│   │   │   │   ├── Inquiries.tsx           # Customer inquiry system with Excel export
│   │   │   │   ├── Raffles.tsx             # Raffle creation and management
│   │   │   │   └── Chat.tsx                # Admin chat interface for customer support
│   │   │   ├── policies/
│   │   │   │   ├── Shipping.tsx            # Shipping policy page
│   │   │   │   ├── Returns.tsx             # Returns & exchanges policy
│   │   │   │   ├── Privacy.tsx             # Privacy policy
│   │   │   │   └── Terms.tsx               # Terms of service
│   │   ├── components/
│   │   │   ├── Header.tsx                  # Navigation with search, cart badge, user dropdown
│   │   │   ├── Footer.tsx                  # Footer with links, social media, newsletter
│   │   │   ├── ChatWidget.tsx              # Floating chat button for customers
│   │   │   └── CountdownTimer.tsx          # Sale countdown timer component
│   │   └── const.ts                        # APP_LOGO constant
├── server/
│   ├── routers.ts                          # Main tRPC router
│   ├── db.ts                               # Database query helpers
│   ├── _core/
│   │   ├── emailNotifications.ts           # Email notification system
│   │   └── systemRouter.ts                 # System-level routes
├── drizzle/
│   └── schema.ts                           # Database schema definitions
├── scripts/
│   ├── import-from-sheets.ts               # Google Sheets inventory import script
│   └── check-restock-alerts.mts            # Script to notify customers when products restock
├── todo.md                                 # Project task tracking
└── SOLEBLESSING_DOCUMENTATION.md           # This file
```

---

## 🔌 Google Sheets Integration

### API Endpoint
**URL:** `https://script.google.com/macros/s/AKfycbxfY1kGjC-wllJUzfYCxo7HV6RGU5maCqLIOqEOj7QiIftdohuDA7XUq8QBbDuCLTC8OQ/exec`

### Tabs Imported
- 2025 (current inventory)
- 2024 (previous year)
- ABB (Adidas Basketball)
- MBB (Men's Basketball)
- ABKK (Adidas Kids)
- PERFUME (fragrance products)

### Column Mapping (A-N)
| Column | Field Name | Description |
|--------|------------|-------------|
| A | ITEM CODE | Unique product identifier (groups sizes) |
| B | DETAILS | Product name |
| C | SKU | Stock keeping unit |
| D | SIZE | Shoe size (numeric or string) |
| E | Unit cost | **INTERNAL ONLY - NEVER SHOW ON WEBSITE** |
| F | SELLING PRICE | Customer-facing price (₱) |
| G | STATUS | AVAILABLE, SOLD, SOLD - LEGACY |
| H | SUPPLIER | Supplier name |
| I | CONDITION | NEW, GOOD, etc. |
| J | DATE ADDED | Date added to inventory |
| K | NOTES | Internal notes |
| L | (empty) | Not used |
| M | (empty) | Not used |
| N | SRP | Suggested Retail Price (shown crossed out) |

### Import Logic
1. Only imports products with `STATUS = "AVAILABLE"`
2. Groups products by `ITEM CODE` (same product, different sizes)
3. Skips products with no price (both SELLING PRICE and SRP are 0 or empty)
4. Converts prices to centavos (multiply by 100)
5. If SRP > SELLING PRICE, sets salePrice and shows discount
6. Aggregates sizes into JSON array and creates sizeStock object

### Running Import
```bash
cd /home/ubuntu/soleblessing
pnpm tsx scripts/import-from-sheets.ts
```

**Last import:** 1,502 products imported, 5,912 rows skipped

---

## 🎨 Design System

### Colors
- **Background:** Dark (#0a0a0a, #1a1a1a)
- **Primary/Accent:** Gold (#FFD700)
- **Text:** White (#ffffff), Gray (#a1a1aa)
- **Success:** Green (#22c55e)
- **Error:** Red (#ef4444)
- **Warning:** Orange (#f97316)

### Typography
- **Font:** Inter (Google Fonts)
- **Headings:** Bold, uppercase for emphasis
- **Body:** Regular weight, readable line height

### Components
- **Buttons:** Gold background with dark text, hover effects
- **Cards:** Dark background with subtle borders
- **Badges:** Status indicators (NEW, SALE, CLEARANCE)
- **Inputs:** Dark with gold focus rings

---

## 🔐 Authentication & Permissions

### User Roles
- **admin:** Full access to admin dashboard, product management, order updates, chat responses
- **user:** Customer access to shopping, orders, wishlist, chat

### Protected Routes
- `/admin/*` - Admin only (checks `ctx.user.role === 'admin'`)
- `/my-orders` - Authenticated users only
- `/cart` - Authenticated users only
- Chat widget - Authenticated users only

### Auth System
- **Provider:** Manus OAuth
- **Session:** JWT cookie-based
- **Login URL:** `getLoginUrl()` from `@/const`
- **Logout:** `trpc.auth.logout.useMutation()`
- **Current user:** `useAuth()` hook or `trpc.auth.me.useQuery()`

---

## 🛒 E-commerce Features

### Product Catalog
- **Filtering:** Brand, category, price range, size, search query
- **Sorting:** Newest, price (low/high), name (A-Z)
- **Quick filters:** On Sale, Clearance
- **Stock indicators:** Out of stock (disabled), Low stock (orange dot)

### Shopping Cart
- Add/remove items
- Quantity controls with optimistic UI updates
- Real-time subtotal calculation
- Persistent across sessions (stored in database)
- Item count badge in header

### Checkout Flow
1. Add items to cart
2. Review cart and adjust quantities
3. Click "Proceed to Checkout"
4. **(Payment integration pending - PayMongo)**

### Order Management
- **Customer view:** Order history with status badges and timeline
- **Admin view:** All orders with status update controls
- **Status flow:** Pending → Paid → Processing → Shipped → Delivered
- **Email notifications:** Sent on status changes (Shipped, Delivered)

---

## 🎟️ Raffle System

### Features
- Create raffles for limited products
- Set entry fee, max entries, start/end/draw dates
- Users can purchase multiple entries
- Admin can draw winners
- Status tracking: upcoming → active → closed → drawn

### Database
- `raffles` table: Raffle details
- `raffleEntries` table: User entries with ticket count

---

## 💬 Customer Support

### Live Chat
- **Customer side:** Floating chat widget (bottom-right)
- **Admin side:** Chat dashboard with conversation list
- **Features:** Real-time polling (3-5 seconds), unread badges, message history
- **Database:** `chatMessages` table with sender type and read status

### Inquiry System
- Customers can submit inquiries about products
- Admin can respond and mark as resolved
- Excel export for inquiry records
- **Database:** `customerInquiries` table

---

## 📧 Email Notifications

### System
- **Current:** Routes through Manus owner notification system
- **Future:** Ready for SendGrid/Mailgun integration

### Notification Types
1. **Order Confirmation** - Sent when order is placed
2. **Shipping Update** - Sent when order status changes to "Shipped"
3. **Delivery Confirmation** - Sent when order status changes to "Delivered"
4. **Restock Alerts** - Sent when out-of-stock products are restocked

### User Preferences
- Users can enable/disable email notifications in their profile
- Stored in `users.emailNotifications` (0 = disabled, 1 = enabled)

### Restock Alert Script
```bash
cd /home/ubuntu/soleblessing
pnpm tsx scripts/check-restock-alerts.mts
```
Run this after restocking products to notify waiting customers.

---

## 🤖 AI Features

### Product Recommendations
- **Homepage:** Personalized recommendations based on browsing history and wishlist
- **Product pages:** Similar product suggestions
- **Technology:** LLM-powered analysis of user preferences (brand/category affinity)
- **Database:** `browsingHistory` table tracks views

### Implementation
- Uses `invokeLLM()` from `server/_core/llm.ts`
- Analyzes user's viewed products and wishlist
- Returns product IDs ranked by relevance

---

## 🎯 Key Features Summary

### Customer Features
✅ Product browsing with advanced filters  
✅ Size-specific stock availability  
✅ Shopping cart with persistent storage  
✅ Order tracking with status timeline  
✅ Wishlist functionality  
✅ Live chat support  
✅ Product inquiry system  
✅ AI-powered recommendations  
✅ Restock alert subscriptions  
✅ Email notifications for orders  
✅ Raffle entry system  
✅ Sale countdown timers  
✅ New arrivals section  

### Admin Features
✅ Product CRUD management  
✅ Order status updates  
✅ Customer inquiry responses with Excel export  
✅ Raffle creation and winner selection  
✅ Live chat interface for customer support  
✅ Role-based access control  
✅ Google Sheets inventory import  

---

## 🔄 Common Tasks

### Add New Products Manually
1. Go to `/admin/products`
2. Click "Add Product"
3. Fill in: name, brand, category, price, sizes, stock
4. Upload images (URLs)
5. Save

### Import from Google Sheets
```bash
cd /home/ubuntu/soleblessing
pnpm tsx scripts/import-from-sheets.ts
```

### Update Order Status
1. Go to `/admin/orders`
2. Find order
3. Click status dropdown
4. Select new status (triggers email notification)

### Respond to Customer Chat
1. Go to `/admin/chat`
2. Click conversation in left panel
3. Type response in input field
4. Press Enter to send

### Export Inquiries
1. Go to `/admin/inquiries`
2. Click "Export to Excel" button
3. Downloads `customer-inquiries.xlsx`

### Check Restock Alerts
After restocking products:
```bash
cd /home/ubuntu/soleblessing
pnpm tsx scripts/check-restock-alerts.mts
```

---

## 🚀 Deployment & Management

### Dev Server
```bash
cd /home/ubuntu/soleblessing
pnpm run dev
```

### Database Migrations
```bash
pnpm db:push
```

### Checkpoints
Use Manus webdev tools to save checkpoints before major changes:
```
webdev_save_checkpoint
```

### Environment Variables
All secrets are managed through Manus platform:
- `DATABASE_URL` - MySQL connection
- `JWT_SECRET` - Session signing
- `VITE_APP_TITLE` - "SoleBlessing - Premium Sneaker Store"
- `VITE_APP_LOGO` - Controlled via `client/src/const.ts`
- Plus Manus OAuth and API credentials

---

## 📝 Important Notes

### Pricing Rules
- **NEVER show Unit cost (Column E)** - This is internal only
- Display format: ~~SRP~~ **SELLING PRICE**
- All prices stored in centavos (divide by 100 for display)
- Empty prices default to 0

### Google Sheets
- Only process tabs: 2025, 2024, ABB, MBB, ABKK, PERFUME
- **NEVER touch DASHBOARD tab**
- Only import STATUS = "AVAILABLE"
- Columns P-Q-R used for different purpose (not product data)

### Stock Management
- Products have size-specific stock (`sizeStock` JSON object)
- Total stock = sum of all size stocks
- Out-of-stock sizes are disabled in UI
- Low stock (< 3) shows orange indicator

### User Roles
- First user with `openId === ENV.ownerOpenId` becomes admin automatically
- Other users default to "user" role
- Promote users to admin by updating `role` field in database

---

## 🐛 Troubleshooting

### Import Script Issues
- **0 products imported:** Check if STATUS = "AVAILABLE" exists
- **NaN errors:** Price columns have empty strings (script handles this)
- **Missing columns:** Verify API returns ITEM CODE, SELLING PRICE, SRP

### Chat Not Working
- Ensure user is logged in
- Check polling interval (3-5 seconds)
- Verify `chatMessages` table exists

### Products Not Showing
- Check `stock > 0`
- Verify `sizes` and `sizeStock` are valid JSON
- Ensure `basePrice > 0`

### Email Notifications Not Sending
- Check `users.emailNotifications = 1`
- Verify order status changed (triggers notification)
- Currently routes through owner notification (fallback)

---

## 📞 Support & Contact

For questions about this codebase, refer to:
1. This documentation file
2. `/home/ubuntu/soleblessing/todo.md` for task tracking
3. Template README at project root
4. Individual file comments

---

**Last Updated:** November 15, 2025  
**Version:** e98e0771  
**Total Products:** 1,502 (imported from Google Sheets)
