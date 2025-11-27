import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { eq, and, sql } from "drizzle-orm";
import { restockAlerts } from "../drizzle/schema";

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
  }
  return next({ ctx });
});

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  products: router({
    list: publicProcedure.query(async () => {
      const { getAllProducts } = await import("./db");
      return await getAllProducts();
    }),
    getById: publicProcedure
      .input((val: unknown) => {
        if (typeof val === "object" && val !== null && "id" in val && typeof (val as any).id === "number") {
          return val as { id: number };
        }
        throw new Error("Invalid input: expected { id: number }");
      })
      .query(async ({ input }) => {
        const { getProductById } = await import("./db");
        return await getProductById(input.id);
      }),
    newArrivals: publicProcedure.query(async () => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) return [];
      
      const { products } = await import("../drizzle/schema");
      const { desc } = await import("drizzle-orm");
      
      return await db
        .select()
        .from(products)
        .orderBy(desc(products.createdAt))
        .limit(8);
    }),
    
    featured: publicProcedure.query(async () => {
      const { getFeaturedProducts } = await import("./db");
      return await getFeaturedProducts();
    }),
    byCategory: publicProcedure
      .input((val: unknown) => {
        if (typeof val === "object" && val !== null && "category" in val && typeof (val as any).category === "string") {
          return val as { category: string };
        }
        throw new Error("Invalid input: expected { category: string }");
      })
      .query(async ({ input }) => {
        const { getProductsByCategory } = await import("./db");
        return await getProductsByCategory(input.category);
      }),
    byBrand: publicProcedure
      .input((val: unknown) => {
        if (typeof val === "object" && val !== null && "brand" in val && typeof (val as any).brand === "string") {
          return val as { brand: string };
        }
        throw new Error("Invalid input: expected { brand: string }");
      })
      .query(async ({ input }) => {
        const { getProductsByBrand } = await import("./db");
        return await getProductsByBrand(input.brand);
      }),
  }),

  cart: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      const { getCartItems } = await import("./db");
      return await getCartItems(ctx.user.id);
    }),
    add: protectedProcedure
      .input((val: unknown) => {
        if (
          typeof val === "object" &&
          val !== null &&
          "productId" in val &&
          typeof (val as any).productId === "number" &&
          "size" in val &&
          typeof (val as any).size === "string" &&
          "quantity" in val &&
          typeof (val as any).quantity === "number"
        ) {
          return val as { productId: number; size: string; quantity: number };
        }
        throw new Error("Invalid input: expected { productId: number, size: string, quantity: number }");
      })
      .mutation(async ({ ctx, input }) => {
        const { addToCart } = await import("./db");
        return await addToCart(ctx.user.id, input.productId, input.size, input.quantity);
      }),
    updateQuantity: protectedProcedure
      .input((val: unknown) => {
        if (
          typeof val === "object" &&
          val !== null &&
          "cartItemId" in val &&
          typeof (val as any).cartItemId === "number" &&
          "quantity" in val &&
          typeof (val as any).quantity === "number"
        ) {
          return val as { cartItemId: number; quantity: number };
        }
        throw new Error("Invalid input: expected { cartItemId: number, quantity: number }");
      })
      .mutation(async ({ input }) => {
        const { updateCartItemQuantity } = await import("./db");
        await updateCartItemQuantity(input.cartItemId, input.quantity);
        return { success: true };
      }),
    remove: protectedProcedure
      .input((val: unknown) => {
        if (typeof val === "object" && val !== null && "cartItemId" in val && typeof (val as any).cartItemId === "number") {
          return val as { cartItemId: number };
        }
        throw new Error("Invalid input: expected { cartItemId: number }");
      })
      .mutation(async ({ input }) => {
        const { removeFromCart } = await import("./db");
        await removeFromCart(input.cartItemId);
        return { success: true };
      }),
    clear: protectedProcedure.mutation(async ({ ctx }) => {
      const { clearCart } = await import("./db");
      await clearCart(ctx.user.id);
      return { success: true };
    }),
  }),

  // Customer Orders
  orders: router({
    myOrders: protectedProcedure.query(async ({ ctx }) => {
      const { getUserOrders } = await import("./db");
      return await getUserOrders(ctx.user.id);
    }),
    getById: protectedProcedure
      .input((val: unknown) => {
        if (typeof val === "object" && val !== null && "id" in val) {
          return val as { id: number };
        }
        throw new Error("Invalid input");
      })
      .query(async ({ input, ctx }) => {
        const { getOrderById, getOrderItems } = await import("./db");
        const { orders } = await import("../drizzle/schema");
        const { eq, and } = await import("drizzle-orm");
        const { getDb } = await import("./db");
        
      const db = await getDb();
        if (!db) return null;
        
        const orderResult = await db.select().from(orders).where(
          and(eq(orders.id, input.id), eq(orders.userId, ctx.user.id))
        ).limit(1);
        
        if (orderResult.length === 0) return null;
        
        const order = orderResult[0];
        const items = await getOrderItems(order.id);
        
        return { ...order, items };
      }),
    create: protectedProcedure
      .input((val: unknown) => {
        if (
          typeof val === "object" &&
          val !== null &&
          "customerName" in val &&
          "customerEmail" in val &&
          "contactNumber" in val &&
          "shippingAddress" in val &&
          "paymentMethod" in val &&
          "paymentProofUrl" in val &&
          "items" in val &&
          Array.isArray((val as any).items)
        ) {
          return val as {
            customerName: string;
            customerEmail: string;
            contactNumber: string;
            shippingAddress: string;
            paymentMethod: string;
            paymentProofUrl: string;
            notes?: string;
            items: Array<{ productId: number; size: string; quantity: number }>;
          };
        }
        throw new Error("Invalid input");
      })
      .mutation(async ({ ctx, input }) => {
        const { getDb } = await import("./db");
        const { orders, orderItems, products, cartItems } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        // Calculate total amount
        let totalAmount = 0;
        for (const item of input.items) {
          const productResult = await db.select().from(products).where(eq(products.id, item.productId)).limit(1);
          if (productResult.length === 0) throw new Error(`Product ${item.productId} not found`);
          const product = productResult[0];
          const price = product.salePrice || product.basePrice;
          totalAmount += price * item.quantity;
        }
        
        // Add shipping fee
        totalAmount += 15000; // ₱150 flat rate
        
        // Create order
        const orderResult = await db.insert(orders).values({
          userId: ctx.user.id,
          totalAmount,
          status: "pending",
          paymentMethod: input.paymentMethod,
          paymentProofUrl: input.paymentProofUrl,
          shippingAddress: input.shippingAddress,
          contactNumber: input.contactNumber,
          customerName: input.customerName,
          customerEmail: input.customerEmail,
          notes: input.notes || null,
        });
        
        const orderId = Number((orderResult as any).insertId);
        
        // Create order items
        for (const item of input.items) {
          const productResult = await db.select().from(products).where(eq(products.id, item.productId)).limit(1);
          const product = productResult[0];
          const price = product.salePrice || product.basePrice;
          
          await db.insert(orderItems).values({
            orderId,
            productId: item.productId,
            productName: product.name,
            size: item.size,
            quantity: item.quantity,
            price,
          });
        }
        
        // Clear cart
        await db.delete(cartItems).where(eq(cartItems.userId, ctx.user.id));
        
        return { id: orderId, status: "pending" };
      }),
  }),


  chat: router({
    // Admin: Get all conversations
    getAllConversations: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new Error("Admin only");
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) return [];
      const { chatMessages, users } = await import("../drizzle/schema");
      const { eq, desc, sql } = await import("drizzle-orm");
      
      // Get all users who have sent messages
      const conversations = await db
        .select({
          userId: chatMessages.userId,
          userName: users.name,
          userEmail: users.email,
          lastMessage: sql<string>`MAX(${chatMessages.message})`,
          lastMessageTime: sql<Date>`MAX(${chatMessages.createdAt})`,
          unreadCount: sql<number>`SUM(CASE WHEN ${chatMessages.isRead} = 0 AND ${chatMessages.senderType} = 'customer' THEN 1 ELSE 0 END)`,
        })
        .from(chatMessages)
        .leftJoin(users, eq(chatMessages.userId, users.id))
        .groupBy(chatMessages.userId, users.name, users.email)
        .orderBy(desc(sql`MAX(${chatMessages.createdAt})`));
      
      return conversations;
    }),
    
    // Admin: Get messages for a specific user
    getUserMessages: protectedProcedure
      .input((val: unknown) => {
        if (typeof val === "object" && val !== null && "userId" in val) {
          return val as { userId: number };
        }
        throw new Error("Invalid input");
      })
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new Error("Admin only");
        const { getDb } = await import("./db");
        const db = await getDb();
        if (!db) return [];
        const { chatMessages } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        
        return await db
          .select()
          .from(chatMessages)
          .where(eq(chatMessages.userId, input.userId))
          .orderBy(chatMessages.createdAt);
      }),
    
    // Admin: Send reply to customer
    sendAdminReply: protectedProcedure
      .input((val: unknown) => {
        if (
          typeof val === "object" &&
          val !== null &&
          "userId" in val &&
          "message" in val
        ) {
          return val as { userId: number; message: string };
        }
        throw new Error("Invalid input");
      })
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new Error("Admin only");
        const { getDb } = await import("./db");
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const { chatMessages } = await import("../drizzle/schema");
        
        await db.insert(chatMessages).values({
          userId: input.userId,
          message: input.message,
          senderType: "admin",
          isRead: 1,
        });
        
        return { success: true };
      }),
    
    // Admin: Mark messages as read
    markAsRead: protectedProcedure
      .input((val: unknown) => {
        if (typeof val === "object" && val !== null && "userId" in val) {
          return val as { userId: number };
        }
        throw new Error("Invalid input");
      })
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new Error("Admin only");
        const { getDb } = await import("./db");
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const { chatMessages } = await import("../drizzle/schema");
        const { eq, and } = await import("drizzle-orm");
        
        await db
          .update(chatMessages)
          .set({ isRead: 1 })
          .where(
            and(
              eq(chatMessages.userId, input.userId),
              eq(chatMessages.senderType, "customer")
            )
          );
        
        return { success: true };
      }),
    getMessages: protectedProcedure.query(async ({ ctx }) => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) return [];
      const { chatMessages } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      return await db
        .select()
        .from(chatMessages)
        .where(eq(chatMessages.userId, ctx.user.id))
        .orderBy(chatMessages.createdAt);
    }),
    sendMessage: protectedProcedure
      .input((val: unknown) => {
        if (
          typeof val === "object" &&
          val !== null &&
          "message" in val &&
          typeof (val as any).message === "string"
        ) {
          return val as { message: string };
        }
        throw new Error("Invalid input: expected { message: string }");
      })
      .mutation(async ({ ctx, input }) => {
      const { getDb } = await import("./db");
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const { chatMessages } = await import("../drizzle/schema");
        await db.insert(chatMessages).values({
          userId: ctx.user.id,
          message: input.message,
          senderType: "customer",
          isRead: 0,
        });
        return { success: true };
      }),
  }),
  
  restockAlerts: router({
    subscribe: protectedProcedure
      .input(z.object({
        productId: z.number(),
        size: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { getDb } = await import("./db");
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
        
        await db.insert(restockAlerts).values({
          userId: ctx.user.id,
          productId: input.productId,
          size: input.size,
        });
        
        return { success: true };
      }),
    unsubscribe: protectedProcedure
      .input(z.object({
        productId: z.number(),
        size: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { getDb } = await import("./db");
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
        
        await db.delete(restockAlerts)
          .where(and(
            eq(restockAlerts.userId, ctx.user.id),
            eq(restockAlerts.productId, input.productId),
            input.size ? eq(restockAlerts.size, input.size) : sql`1=1`
          ));
        
        return { success: true };
      }),
    get: protectedProcedure.query(async ({ ctx }) => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) return [];
      
      return await db.select()
        .from(restockAlerts)
        .where(eq(restockAlerts.userId, ctx.user.id));
    }),
  }),

  wishlist: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) return [];
      const { wishlist, products } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      
      const items = await db
        .select({
          id: wishlist.id,
          productId: wishlist.productId,
          createdAt: wishlist.createdAt,
          product: products,
        })
        .from(wishlist)
        .leftJoin(products, eq(wishlist.productId, products.id))
        .where(eq(wishlist.userId, ctx.user.id));
      
      return items;
    }),
    
    add: protectedProcedure
      .input((val: unknown) => {
        if (typeof val === "object" && val !== null && "productId" in val) {
          return val as { productId: number };
        }
        throw new Error("Invalid input");
      })
      .mutation(async ({ ctx, input }) => {
        const { getDb } = await import("./db");
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const { wishlist } = await import("../drizzle/schema");
        
        await db.insert(wishlist).values({
          userId: ctx.user.id,
          productId: input.productId,
        });
        
        return { success: true };
      }),
    
    remove: protectedProcedure
      .input((val: unknown) => {
        if (typeof val === "object" && val !== null && "productId" in val) {
          return val as { productId: number };
        }
        throw new Error("Invalid input");
      })
      .mutation(async ({ ctx, input }) => {
        const { getDb } = await import("./db");
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const { wishlist } = await import("../drizzle/schema");
        const { eq, and } = await import("drizzle-orm");
        
        await db
          .delete(wishlist)
          .where(
            and(
              eq(wishlist.userId, ctx.user.id),
              eq(wishlist.productId, input.productId)
            )
          );
        
        return { success: true };
      }),
  }),
  
  loyalty: router({
    getPoints: protectedProcedure.query(async ({ ctx }) => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) return null;
      const { loyaltyPoints } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      
      const result = await db
        .select()
        .from(loyaltyPoints)
        .where(eq(loyaltyPoints.userId, ctx.user.id))
        .limit(1);
      
      return result[0] || null;
    }),
    
    getTransactions: protectedProcedure.query(async ({ ctx }) => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) return [];
      const { pointsTransactions } = await import("../drizzle/schema");
      const { eq, desc } = await import("drizzle-orm");
      
      return await db
        .select()
        .from(pointsTransactions)
        .where(eq(pointsTransactions.userId, ctx.user.id))
        .orderBy(desc(pointsTransactions.createdAt));
    }),
  }),
  
  recommendations: router({
    getPersonalized: protectedProcedure.query(async ({ ctx }) => {
      const { invokeLLM } = await import("./_core/llm");
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) return [];
      
      const { browsingHistory, wishlist, products } = await import("../drizzle/schema");
      const { eq, desc, and, ne, inArray } = await import("drizzle-orm");
      
      // Get user's browsing history (last 20 products)
      const viewedProducts = await db
        .select({ product: products })
        .from(browsingHistory)
        .leftJoin(products, eq(browsingHistory.productId, products.id))
        .where(eq(browsingHistory.userId, ctx.user.id))
        .orderBy(desc(browsingHistory.viewedAt))
        .limit(20);
      
      // Get user's wishlist
      const wishlistProducts = await db
        .select({ product: products })
        .from(wishlist)
        .leftJoin(products, eq(wishlist.productId, products.id))
        .where(eq(wishlist.userId, ctx.user.id));
      
      // Get all products for recommendation pool
      const allProducts = await db.select().from(products).limit(100);
      
      // Extract viewed and wishlisted product IDs
      const viewedIds = viewedProducts.map(v => v.product?.id).filter(Boolean);
      const wishlistIds = wishlistProducts.map(w => w.product?.id).filter(Boolean);
      const excludeIds = Array.from(new Set([...viewedIds, ...wishlistIds]));
      
      // Prepare data for AI
      const viewedProductsInfo = viewedProducts
        .filter(v => v.product)
        .map(v => `${v.product!.brand} ${v.product!.name} (${v.product!.category})`);
      
      const wishlistProductsInfo = wishlistProducts
        .filter(w => w.product)
        .map(w => `${w.product!.brand} ${w.product!.name} (${w.product!.category})`);
      
      const availableProducts = allProducts
        .filter(p => !excludeIds.includes(p.id))
        .map(p => ({ id: p.id, info: `${p.brand} ${p.name} (${p.category})` }));
      
      // Use AI to recommend products
      const prompt = `You are a sneaker recommendation expert. Based on the user's browsing history and wishlist, recommend 6 products from the available list.

User's Recently Viewed Products:
${viewedProductsInfo.length > 0 ? viewedProductsInfo.join('\n') : 'None'}

User's Wishlist:
${wishlistProductsInfo.length > 0 ? wishlistProductsInfo.join('\n') : 'None'}

Available Products:
${availableProducts.map((p, i) => `${i + 1}. ID:${p.id} - ${p.info}`).join('\n')}

Recommend 6 product IDs that best match the user's preferences. Consider brand affinity, category preferences, and style similarity. Return ONLY a JSON array of product IDs, like: [1, 5, 12, 23, 45, 67]`;
      
      try {
        const response = await invokeLLM({
          messages: [
            { role: "system", content: "You are a helpful sneaker recommendation assistant. Always respond with valid JSON." },
            { role: "user", content: prompt },
          ],
        });
        
        const content = response.choices[0]?.message?.content || "[]";
        const contentStr = typeof content === 'string' ? content : JSON.stringify(content);
        const recommendedIds = JSON.parse(contentStr.match(/\[(.*?)\]/)?.[0] || "[]");
        
        // Fetch recommended products
        if (recommendedIds.length > 0) {
          const recommended = await db
            .select()
            .from(products)
            .where(inArray(products.id, recommendedIds))
            .limit(6);
          return recommended;
        }
      } catch (error) {
        console.error("AI recommendation error:", error);
      }
      
      // Fallback: return random products if AI fails
      return allProducts.filter(p => !excludeIds.includes(p.id)).slice(0, 6);
    }),
    
    getSimilar: publicProcedure
      .input((val: unknown) => {
        if (typeof val === "object" && val !== null && "productId" in val) {
          return val as { productId: number };
        }
        throw new Error("Invalid input");
      })
      .query(async ({ input }) => {
        const { invokeLLM } = await import("./_core/llm");
        const { getDb } = await import("./db");
        const db = await getDb();
        if (!db) return [];
        
        const { products } = await import("../drizzle/schema");
        const { eq, ne } = await import("drizzle-orm");
        
        // Get the target product
        const targetProduct = await db
          .select()
          .from(products)
          .where(eq(products.id, input.productId))
          .limit(1);
        
        if (!targetProduct[0]) return [];
        
        const target = targetProduct[0];
        
        // Get other products
        const otherProducts = await db
          .select()
          .from(products)
          .where(ne(products.id, input.productId))
          .limit(50);
        
        const availableProducts = otherProducts.map(p => ({
          id: p.id,
          info: `${p.brand} ${p.name} (${p.category})`,
        }));
        
        const prompt = `You are a sneaker recommendation expert. Find 4 products similar to the target product.

Target Product:
${target.brand} ${target.name} (${target.category})

Available Products:
${availableProducts.map((p, i) => `${i + 1}. ID:${p.id} - ${p.info}`).join('\n')}

Recommend 4 product IDs that are most similar in brand, style, or category. Return ONLY a JSON array of product IDs, like: [1, 5, 12, 23]`;
        
        try {
          const response = await invokeLLM({
            messages: [
              { role: "system", content: "You are a helpful sneaker recommendation assistant. Always respond with valid JSON." },
              { role: "user", content: prompt },
            ],
          });
          
          const content = response.choices[0]?.message?.content || "[]";
          const contentStr = typeof content === 'string' ? content : JSON.stringify(content);
          const recommendedIds = JSON.parse(contentStr.match(/\[(.*?)\]/)?.[0] || "[]");
          
          if (recommendedIds.length > 0) {
            const { inArray } = await import("drizzle-orm");
            const recommended = await db
              .select()
              .from(products)
              .where(inArray(products.id, recommendedIds))
              .limit(4);
            return recommended;
          }
        } catch (error) {
          console.error("AI similarity error:", error);
        }
        
        // Fallback: return products from same brand or category
        return otherProducts
          .filter(p => p.brand === target.brand || p.category === target.category)
          .slice(0, 4);
      }),
    
    trackView: protectedProcedure
      .input((val: unknown) => {
        if (typeof val === "object" && val !== null && "productId" in val) {
          return val as { productId: number };
        }
        throw new Error("Invalid input");
      })
      .mutation(async ({ ctx, input }) => {
        const { getDb } = await import("./db");
        const db = await getDb();
        if (!db) return { success: false };
        
        const { browsingHistory } = await import("../drizzle/schema");
        
        await db.insert(browsingHistory).values({
          userId: ctx.user.id,
          productId: input.productId,
        });
        
        return { success: true };
      }),
  }),
  
  admin: router({
    // Sync inventory from Google Sheets
    syncInventory: adminProcedure.mutation(async () => {
      const { importProductsFromSheets } = await import("./importFromSheets");
      return await importProductsFromSheets();
    }),
    
    // Product Management
    products: router({
      list: adminProcedure.query(async () => {
        const { getAllProducts } = await import("./db");
        return await getAllProducts();
      }),
      create: adminProcedure
        .input((val: unknown) => {
          if (typeof val === "object" && val !== null) {
            return val as any;
          }
          throw new Error("Invalid product data");
        })
        .mutation(async ({ input }) => {
          const { products } = await import("../drizzle/schema");
          const { getDb } = await import("./db");
      const db = await getDb();
          if (!db) throw new Error("Database not available");
          await db.insert(products).values(input);
          return { success: true };
        }),
      update: adminProcedure
        .input((val: unknown) => {
          if (
            typeof val === "object" &&
            val !== null &&
            "id" in val &&
            typeof (val as any).id === "number"
          ) {
            return val as any;
          }
          throw new Error("Invalid update data");
        })
        .mutation(async ({ input }) => {
          const { products } = await import("../drizzle/schema");
          const { eq } = await import("drizzle-orm");
          const { getDb } = await import("./db");
      const db = await getDb();
          if (!db) throw new Error("Database not available");
          const { id, ...data } = input;
          await db.update(products).set(data).where(eq(products.id, id));
          return { success: true };
        }),
      delete: adminProcedure
        .input((val: unknown) => {
          if (typeof val === "object" && val !== null && "id" in val) {
            return val as { id: number };
          }
          throw new Error("Invalid input");
        })
        .mutation(async ({ input }) => {
          const { products } = await import("../drizzle/schema");
          const { eq } = await import("drizzle-orm");
          const { getDb } = await import("./db");
      const db = await getDb();
          if (!db) throw new Error("Database not available");
          await db.delete(products).where(eq(products.id, input.id));
          return { success: true };
        }),
    }),

    // Inquiry Management
    inquiries: router({
      create: protectedProcedure
        .input((val: unknown) => {
          if (typeof val === "object" && val !== null) {
            return val as any;
          }
          throw new Error("Invalid inquiry data");
        })
        .mutation(async ({ input, ctx }) => {
          const { inquiries } = await import("../drizzle/schema");
          const { getDb } = await import("./db");
      const db = await getDb();
          if (!db) throw new Error("Database not available");
          await db.insert(inquiries).values({
            ...input,
            userId: ctx.user.id,
            status: "pending",
          });
          return { success: true };
        }),
      list: adminProcedure.query(async () => {
        const { inquiries } = await import("../drizzle/schema");
        const { getDb } = await import("./db");
      const db = await getDb();
        if (!db) return [];
        return await db.select().from(inquiries);
      }),
      reply: adminProcedure
        .input((val: unknown) => {
          if (
            typeof val === "object" &&
            val !== null &&
            "id" in val &&
            "reply" in val
          ) {
            return val as { id: number; reply: string };
          }
          throw new Error("Invalid input");
        })
        .mutation(async ({ input }) => {
          const { inquiries } = await import("../drizzle/schema");
          const { eq } = await import("drizzle-orm");
          const { getDb } = await import("./db");
      const db = await getDb();
          if (!db) throw new Error("Database not available");
          await db
            .update(inquiries)
            .set({ adminReply: input.reply, status: "replied" })
            .where(eq(inquiries.id, input.id));
          return { success: true };
        }),
    }),

    // Raffle Management
    raffles: router({
      list: adminProcedure.query(async () => {
        const { raffles } = await import("../drizzle/schema");
        const { getDb } = await import("./db");
      const db = await getDb();
        if (!db) return [];
        return await db.select().from(raffles);
      }),
      create: adminProcedure
        .input((val: unknown) => {
          if (typeof val === "object" && val !== null) {
            return val as any;
          }
          throw new Error("Invalid raffle data");
        })
        .mutation(async ({ input }) => {
          const { raffles } = await import("../drizzle/schema");
          const { getDb } = await import("./db");
      const db = await getDb();
          if (!db) throw new Error("Database not available");
          await db.insert(raffles).values(input);
          return { success: true };
        }),
    }),

    // Order Management  
    orders: router({
      list: adminProcedure.query(async () => {
        const { orders } = await import("../drizzle/schema");
        const { getDb } = await import("./db");
      const db = await getDb();
        if (!db) return [];
        return await db.select().from(orders);
      }),
      updateStatus: adminProcedure
        .input((val: unknown) => {
          if (
            typeof val === "object" &&
            val !== null &&
            "id" in val &&
            "status" in val
          ) {
            return val as { id: number; status: string };
          }
          throw new Error("Invalid input");
        })
        .mutation(async ({ input }) => {
          const { updateOrderStatus } = await import("./db");
          await updateOrderStatus(input.id, input.status);
          return { success: true };
        }),
    }),
  }),

  reviews: router({
    // Get reviews for a product
    list: publicProcedure
      .input(z.object({
        productId: z.number(),
        page: z.number().default(1),
        limit: z.number().default(10),
      }))
      .query(async ({ input }) => {
        const { reviews, reviewImages, users } = await import("../drizzle/schema");
        const { getDb } = await import("./db");
        const db = await getDb();
        if (!db) return { reviews: [], total: 0, averageRating: 0 };

        const offset = (input.page - 1) * input.limit;

        // Get reviews with user info and images
        const reviewList = await db
          .select({
            id: reviews.id,
            productId: reviews.productId,
            userId: reviews.userId,
            rating: reviews.rating,
            title: reviews.title,
            comment: reviews.comment,
            size: reviews.size,
            verifiedPurchase: reviews.verifiedPurchase,
            helpfulCount: reviews.helpfulCount,
            createdAt: reviews.createdAt,
            userName: users.name,
          })
          .from(reviews)
          .leftJoin(users, eq(reviews.userId, users.id))
          .where(eq(reviews.productId, input.productId))
          .orderBy(sql`${reviews.createdAt} DESC`)
          .limit(input.limit)
          .offset(offset);

        // Get images for each review
        const reviewsWithImages = await Promise.all(
          reviewList.map(async (review) => {
            const images = await db
              .select()
              .from(reviewImages)
              .where(eq(reviewImages.reviewId, review.id));
            return {
              ...review,
              images: images.map((img) => img.imageUrl),
            };
          })
        );

        // Get total count
        const [{ count }] = await db
          .select({ count: sql<number>`count(*)` })
          .from(reviews)
          .where(eq(reviews.productId, input.productId));

        // Calculate average rating
        const [{ avg }] = await db
          .select({ avg: sql<number>`AVG(${reviews.rating})` })
          .from(reviews)
          .where(eq(reviews.productId, input.productId));

        return {
          reviews: reviewsWithImages,
          total: Number(count),
          averageRating: avg ? Number(avg) : 0,
        };
      }),

    // Create a review
    create: protectedProcedure
      .input(z.object({
        productId: z.number(),
        orderId: z.number().optional(),
        rating: z.number().min(1).max(5),
        title: z.string().optional(),
        comment: z.string().optional(),
        size: z.string().optional(),
        images: z.array(z.string()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { reviews, reviewImages, orderItems } = await import("../drizzle/schema");
        const { getDb } = await import("./db");
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

        // Check if user has already reviewed this product
        const existingReview = await db
          .select()
          .from(reviews)
          .where(and(
            eq(reviews.productId, input.productId),
            eq(reviews.userId, ctx.user.id)
          ))
          .limit(1);

        if (existingReview.length > 0) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'You have already reviewed this product' });
        }

        // Check if this is a verified purchase
        let verifiedPurchase = 0;
        if (input.orderId) {
          const orderItem = await db
            .select()
            .from(orderItems)
            .where(and(
              eq(orderItems.orderId, input.orderId),
              eq(orderItems.productId, input.productId)
            ))
            .limit(1);
          verifiedPurchase = orderItem.length > 0 ? 1 : 0;
        }

        // Insert review
        const [review] = await db.insert(reviews).values({
          productId: input.productId,
          userId: ctx.user.id,
          orderId: input.orderId,
          rating: input.rating,
          title: input.title,
          comment: input.comment,
          size: input.size,
          verifiedPurchase,
        }).$returningId();

        // Insert images if provided
        if (input.images && input.images.length > 0) {
          await db.insert(reviewImages).values(
            input.images.map((imageUrl) => ({
              reviewId: review.id,
              imageUrl,
            }))
          );
        }

        return { success: true, reviewId: review.id };
      }),

    // Vote on review helpfulness
    vote: protectedProcedure
      .input(z.object({
        reviewId: z.number(),
        helpful: z.boolean(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { reviewVotes, reviews } = await import("../drizzle/schema");
        const { getDb } = await import("./db");
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

        // Check if user has already voted
        const existingVote = await db
          .select()
          .from(reviewVotes)
          .where(and(
            eq(reviewVotes.reviewId, input.reviewId),
            eq(reviewVotes.userId, ctx.user.id)
          ))
          .limit(1);

        if (existingVote.length > 0) {
          // Update existing vote
          await db
            .update(reviewVotes)
            .set({ helpful: input.helpful ? 1 : 0 })
            .where(and(
              eq(reviewVotes.reviewId, input.reviewId),
              eq(reviewVotes.userId, ctx.user.id)
            ));
        } else {
          // Insert new vote
          await db.insert(reviewVotes).values({
            reviewId: input.reviewId,
            userId: ctx.user.id,
            helpful: input.helpful ? 1 : 0,
          });
        }

        // Update helpful count on review
        const [{ count }] = await db
          .select({ count: sql<number>`count(*)` })
          .from(reviewVotes)
          .where(and(
            eq(reviewVotes.reviewId, input.reviewId),
            eq(reviewVotes.helpful, 1)
          ));

        await db
          .update(reviews)
          .set({ helpfulCount: Number(count) })
          .where(eq(reviews.id, input.reviewId));

        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
