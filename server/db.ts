import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Product queries
export async function getAllProducts() {
  const db = await getDb();
  if (!db) return [];
  const { products } = await import("../drizzle/schema");
  return await db.select().from(products);
}

export async function getProductById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const { products } = await import("../drizzle/schema");
  const result = await db.select().from(products).where(eq(products.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getFeaturedProducts() {
  const db = await getDb();
  if (!db) return [];
  const { products } = await import("../drizzle/schema");
  return await db.select().from(products).where(eq(products.featured, 1));
}

export async function getProductsByCategory(category: string) {
  const db = await getDb();
  if (!db) return [];
  const { products } = await import("../drizzle/schema");
  return await db.select().from(products).where(eq(products.category, category));
}

export async function getProductsByBrand(brand: string) {
  const db = await getDb();
  if (!db) return [];
  const { products } = await import("../drizzle/schema");
  return await db.select().from(products).where(eq(products.brand, brand));
}

// Cart queries
export async function getCartItems(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const { cartItems, products } = await import("../drizzle/schema");
  return await db
    .select({
      id: cartItems.id,
      productId: cartItems.productId,
      size: cartItems.size,
      quantity: cartItems.quantity,
      product: products,
    })
    .from(cartItems)
    .leftJoin(products, eq(cartItems.productId, products.id))
    .where(eq(cartItems.userId, userId));
}

export async function addToCart(userId: number, productId: number, size: string, quantity: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { cartItems } = await import("../drizzle/schema");
  const { and } = await import("drizzle-orm");
  
  // Check if item already exists in cart
  const existing = await db
    .select()
    .from(cartItems)
    .where(and(
      eq(cartItems.userId, userId),
      eq(cartItems.productId, productId),
      eq(cartItems.size, size)
    ))
    .limit(1);
  
  if (existing.length > 0) {
    // Update quantity
    await db
      .update(cartItems)
      .set({ quantity: existing[0].quantity + quantity })
      .where(eq(cartItems.id, existing[0].id));
    return existing[0].id;
  } else {
    // Insert new item
    const result = await db.insert(cartItems).values({ userId, productId, size, quantity });
    return result[0].insertId;
  }
}

export async function updateCartItemQuantity(cartItemId: number, quantity: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { cartItems } = await import("../drizzle/schema");
  await db.update(cartItems).set({ quantity }).where(eq(cartItems.id, cartItemId));
}

export async function removeFromCart(cartItemId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { cartItems } = await import("../drizzle/schema");
  await db.delete(cartItems).where(eq(cartItems.id, cartItemId));
}

export async function clearCart(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { cartItems } = await import("../drizzle/schema");
  await db.delete(cartItems).where(eq(cartItems.userId, userId));
}

// Order queries
export async function createOrder(userId: number, totalAmount: number, shippingAddress: string, contactNumber: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { orders } = await import("../drizzle/schema");
  const result = await db.insert(orders).values({
    userId,
    totalAmount,
    shippingAddress,
    contactNumber,
    status: "pending",
  });
  return result[0].insertId;
}

export async function addOrderItem(orderId: number, productId: number, productName: string, size: string, quantity: number, price: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { orderItems } = await import("../drizzle/schema");
  await db.insert(orderItems).values({
    orderId,
    productId,
    productName,
    size,
    quantity,
    price,
  });
}

export async function getOrdersByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const { orders } = await import("../drizzle/schema");
  return await db.select().from(orders).where(eq(orders.userId, userId));
}

export async function getOrderById(orderId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const { orders } = await import("../drizzle/schema");
  const result = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getOrderItems(orderId: number) {
  const db = await getDb();
  if (!db) return [];
  const { orderItems } = await import("../drizzle/schema");
  return await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
}

export async function updateOrderStatus(orderId: number, status: string, paymentId?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { orders, users } = await import("../drizzle/schema");
  const updateData: any = { status };
  if (paymentId) updateData.paymentId = paymentId;
  await db.update(orders).set(updateData).where(eq(orders.id, orderId));
  
  // Send email notification based on status
  if (status === 'Shipped' || status === 'Delivered') {
    const order = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    if (order[0]) {
      const user = await db.select().from(users).where(eq(users.id, order[0].userId)).limit(1);
      if (user[0] && user[0].email && user[0].emailNotifications === 1) {
        const { sendShippingUpdateEmail, sendDeliveryConfirmationEmail } = await import("./email");
        if (status === 'Shipped') {
          await sendShippingUpdateEmail(user[0].email, user[0].name || 'Customer', orderId);
        } else if (status === 'Delivered') {
          await sendDeliveryConfirmationEmail(user[0].email, user[0].name || 'Customer', orderId);
        }
      }
    }
  }
}

export async function getUserOrders(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const { orders, orderItems } = await import("../drizzle/schema");
  const { eq } = await import("drizzle-orm");
  
  const userOrders = await db.select().from(orders).where(eq(orders.userId, userId));
  
  // Get order items for each order
  const ordersWithItems = await Promise.all(
    userOrders.map(async (order) => {
      const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
      return { ...order, items };
    })
  );
  
  return ordersWithItems;
}
