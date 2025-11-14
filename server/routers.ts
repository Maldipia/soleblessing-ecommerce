import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";

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
});

export type AppRouter = typeof appRouter;
