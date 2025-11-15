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
