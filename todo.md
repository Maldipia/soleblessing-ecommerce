# SoleBlessing E-commerce TODO

## Database Schema
- [x] Create products table with fields for name, description, price, sale price, images, category, brand, sizes, stock
- [x] Create cart items table for shopping cart functionality
- [x] Create orders table for order management
- [x] Create order items table for order details
- [x] Push database schema

## Product Management
- [ ] Create product listing page with grid layout
- [ ] Implement product filtering by brand (Nike, Adidas, Yeezy, etc.)
- [ ] Implement product filtering by category (Air Jordan, Dunk Low, etc.)
- [ ] Add product search functionality
- [ ] Create product detail page with image gallery
- [ ] Display sale badges and pricing
- [ ] Show size selection

## Shopping Cart
- [ ] Implement add to cart functionality
- [ ] Create cart page with item list
- [ ] Add quantity adjustment in cart
- [ ] Implement remove from cart
- [ ] Calculate cart totals
- [ ] Persist cart in database for logged-in users

## Checkout & Payment
- [ ] Create checkout page
- [ ] Integrate PayMongo payment gateway
- [ ] Handle payment success/failure
- [ ] Create order confirmation page
- [ ] Send order confirmation

## User Interface
- [ ] Design homepage with featured products and categories
- [ ] Create navigation menu (Brands, Sizes, Japan Release, Sale, Apparels, Accessories)
- [ ] Implement responsive design
- [ ] Add product image galleries
- [ ] Create sale/discount display

## Admin Features
- [ ] Create admin dashboard for product management
- [ ] Add product creation form
- [ ] Add product editing functionality
- [ ] Order management interface
- [ ] Inventory management

## GitHub & Deployment
- [ ] Create GitHub repository
- [ ] Push code to GitHub
- [ ] Document deployment instructions
- [ ] Document domain transfer from Shopify

## User Registration & Authentication
- [ ] Implement user registration with Manus OAuth
- [ ] Create user profile page
- [ ] Add order history page for customers
- [ ] Implement login/logout functionality

## Raffle System
- [ ] Create raffles table in database
- [ ] Create raffle entries table
- [ ] Build raffle listing page
- [ ] Implement raffle entry system for registered users
- [ ] Admin interface for creating and managing raffles
- [ ] Raffle winner selection system

## Sale Events
- [ ] Create sale events table
- [ ] Build sale events listing page
- [ ] Implement notification system for upcoming sales
- [ ] Admin interface for scheduling sale events

## Modern UI/UX
- [x] Design modern homepage with hero section
- [x] Add interactive product cards with hover effects
- [x] Implement smooth animations and transitions
- [x] Create mobile-responsive design
- [ ] Add product quick view modal
- [ ] Implement image zoom on product details

## Clearance Sale
- [x] Add clearance flag to products table
- [ ] Create clearance sale section on homepage
- [ ] Build dedicated clearance page with filtered products
- [ ] Add clearance badge to product cards

## Customer Inquiry System
- [x] Create inquiries table in database
- [ ] Build inquiry form on product pages
- [ ] Create inquiry submission functionality
- [ ] Admin interface to view all inquiries
- [ ] Admin reply system for inquiries
- [ ] Export inquiries to Excel functionality
- [ ] Email notifications for new inquiries

## Inventory Management
- [ ] Real-time stock display on products
- [ ] Low stock warnings in admin dashboard
- [ ] Stock update interface for admins
- [ ] Inventory report export to Excel
- [ ] Stock history tracking

## Size Availability & Stock
- [ ] Update product schema to track stock per size
- [ ] Display size selector with availability status
- [ ] Show "Available" or "Out of Stock" for each size
- [ ] Visual indicators (colors/badges) for stock status
- [ ] Real-time stock updates when adding to cart

## Size Request/Inquiry System
- [ ] "Request Size" button for out-of-stock sizes
- [ ] Inquiry form for specific size requests
- [ ] Capture product, size, customer contact in inquiry
- [ ] Admin view for size requests
- [ ] Admin can mark if size can be sourced
- [ ] Notification to customer when size becomes available

## Wishlist/Favorites System
- [x] Create wishlist table in database
- [ ] Add "Add to Wishlist" button on product cards
- [ ] Create wishlist page showing saved products
- [ ] Notification when wishlisted item goes on sale
- [ ] Wishlist icon with count in navigation

## Size Guide & Fit Recommendations
- [ ] Create size conversion chart (US/UK/EU/CM)
- [ ] Add size guide modal on product pages
- [x] Add "Fits true to size" indicator to products
- [ ] Brand-specific sizing notes (Nike vs Adidas)
- [ ] Size recommendation based on previous purchases

## Loyalty/Rewards Program
- [x] Create loyalty points table
- [ ] Award points on purchase completion
- [ ] Points display in user profile
- [ ] Early raffle access for high-tier members
- [ ] Birthday discount tracking
- [ ] Referral code system
- [ ] Points redemption for discounts

## Email Notifications
- [ ] Raffle winner announcement emails
- [ ] Raffle entry confirmation
- [ ] Flash sale announcement system
- [ ] Wishlist sale alert emails
- [ ] Order confirmation emails
- [ ] Shipping notification emails

## Comparison Tool
- [x] Create comparison table in database
- [ ] "Add to Compare" button on products
- [ ] Comparison page with side-by-side view
- [ ] Compare specs, prices, sizes, availability
- [ ] Maximum 3 products comparison
- [ ] Sticky comparison bar

## Social Proof & Reviews
- [ ] Add Facebook reviews link in footer
- [ ] Add Google reviews link in footer
- [ ] Display review count and rating
- [ ] "Check our reviews" section on homepage

