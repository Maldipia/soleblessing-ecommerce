import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Products table for sneaker inventory
 */
export const products = mysqlTable("products", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  brand: varchar("brand", { length: 100 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  basePrice: int("basePrice").notNull(), // Price in centavos (PHP)
  salePrice: int("salePrice"), // Sale price in centavos, null if not on sale
  images: text("images").notNull(), // JSON array of image URLs
  sizes: text("sizes").notNull(), // JSON array of available sizes
  sizeStock: text("sizeStock").notNull(), // JSON object mapping size to stock count {"US 8": 5, "US 9": 0}
  stock: int("stock").default(0).notNull(), // Total stock across all sizes
  featured: int("featured").default(0).notNull(), // 0 = false, 1 = true
  clearance: int("clearance").default(0).notNull(), // 0 = false, 1 = true
  fitNotes: varchar("fitNotes", { length: 100 }), // "True to size", "Runs small", "Runs large"
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;

/**
 * Cart items for shopping cart functionality
 */
export const cartItems = mysqlTable("cartItems", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  productId: int("productId").notNull(),
  size: varchar("size", { length: 20 }).notNull(),
  quantity: int("quantity").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CartItem = typeof cartItems.$inferSelect;
export type InsertCartItem = typeof cartItems.$inferInsert;

/**
 * Orders table for purchase history
 */
export const orders = mysqlTable("orders", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  totalAmount: int("totalAmount").notNull(), // Total in centavos
  status: mysqlEnum("status", ["pending", "paid", "processing", "shipped", "delivered", "cancelled"]).default("pending").notNull(),
  paymentMethod: varchar("paymentMethod", { length: 50 }),
  paymentId: varchar("paymentId", { length: 255 }), // PayMongo payment ID
  shippingAddress: text("shippingAddress"),
  contactNumber: varchar("contactNumber", { length: 50 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;

/**
 * Order items for order details
 */
export const orderItems = mysqlTable("orderItems", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  productId: int("productId").notNull(),
  productName: varchar("productName", { length: 255 }).notNull(),
  size: varchar("size", { length: 20 }).notNull(),
  quantity: int("quantity").notNull(),
  price: int("price").notNull(), // Price at time of purchase in centavos
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = typeof orderItems.$inferInsert;

/**
 * Raffles table for limited release sneaker raffles
 */
export const raffles = mysqlTable("raffles", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("productId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate").notNull(),
  winnerCount: int("winnerCount").default(1).notNull(),
  status: mysqlEnum("status", ["upcoming", "active", "ended", "winners_selected"]).default("upcoming").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Raffle = typeof raffles.$inferSelect;
export type InsertRaffle = typeof raffles.$inferInsert;

/**
 * Raffle entries for user participation
 */
export const raffleEntries = mysqlTable("raffleEntries", {
  id: int("id").autoincrement().primaryKey(),
  raffleId: int("raffleId").notNull(),
  userId: int("userId").notNull(),
  isWinner: int("isWinner").default(0).notNull(), // 0 = false, 1 = true
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type RaffleEntry = typeof raffleEntries.$inferSelect;
export type InsertRaffleEntry = typeof raffleEntries.$inferInsert;

/**
 * Sale events for promotional campaigns
 */
export const saleEvents = mysqlTable("saleEvents", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  discountPercentage: int("discountPercentage"),
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate").notNull(),
  status: mysqlEnum("status", ["upcoming", "active", "ended"]).default("upcoming").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SaleEvent = typeof saleEvents.$inferSelect;
export type InsertSaleEvent = typeof saleEvents.$inferInsert;

/**
 * Customer inquiries for product questions
 */
export const inquiries = mysqlTable("inquiries", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  productId: int("productId"),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  message: text("message").notNull(),
  status: mysqlEnum("status", ["pending", "replied", "closed"]).default("pending").notNull(),
  adminReply: text("adminReply"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Inquiry = typeof inquiries.$inferSelect;
export type InsertInquiry = typeof inquiries.$inferInsert;

/**
 * Wishlist for saved products
 */
export const wishlist = mysqlTable("wishlist", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  productId: int("productId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Wishlist = typeof wishlist.$inferSelect;
export type InsertWishlist = typeof wishlist.$inferInsert;

/**
 * Loyalty points for rewards program
 */
export const loyaltyPoints = mysqlTable("loyaltyPoints", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  points: int("points").default(0).notNull(),
  tier: mysqlEnum("tier", ["bronze", "silver", "gold", "platinum"]).default("bronze").notNull(),
  lifetimePoints: int("lifetimePoints").default(0).notNull(),
  referralCode: varchar("referralCode", { length: 20 }).unique(),
  birthday: timestamp("birthday"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type LoyaltyPoints = typeof loyaltyPoints.$inferSelect;
export type InsertLoyaltyPoints = typeof loyaltyPoints.$inferInsert;

/**
 * Points transaction history
 */
export const pointsTransactions = mysqlTable("pointsTransactions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  points: int("points").notNull(), // Positive for earn, negative for redeem
  type: mysqlEnum("type", ["purchase", "referral", "birthday", "redemption", "bonus"]).notNull(),
  description: text("description"),
  orderId: int("orderId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PointsTransaction = typeof pointsTransactions.$inferSelect;
export type InsertPointsTransaction = typeof pointsTransactions.$inferInsert;

/**
 * Browsing history table to track user product views for AI recommendations
 */
export const browsingHistory = mysqlTable("browsingHistory", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  productId: int("productId").notNull(),
  viewedAt: timestamp("viewedAt").defaultNow().notNull(),
});

export type BrowsingHistory = typeof browsingHistory.$inferSelect;
export type InsertBrowsingHistory = typeof browsingHistory.$inferInsert;

/**
 * Product comparison list
 */
export const comparisons = mysqlTable("comparisons", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  sessionId: varchar("sessionId", { length: 255 }), // For non-logged in users
  productIds: text("productIds").notNull(), // JSON array of product IDs
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Comparison = typeof comparisons.$inferSelect;
export type InsertComparison = typeof comparisons.$inferInsert;

export const chatMessages = mysqlTable("chatMessages", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").references(() => users.id),
  message: text("message").notNull(),
  senderType: mysqlEnum("senderType", ["customer", "admin"]).notNull(),
  isRead: int("isRead").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = typeof chatMessages.$inferInsert;