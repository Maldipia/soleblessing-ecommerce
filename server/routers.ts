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
          const { getDb } = await import("./db");
          const { eq } = await import("drizzle-orm");
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
          const { getDb } = await import("./db");
          const { eq } = await import("drizzle-orm");
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
          const { getDb } = await import("./db");
          const { eq } = await import("drizzle-orm");
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