## Admin Dashboard - NOW BUILDING
- [x] Create admin layout with sidebar navigation
- [x] Admin authentication check (role-based access)
- [x] Dashboard overview with key metrics
- [x] Product management page (list, add, edit, delete)
- [x] Stock management interface
- [x] Inquiry management with reply functionality
- [x] Excel export for inquiries
- [x] Raffle creation and management
- [x] Order management and status updates
- [ ] Loyalty program member overview
- [ ] Sale events creation and scheduling

## Customer Profile & Order Tracking - NOW BUILDING
- [x] Create customer profile page
- [x] Display user account information
- [x] Show order history with status
- [x] Order detail view with tracking
- [x] Order status timeline (Pending → Processing → Shipped → Delivered)
- [x] Link orders to user in database
- [x] "My Orders" navigation item
- [ ] Order search and filter functionality

## Product Listing Page - NOW BUILDING
- [x] Create product grid layout
- [x] Add brand filter (Nike, Adidas, Jordan, Yeezy, etc.)
- [x] Add category filter (Basketball, Running, Lifestyle, etc.)
- [x] Add price range slider filter
- [x] Add size availability filter
- [x] Add search functionality
- [x] Add sorting options (Price: Low to High, High to Low, Newest, Popular)
- [x] Show active filters with clear buttons
- [x] Display product count
- [x] Add "On Sale" and "Clearance" quick filters
- [x] Mobile-responsive filter sidebar

## Navigation Header - NOW BUILDING
- [x] Create sticky header component
- [x] Add logo with link to homepage
- [x] Add main navigation links (Products, Raffles, Sale Events)
- [x] Add search bar with autocomplete
- [x] Add cart icon with item count badge
- [x] Add user profile dropdown (Login/Profile/Logout)
- [x] Add admin link for admin users
- [x] Mobile responsive hamburger menu
- [ ] Smooth scroll behavior
- [x] Active link highlighting

## Product Detail Page - NOW BUILDING
- [x] Create product detail page layout
- [x] Add image gallery with main image and thumbnails
- [x] Display product name, brand, category, price
- [x] Show sale price and discount percentage
- [x] Add size selector with stock availability indicators
- [x] Add quantity selector
- [x] Add to Cart button
- [x] Add to Wishlist button
- [x] Show product description
- [x] Add size guide modal with US/UK/EU conversions
- [x] Add inquiry form for out-of-stock sizes
- [x] Show "Only X left" for low stock items
- [x] Add breadcrumb navigation
- [ ] Related products section

## Shopping Cart Page - NOW BUILDING
- [x] Create cart page layout
- [x] Display cart items with product images
- [x] Show product name, brand, size, and price per item
- [x] Add quantity adjustment controls (increase/decrease)
- [x] Add remove item button
- [x] Calculate and display subtotal
- [x] Calculate and display total
- [x] Show empty cart state with "Continue Shopping" button
- [x] Add "Proceed to Checkout" button
- [x] Show item count in cart
- [x] Persist cart state across sessions

## Footer & Policy Pages - NOW BUILDING
- [x] Create footer component
- [x] Add social media links (Facebook, Instagram, Twitter)
- [x] Add contact information (email, phone, address)
- [x] Add quick links section (Products, Raffles, Sale Events)
- [x] Add policy links (Shipping, Returns, Privacy Policy, Terms of Service)
- [x] Add newsletter signup form
- [x] Create Shipping Policy page
- [x] Create Returns Policy page
- [x] Create Privacy Policy page
- [x] Create Terms of Service page
- [x] Add copyright notice
- [x] Make footer responsive

## Live Chat Widget - NOW BUILDING
- [x] Create floating chat button component
- [x] Build chat interface with message history
- [x] Add chat message input and send functionality
- [x] Create chat messages table in database
- [x] Add real-time message updates (polling every 3 seconds)
- [ ] Show online/offline status
- [ ] Add admin chat interface to respond to customers
- [ ] Display unread message count badge
- [ ] Add typing indicator
- [x] Make chat widget responsive

## Admin Chat Interface - NOW BUILDING
- [x] Create admin chat page at /admin/chat
- [x] Display list of all customer conversations
- [x] Show unread message count per conversation
- [x] Highlight conversations with new messages
- [x] Click conversation to view full chat history
- [x] Add reply functionality for admins
- [x] Show customer name and email in conversation header
- [x] Mark messages as read when admin views them
- [ ] Add search/filter for conversations
- [x] Show timestamp for last message in each conversation
- [x] Real-time updates for new customer messages (polling every 5 seconds)

## Wishlist/Favorites System - NOW BUILDING
- [x] Add wishlist procedures to backend (add, remove, get)
- [x] Add "Add to Wishlist" heart button on product cards
- [x] Add "Add to Wishlist" button on product detail page
- [x] Create dedicated Wishlist page showing all saved products
- [x] Show wishlist link in header/navigation
- [x] Remove from wishlist functionality
- [x] Visual indicator when product is in wishlist (filled heart)
- [ ] Show sale notifications for wishlisted items
- [x] Empty wishlist state with call-to-action

## Loyalty Rewards Program - NOW BUILDING
- [x] Display loyalty points balance in user profile
- [x] Show current tier (Bronze/Silver/Gold/Platinum)
- [x] Display tier benefits and requirements
- [x] Show points transaction history
- [ ] Award points automatically on order completion
- [ ] Create points redemption system for discounts
- [ ] Add birthday bonus points feature
- [x] Show progress to next tier
- [ ] Early raffle access for higher tiers
- [x] Create loyalty program info page

## AI-Powered Product Recommendations - NOW BUILDING
- [x] Create browsing history table to track viewed products
- [x] Track product views automatically when users visit product pages
- [x] Build AI recommendation algorithm using LLM
- [x] Create recommendation API endpoint
- [x] Add "Recommended for You" section on homepage
- [x] Add "You Might Also Like" section on product detail pages
- [x] Add "Similar Products" based on wishlist items
- [x] Consider user's brand preferences in recommendations
- [x] Consider user's category preferences in recommendations
- [ ] Show personalized recommendations in user profile
- [ ] Cache recommendations for performance

## New Arrivals Section - NOW BUILDING
- [x] Add "getNewArrivals" procedure to fetch latest products
- [x] Create NewArrivals component for homepage
- [x] Display products sorted by creation date (newest first)
- [x] Show "NEW" badge on recently added products
- [x] Limit to 8 most recent products
- [x] Add "View All New Arrivals" button linking to filtered products page

## Sale Countdown Timers - NOW BUILDING
- [x] Add saleEndDate field to products table
- [x] Create CountdownTimer component
- [x] Display countdown on product cards for sale items
- [x] Display countdown on product detail page
- [x] Show "Sale Ends In: X days Y hours Z minutes" format
- [x] Automatically hide sale price when timer expires
- [x] Add visual urgency indicators (red text when < 24 hours)
- [x] Update seed data with sale end dates

## Email Notification System - NOW BUILDING
- [x] Create email notification helper functions
- [x] Send order confirmation email when order is placed
- [x] Send shipping update email when order status changes to "Shipped"
- [x] Send delivery confirmation email when order is delivered
- [x] Create restock alert subscription system
- [x] Send restock alert emails when wishlisted items come back in stock
- [x] Add email preferences in user profile
- [x] Create email templates for each notification type
- [ ] Add unsubscribe functionality

## Real Inventory Import - NOW BUILDING
- [ ] Access Google Sheets inventory data
- [ ] Parse product information from spreadsheet
- [ ] Clear sample products from database
- [ ] Import real sneaker products with all details
- [ ] Upload product images to storage
- [ ] Set correct stock levels per size
- [ ] Verify all products display correctly


## Google Sheets Integration - NOW BUILDING
- [ ] Review existing products table schema
- [ ] Create Google Sheets import script
- [ ] Fetch data from Google Sheets API using deployed web app URL
- [ ] Map Google Sheets columns to database fields
- [ ] Import products from 2025 tab
- [ ] Import products from 2024 tab
- [ ] Import products from ABB tab
- [ ] Import products from MBB tab
- [ ] Import products from ABKK tab
- [ ] Import products from PERFUME tab
- [ ] Handle product images (upload to S3)
- [ ] Set stock levels based on STATUS column
- [ ] Test imported products display correctly


## Login & Authentication UI - NOW BUILDING
- [ ] Add visible Login button to navigation header
- [ ] Fix admin dashboard React hooks error
- [ ] Test login flow for customers
- [ ] Test admin access after login
- [ ] Add user dropdown menu in header (Profile, Orders, Wishlist, Logout)

## Inventory Sync Button - COMPLETE
- [x] Create backend tRPC procedure for syncing Google Sheets
- [x] Add "Sync Inventory" button to admin dashboard
- [x] Show loading state during sync
- [x] Display success/error messages
- [x] Show sync statistics (products added/updated)

## Logo Update
- [x] Copy SoleBlessing logo to public folder
- [x] Update APP_LOGO constant in const.ts
- [x] Test logo display on website

## Product Filters Update
- [x] Exclude products with Condition = "GOOD"
- [x] Exclude products with Supplier = "UNKNOWN"
- [x] Test import with new filters

## COD with Payment Proof System
- [ ] Update orders table schema for payment proof URL
- [ ] Add payment method field (Bank Transfer, GCash, etc)
- [ ] Create checkout page with payment proof upload
- [ ] Implement S3 upload for payment screenshots
- [ ] Create order placement procedure
- [ ] Build admin orders management page
- [ ] Add payment verification UI for admin
- [ ] Implement order status updates (Pending → Paid → Shipped)
- [ ] Test complete checkout and verification flow

## Checkout System with Payment Proof - COMPLETED
- [x] Create checkout page with customer information form
- [x] Add shipping address input
- [x] Add payment method selection (Bank Transfer / GCash)
- [x] Display payment instructions (bank account details)
- [x] Implement payment proof file upload (up to 5MB images)
- [x] Upload payment proof to S3 storage
- [x] Create orders.create procedure in backend
- [x] Calculate order total with shipping fee
- [x] Create order with "pending" status
- [x] Clear cart after successful order placement
- [x] Create admin orders management page at /admin/orders
- [x] Display all orders with customer information
- [x] Show payment proof image in modal
- [x] Add approve/reject buttons for pending orders
- [x] Update order status (pending → processing → shipped → delivered)
- [x] Add order management link to admin dropdown menu
- [x] Add route for /admin/orders in App.tsx

## URGENT BUG FIXES - COMPLETED
- [x] Fix product images not displaying (showing dark placeholders instead of photos)
- [x] Fix price display showing wrong values (₱26.25 instead of ₱2,625 - divide by 100 error)
- [x] Verify image URLs are correct from Google Sheets import
- [x] Check price formatting across all product cards and pages

## Image Optimization - COMPLETED
- [x] Update import script to generate multiple Google Drive thumbnail URLs (400px, 800px, 1200px)
- [x] Add lazy loading attribute to all product images
- [x] Use 400px thumbnails for product cards
- [x] Use 1200px images for product detail views
- [x] Test image loading performance

## Product Image Lightbox/Zoom - COMPLETED
- [x] Create ImageLightbox component with full-screen viewer
- [x] Add click-to-zoom functionality on product detail page
- [x] Implement navigation controls (prev/next arrows)
- [x] Add keyboard navigation (arrow keys, ESC to close)
- [x] Support mobile touch gestures (swipe)
- [x] Use large (1200px) images in lightbox for maximum detail
- [x] Add close button and click-outside-to-close
- [x] Test on desktop and mobile

## Website Documentation - COMPLETED
- [x] Create README.md with project overview and quick start guide
- [x] Write technical architecture documentation
- [x] Document all features and functionality
- [x] Create user guide for customers
- [x] Create admin guide for store management
- [x] Document database schema and API endpoints
- [x] Write deployment and maintenance procedures
- [x] Create troubleshooting guide

## Customer Review System - COMPLETED
- [x] Create reviews table in database schema
- [x] Add review_images table for photo uploads
- [x] Implement review submission API endpoint
- [x] Create review list API endpoint with pagination
- [x] Build star rating input component
- [x] Create review form with photo upload to S3
- [x] Display reviews on product detail page
- [x] Show average rating and review count
- [x] Add review filtering (verified purchases only)
- [x] Implement helpful/not helpful voting
- [x] Test review submission and display

## GitHub & Vercel Deployment - COMPLETED
- [x] Create GitHub repository for SoleBlessing
- [x] Initialize git and commit all code
- [x] Push code to GitHub
- [x] Create .gitignore for sensitive files
- [x] Document external database setup (PlanetScale/Railway/Supabase)
- [x] Document S3 storage setup (AWS S3/Cloudflare R2)
- [x] Document OAuth replacement options (NextAuth/Clerk)
- [x] Create vercel.json configuration
- [x] Create VERCEL_DEPLOYMENT.md guide
- [x] List all required environment variables for Vercel
- [x] Create database migration scripts
- [x] Test deployment instructions

## Railway + Vercel Deployment Guide - NOW CREATING
- [ ] Create streamlined Railway + Vercel quick start guide
- [ ] Document Railway MySQL setup
- [ ] Document Vercel deployment steps
- [ ] List required environment variables
- [ ] Test deployment instructions

## Database Export & Migration Package - COMPLETED
- [x] Export complete database with mysqldump
- [x] Document all accessible environment variables
- [x] Create Railway database setup guide
- [x] Create Vercel deployment guide
- [x] Package migration files
- [x] Push to GitHub

## Railway Database Setup Guide - COMPLETED
- [x] Create detailed Railway setup guide with step-by-step instructions
- [x] Include troubleshooting section
- [x] Add verification steps
- [x] Push to GitHub

## Vercel Deployment Checklist - COMPLETED
- [x] Create personalized deployment checklist with placeholders
- [x] Include all required environment variables
- [x] Add step-by-step Vercel import instructions
- [x] Push to GitHub

## Vercel Environment Variables - COMPLETED
- [x] Create complete .env.vercel file with all required variables
- [x] Include Railway connection string placeholder
- [x] Add authentication provider options
- [x] Include AWS S3 configuration
- [x] Push to GitHub

## Railway Database Import - COMPLETED
- [x] Connect to Railway MySQL database
- [x] Create all 19 tables using Drizzle schema
- [x] Import 1 user (admin account)
- [x] Import 30 products with images and pricing
- [x] Import 84 browsing history records
- [x] Verify import with COUNT queries
- [x] Test sample queries
- [x] Provide DATABASE_URL for Vercel deployment

## Google Sheets Inventory Integration - COMPLETED (Backend Working, Frontend Debug Needed)
- [x] Set up Google Sheets API integration to read NSB INVENTORY
- [x] Create products sync from Google Sheets (2025 tab)
- [x] Map columns: F (SELLING PRICE), N (SRP), S (PRODUCTS URL - corrected from O), A (ITEM CODE), B (DETAILS), C (SKU), D (SIZE), G (STATUS)
- [x] Filter products by STATUS = "AVAILABLE"
- [x] Display products with discount calculation (SRP vs SELLING PRICE)
- [x] Show strikethrough original price (SRP) and highlighted sale price
- [x] Calculate and display discount percentage
- [x] Handle product images from PRODUCTS URL column
- [ ] Debug frontend loading issue (API working, Products page stuck on "Loading...")
- [ ] Create product detail pages with full information
- [ ] Auto-sync products every 5 minutes

## Auto-Sync Inventory from Google Sheets - NOW BUILDING
- [ ] Create in-memory cache for inventory data
- [ ] Implement automatic refresh every 5 minutes
- [ ] Add cache timestamp tracking
- [ ] Handle cache initialization on server start
- [ ] Add error handling for failed syncs
- [ ] Log sync operations for monitoring
- [ ] Test auto-sync functionality

## Clearance Sale Section - NOW BUILDING
- [x] Create dedicated Clearance Sale page component
- [x] Add special styling for clearance section (red/orange theme, urgency elements)
- [x] Filter products with high discount percentage (>50%) as clearance items
- [x] Add clearance badge to product cards
- [x] Add "Clearance Sale" link to main navigation
- [x] Create clearance section on homepage with top deals
- [x] Show "Limited Stock" and countdown timers for clearance items
- [x] Add sorting by discount percentage on clearance page

## Production Loading Issue - URGENT
- [x] Debug why tRPC queries stay in loading state on production site
- [x] Identified root cause: Backend server not deployed (Vercel only has static files)
- [x] Create Railway deployment configuration
- [x] Configure frontend to call Railway backend URL
- [x] Update Vercel config for static-only deployment
- [x] Add CORS configuration for Railway + Vercel architecture
- [ ] Deploy backend to Railway (user action required)
- [ ] Set VITE_API_URL in Vercel environment variables (user action required)
- [ ] Test full integration and verify products display

## Price Display Bug - URGENT
- [ ] Fix price formatting - prices showing divided by 100 (₱22.61 instead of ₱2,261)
- [ ] Check Products.tsx for price formatting logic
- [ ] Check ProductCard component for currency formatting
- [ ] Verify prices are stored correctly in Google Sheets (should be in pesos, not cents)
- [ ] Deploy fix to production

## Price Display Bug - FIXED
- [x] Fixed price formatting - prices were showing divided by 100 (₱22.61 instead of ₱2,261)
- [x] Root cause: parsePrice() was returning pesos, but frontend expects centavos
- [x] Solution: Modified parsePrice() to multiply by 100 (convert pesos to centavos)
- [ ] Deploy fix to Railway and verify on production

## Product Filtering Logic Update - COMPLETE ✅
- [x] Identified issue: products without images showing on website
- [x] Update Google Sheets reader to skip products with empty Column S (PRODUCTS URL)
- [x] Update inventory router to filter out SOLD OUT products
- [x] Verify SKU-based grouping is working correctly (already implemented)
- [x] Deploy and test - only products with images should appear
- [x] Verify product count decreases to only items with images
- [x] VERIFIED: Product count reduced from 445 to 29 on live website
- [x] All products now displaying with correct prices and images

## Product Images Not Loading - COMPLETE ✅
- [x] Check image URL format from Google Sheets Column S
- [x] Verify Google Drive link conversion to thumbnail format
- [x] Check if imageUrl is being properly set in inventory router
- [x] Added convertGoogleDriveUrl() function to routers.ts
- [x] Applied conversion to both list and getByItemCode endpoints
- [x] Deploy and test image loading on live website
- [x] VERIFIED: All 29 products now showing images correctly on production

## Lazy Loading for Product Images - COMPLETE ✅
- [x] Find ProductCard component where images are rendered
- [x] Created LazyImage component with Intersection Observer
- [x] Add loading skeleton/placeholder for better UX (using Skeleton component)
- [x] Updated Products.tsx to use LazyImage
- [x] Updated RecommendedProducts.tsx to use LazyImage
- [x] Updated SimilarProducts.tsx to use LazyImage
- [x] Deploy to production and verify performance improvement
- [x] VERIFIED: Lazy loading working on www.soleblessingofficial.com

## Image Compression & WebP Conversion - PAUSED
- [x] Create image proxy API endpoint for compression and WebP conversion
- [x] Support Google Drive image URLs
- [x] Support direct image URLs
- [x] Add caching headers for optimized images
- [ ] Update LazyImage component to use image proxy
- [ ] Test compression quality and file size reduction
- [ ] Deploy to production and verify performance improvement

## UI Improvements - COMPLETE ✅
- [x] Update font to professional typography (Inter font)
- [x] Group products by SKU in product list
- [x] Show all available sizes for each SKU (up to 5 displayed, +X more if >5)
- [x] Display stock availability per size
- [x] Update product card layout for better readability
- [x] Deploy and verify UI improvements
- [x] VERIFIED: Product count reduced from 29 to 18 (grouped by SKU)
- [x] VERIFIED: All products showing "Available Sizes" with size badges
- [x] VERIFIED: Inter font applied across website

## CRITICAL ISSUES - IN PROGRESS

### Broken Product Images - COMPLETE ✅
- [x] Investigate why images stopped loading
- [x] Check if Google Drive URLs are still valid
- [x] Check if convertGoogleDriveUrl function is working
- [x] Fix image loading issue - updated function to handle uc?export=view format
- [x] Deploy and verify images load correctly
- [x] VERIFIED: Images loading on www.soleblessingofficial.com

### Product Name Text Still Gray - COMPLETE ✅
- [x] Change product name text from light gray to dark/black (first attempt - text-foreground)
- [x] Apply explicit dark color (text-gray-900)
- [x] User reports text STILL gray - need to check CSS specificity
- [x] Apply inline style with color: #000000 for absolute override
- [x] Deploy and verify fix on live website
- [x] VERIFIED: Product names now black on www.soleblessingofficial.com

## Product Display Fix - 1 SKU = 1 Card - RESOLVED
- [x] User wants 1 card per SKU, not duplicate cards for each size
- [x] Update grouping logic to show single card per SKU
- [x] Display all available sizes on that single card
- [x] Remove duplicate product cards
- [x] Deploy and verify - WORKING (user needs to clear cache)

## CLEARANCE PAGE NEEDS GROUPING FIX
- [x] Verified Products page HAS grouping (1 card per SKU) ✅
- [x] Verified Clearance page DOES NOT have grouping (duplicate cards) ❌
- [x] Apply same grouping logic to Clearance page
- [x] Fix gray text on both pages (added force-black-text class)
- [ ] Commit and deploy
- [ ] Verify on live website

## Missing Products Investigation - HQ1917
- [ ] User reports HQ1917 not showing on website
- [ ] User says only seeing few photos
- [ ] Check Google Sheets for HQ1917 - verify Column S has image URL
- [ ] Check if STATUS is "AVAILABLE"
- [ ] Check Railway API to see if HQ1917 is in the response
- [ ] Investigate why products with images aren't showing

## FIX: 404 Error When Clicking Products - COMPLETE ✅
- [x] User reported 404 error when clicking product cards on Clearance page
- [x] Root cause: ClearanceSale.tsx was linking to /products/${id} instead of proper route
- [x] Products.tsx also had routing issue - using database IDs for Google Sheets products
- [x] Solution: Created InventoryDetail.tsx page for Google Sheets inventory
- [x] Updated ClearanceSale.tsx to link to /inventory/${itemCode}
- [x] Updated Products.tsx to link to /inventory/${itemCode}
- [x] Added /inventory/:itemCode route to App.tsx
- [x] Pushed to GitHub and deployed to Vercel
- [x] Tested on production - WORKING! ✅
- [x] URL format: www.soleblessingofficial.com/inventory/7647
- [x] Product detail page displays correctly with:
  - Product image
  - Pricing with discount (₱1935.00 was ₱8127.00)
  - Size selection (shows all available sizes for SKU)
  - Quantity selector
  - Add to Cart and Wishlist buttons
  - Product details (Status, Condition, Item Code)

## INVESTIGATE: Broken Product Images - COMPLETE ✅
- [x] User reports some products showing blank/white images
- [x] Investigated all 34 products in Google Sheets
- [x] Found 21 unique SKUs displaying on website
- [x] Identified 1 product with broken image:
  * CLOUD FOAM WALK (SKU: ID6488, Item Code: 7647)
  * Issue: Using Adidas website URL instead of Google Drive URL
  * URL: https://assets.adidas.com/images/w_600,f_auto,q_auto/...
- [x] All other 20 products have valid Google Drive URLs
- [x] Created diagnostic script (check-images.mts) to identify broken URLs
- [x] User needs to replace Adidas URL with Google Drive link for CLOUD FOAM WALK

## FIX: Broken Images - Google Drive Folder URLs
- [ ] User added new products with incomplete/folder URLs
- [ ] Products showing broken images: HQ3475, EF0812, JI4851, JQ2477, IH3071
- [ ] Issue: Using Google Drive FOLDER links instead of FILE links
- [ ] Wrong format: `https://drive.google.com/drive/u/1/folders/...`
- [ ] Correct format: `https://drive.google.com/file/d/FILE_ID/view?usp=sharing`
- [ ] Guide user on how to get correct Google Drive file URLs
- [ ] Update diagnostic script to detect folder URLs
- [ ] Wait for user to fix URLs in Google Sheets
- [ ] Verify images load after sync

## NEW FEATURE: Size Guide for Brands
- [ ] Create size guide component with brand-specific sizing
- [ ] Add Adidas size chart (US, UK, EU, CM conversions)
- [ ] Add Nike size chart
- [ ] Add generic/other brands size chart
- [ ] Create modal/dialog to display size guide
- [ ] Add "Size Guide" button to product detail pages
- [ ] Include fit recommendations (runs small, true to size, runs large)
- [ ] Add measurement instructions (how to measure foot)
- [ ] Test size guide on InventoryDetail and ProductDetail pages
- [ ] Deploy and verify on production

## URGENT: All Product Images Showing Black/Empty
- [ ] User reports all products showing black/empty images
- [ ] User added new file links 20 minutes ago but not showing
- [ ] Check if auto-sync has run (5-minute interval)
- [ ] Manually clear cache and fetch fresh inventory
- [ ] Verify Google Drive permissions on all images
- [ ] Check if convertGoogleDriveUrl is working correctly
- [ ] Test image URLs directly in browser
- [ ] Identify if it's a caching, permissions, or code issue

## URGENT: Auto-Sync Not Working
- [ ] User added new image URLs 10+ minutes ago
- [ ] Products not showing on website
- [ ] Auto-sync should run every 5 minutes but not working
- [ ] Check if startAutoSync() is being called on server startup
- [ ] Check server logs for sync errors
- [ ] Test manual sync via admin dashboard
- [ ] Verify cache invalidation is working
- [ ] Fix auto-sync mechanism

## URGENT: Wrong Shoe Sizes Showing (20CM)
- [ ] User reports sizes showing "20CM" which is incorrect
- [ ] Should show proper US shoe sizes (e.g., 7, 7.5, 8, 8.5, etc.)
- [ ] Check SIZE column in Google Sheets - what format is it?
- [ ] Check if size parsing/display logic is wrong
- [ ] Fix size display to show correct US sizes
- [ ] Remove "CM" suffix if it's coming from Google Sheets

## CRITICAL: Product Not Found When Clicking Products - FIXED ✅
- [x] User clicks on products and gets "Product Not Found" error
- [x] This was a loop - products show on listing but detail page fails
- [x] Railway backend cache not syncing with new Google Sheets data
- [x] Got Railway backend URL: soleblessing-ecommerce-production-94e3.up.railway.app
- [x] Triggered inventory.refresh endpoint - fetched 49 products
- [x] Fixed missing itemCode in grouped products (Products.tsx line 54)
- [x] Verified products load correctly - clicking now works!
- [x] URL format: /inventory/7632 (using itemCode)

## NEW FEATURE: Size Sorting Filter - COMPLETE ✅
- [x] Add "Size: Smallest to Largest" option to sort dropdown
- [x] Implement sorting logic to order products by their smallest available size
- [x] Handle size formats correctly:
  * Regular numbers: 20, 21, 22 (US adult sizes)
  * Kids sizes: 10.5K, 4.5K (K = kids)
  * CM measurements: 20CM, 21CM (centimeters)
- [x] Parse and normalize sizes for accurate sorting
- [x] Created unit tests - all 6 tests passing
- [x] Tested with mixed formats (CM, K, regular numbers)
- [x] Deployed to production - VERIFIED WORKING!
- [x] Tested on www.soleblessingofficial.com/products
- [x] Products now sort correctly from smallest to largest size

## UPDATE: Payment Methods Display on Product Detail Page
- [x] Update InventoryDetail.tsx to show payment methods section
- [x] Add payment method icons/badges: COD, GCash, CC (Credit Card), Bank Transfer
- [x] Match design from reference screenshot with 2x2 grid layout
- [x] Added colored badges for each payment method
- [ ] Test on production
- [ ] Deploy changes

## Payment Methods Display - COMPLETED
- [x] Update InventoryDetail.tsx to show payment methods section
- [x] Add payment method icons/badges: COD, GCash, CC (Credit Card), Bank Transfer
- [x] Match design from reference screenshot with 2x2 grid layout
- [x] Added colored badges for each payment method:
  - COD (Cash on Delivery) with blue badge
  - GCash with blue badge
  - CC (Credit Card) with gradient badge
  - Bank Transfer with green badge
- [x] Test on production - VERIFIED WORKING!
- [x] Deploy changes - Successfully deployed to www.soleblessingofficial.com
- [x] Payment methods section displays correctly below product details

## UPDATE: Product Condition Display
- [x] Change condition field to always show "BRAND NEW" instead of Google Sheets condition
- [x] Update InventoryDetail.tsx to hardcode condition as "BRAND NEW"
- [x] Test on production - VERIFIED WORKING!
- [x] Deploy changes - Successfully deployed to www.soleblessingofficial.com
- [x] Condition now displays "BRAND NEW" instead of "GOOD" for all products

## UPDATE: Product Card Text Color Fix
- [x] Fix product name text color on product cards (currently hard to read - dark text on dark background)
- [x] Change product names to white/light color for better visibility
- [x] Updated force-black-text class in index.css to use white color (#ffffff)
- [x] Test on production - VERIFIED WORKING!
- [x] Deploy changes - Successfully deployed to www.soleblessingofficial.com
- [x] Product names now display in white text for better readability on dark backgrounds

## URGENT: Fix Available Sizes Display
- [x] Product cards showing wrong sizes (generic list instead of actual available sizes)
- [x] Each product should only show sizes that exist in Google Sheets for that specific SKU
- [x] Fixed Products.tsx to use productSizes (from product.sizes) instead of global sizes array
- [x] ClearanceSale.tsx already correctly showing sizes per SKU
- [x] Now each product card shows only its actual available sizes from Google Sheets
- [x] Test on production - VERIFIED WORKING!
- [x] Deploy changes - Successfully deployed to www.soleblessingofficial.com
- [x] Examples verified:
  - PUREBOOST 22: Shows only "28"
  - CLOUD FOAM WALK: Shows only "23.5"
  - RIVALRY LOW: Shows only "30"
  - SUPERSTAR OT TECH: Shows only "23.5, 27.5"
  - NIKE SB CHRON 2 CNVS: Shows only "26, 27, 28, 28.5, 29"

## Comprehensive Website Audit & Error Fixes
- [x] Check development server status - Running OK, no TypeScript errors
- [x] Test homepage functionality - Found duplicate footer sections
- [x] Test products page - Working correctly, 25 products with real sizes
- [x] Test clearance page - Working correctly, 14 clearance items
- [x] Test product detail pages - Working correctly with payment methods
- [x] Test navigation and routing - All working
- [x] Fix identified issues:
  - Removed inline footer from Home.tsx (App.tsx already has global Footer component)
  - Homepage now shows only one footer instead of two
- [x] Deploy and verify all fixes - VERIFIED WORKING!
- [x] Homepage now displays single footer with all sections properly organized

## URGENT: Fix Product Count Display
- [ ] Products page only showing 37 products instead of all available
- [ ] Check Google Sheets for total available products
- [ ] Check backend inventory.list procedure for any filters
- [ ] Check googleSheets.ts for filtering logic
- [ ] Fix any issues limiting product display
- [ ] Deploy and verify all products show

## Feature: Last Pair Marketing Badge
- [x] Add "Last Pair" category - products with only 1 size available
- [x] Added isLastPair property to product grouping logic
- [x] Added orange "LAST PAIR" badge on product cards
- [x] Added "Last Pair" filter checkbox in Quick Filters
- [x] Updated filter logic to show only Last Pair products when enabled
- [x] Test on production - VERIFIED WORKING!
- [x] Deploy changes - Successfully deployed to www.soleblessingofficial.com
- [x] 38 products now showing (was 37 before)
- [x] Last Pair badges showing on products with single size (PUREBOOST 22, CLOUD FOAM WALK, etc.)
- [x] Last Pair filter checkbox working in Quick Filters sidebar

## Feature: Kids Category
- [x] Add Kids category for children's sneakers (sizes under 24 or with CM suffix)
- [x] Add isKids property to product grouping logic
- [x] Add pink "KIDS" badge on product cards
- [x] Add "Kids" filter checkbox in Quick Filters
- [x] Test on production - VERIFIED WORKING!
- [x] Deploy changes - Successfully deployed to www.soleblessingofficial.com
- [x] Kids badges showing on products like CLOUD FOAM WALK, SUPERSTAR OT TECH, SAMBA OG C, etc.
- [x] Products with both Last Pair and Kids show both badges (e.g., CLOUD FOAM WALK shows "LAST PAIR" + "KIDS")

## Feature: Last Pair Homepage Section
- [x] Create LastPairSection component
- [x] Fetch inventory and filter for Last Pair products (single size)
- [x] Display with urgency styling and "Grab it before it's gone" messaging
- [x] Add to homepage between Clearance and New Arrivals sections
- [x] Test on production - VERIFIED WORKING!
- [x] Deploy changes - Successfully deployed to www.soleblessingofficial.com
- [x] Section shows "LAST PAIR" header with urgency messaging
- [x] 4 products displayed with orange badges, discount %, and "ONLY 1 LEFT!" urgency indicator
- [x] "View All Last Pair Deals" button links to products page

## FIX: Kids Detection Logic
- [x] Fix Kids detection - NMD_V3 and NIZZA RF incorrectly tagged as Kids
- [x] Change logic: Only mark as Kids if size has "CM" suffix OR product name contains kids indicators
- [x] Remove size < 24 logic that incorrectly tags adult small sizes as Kids
- [x] Kids indicators now: CM suffix, " C " or " C" in name (Children's), "KIDS", "JUNIOR", " J " or " J" (Junior)
- [x] Test on production - VERIFIED WORKING!
- [x] Deploy changes - Successfully deployed to www.soleblessingofficial.com
- [x] NMD_V3 and NIZZA RF no longer have Kids badge
- [x] Kids badge correctly shows on: SAMBA OG C, HANDBALL SPEZIAL C, SUMMERFLEX C, LIGHTBLAZE J

## FIX: Filter Out Sold Products
- [x] GALAXY 1M showing on website even though marked as "SOLD" in Google Sheets
- [x] Update backend filtering to exclude products where STATUS contains "SOLD", "OUT", or "MISSING"
- [x] Also filter out products with no sizes or ₱0 price
- [x] Added hasSize and hasValidPrice checks to filtering logic
- [ ] Test on production
- [ ] Deploy changes

## FIX: Filter Out Sold Products - COMPLETED
- [x] GALAXY 1M removed from website (was marked SOLD in Google Sheets)
- [x] Updated backend filtering to exclude STATUS containing "SOLD", "OUT", or "MISSING"
- [x] Also filtering out products with no sizes or ₱0 price
- [x] Product count reduced from 43 to 40 (correct filtering)
- [x] FORUM BONEGA and BREAKNET 2.0 also removed (no sizes available)

## Feature: Comprehensive Size Guide Modal
- [x] Create SizeGuideModal component with conversion charts
- [x] Include Men's sizes (US, UK, EU, CM)
- [x] Include Women's sizes (US, UK, EU, CM)
- [x] Include Kids sizes (US, UK, EU, CM)
- [x] Add measuring instructions with step-by-step guide
- [x] Add brand-specific fit notes (Nike, Adidas, Jordan, New Balance)
- [x] Add size guide button to product detail page (next to Select Size)
- [x] Add size guide button in products page filters sidebar
- [x] Style modal to match site design (dark theme, amber accents)
- [ ] Test on production
- [ ] Deploy changes

## Feature: Fetch Products from All Google Sheets Tabs
- [x] Update Google Sheets service to fetch from 2025, 2024, ABB, MBB tabs
- [x] Added correct GIDs: 2025=631652219, 2024=0, ABB=1973067738, MBB=946254902
- [x] Combine products from all tabs into single inventory list
- [x] Ensure no duplicate products across tabs (using itemCode deduplication)
- [ ] Test on production to verify all products display
- [ ] Deploy changes

## Multi-Tab Google Sheets Integration - COMPLETED
- [x] Update backend to fetch from all 4 Google Sheets tabs (2025, 2024, ABB, MBB)
- [x] Configure correct GIDs for each tab (2025: 631652219, 2024: 0, ABB: 1973067738, MBB: 946254902)
- [x] Merge products from all tabs into single product list
- [x] Filter out sold products (STATUS containing SOLD/OUT/MISSING)
- [x] Deploy to Vercel/Railway and verify 130 products showing

## Size Normalization Fix - IN PROGRESS
- [x] Normalize size formats to remove duplicates (27.5 CM, 27.5CM, 27.50 → 27.5)
- [x] Remove "CM" suffix variations and standardize format
- [x] Display only unique sizes per product

## Kids Detection Fix - IN PROGRESS
- [ ] Fix kids detection: use size threshold (under 24cm = kids) instead of CM suffix
- [ ] Adult sizes 28.5cm, 29cm etc should NOT be tagged as kids

## Shoe Cleaner Landing Page - COMPLETE
- [x] Access Google Drive folder for shoe cleaner assets
- [x] Create new landing page for shoe cleaner product
- [x] Add images and product information
- [x] Add route to navigation

## Shoe Cleaner Product Photos - IN PROGRESS
- [ ] Download product images from Google Drive
- [ ] Upload images to S3 storage
- [ ] Update landing page with actual product photos

## Shoe Cleaner Product Photos - COMPLETE
- [x] Download product images from Google Drive
- [x] Upload images to S3 storage
- [x] Update landing page with actual product photos

## Shoe Cleaner Page Update - COMPLETE
- [x] Update content to match packaging exactly
- [x] Add phone number (0967) 400 0040
- [x] Update kit inclusions: Shoe Cleaner Solution, 10ml Shoe Deodorizer, Wooden Brush, Microfiber Cloth, Magic Sponge
- [x] Add "REVIVE your shoes, step with PRIDE" tagline
- [x] Match Shopify page design elements

## Payment Proof Upload System
- [ ] Create payment proof upload page at /upload-payment
- [ ] Connect to Google Apps Script backend for file uploads
- [ ] Form fields: Order ID, Customer Name, Amount, Notes, File upload
- [ ] Display upload confirmation with proof ID
- [ ] Add navigation link to upload page
