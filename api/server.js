// api/index.ts
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

// shared/const.ts
var COOKIE_NAME = "app_session_id";
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
var AXIOS_TIMEOUT_MS = 3e4;
var UNAUTHED_ERR_MSG = "Please login (10001)";
var NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";

// server/_core/cookies.ts
function isSecureRequest(req) {
  if (req.protocol === "https") return true;
  const forwardedProto = req.headers?.["x-forwarded-proto"];
  if (!forwardedProto) return false;
  const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(",");
  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}
function getSessionCookieOptions(req) {
  return {
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: isSecureRequest(req)
  };
}

// server/routers.ts
import { addHours } from "date-fns";

// server/_core/systemRouter.ts
import { z } from "zod";

// server/_core/notification.ts
import { TRPCError } from "@trpc/server";

// server/_core/env.ts
var ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? ""
};

// server/_core/notification.ts
var TITLE_MAX_LENGTH = 1200;
var CONTENT_MAX_LENGTH = 2e4;
var trimValue = (value) => value.trim();
var isNonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;
var buildEndpointUrl = (baseUrl) => {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(
    "webdevtoken.v1.WebDevService/SendNotification",
    normalizedBase
  ).toString();
};
var validatePayload = (input) => {
  if (!isNonEmptyString(input.title)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification title is required."
    });
  }
  if (!isNonEmptyString(input.content)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification content is required."
    });
  }
  const title = trimValue(input.title);
  const content = trimValue(input.content);
  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`
    });
  }
  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`
    });
  }
  return { title, content };
};
async function notifyOwner(payload) {
  const { title, content } = validatePayload(payload);
  if (!ENV.forgeApiUrl) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service URL is not configured."
    });
  }
  if (!ENV.forgeApiKey) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service API key is not configured."
    });
  }
  const endpoint = buildEndpointUrl(ENV.forgeApiUrl);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "content-type": "application/json",
        "connect-protocol-version": "1"
      },
      body: JSON.stringify({ title, content })
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[Notification] Failed to notify owner (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
      );
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[Notification] Error calling notification service:", error);
    return false;
  }
}

// server/_core/trpc.ts
import { initTRPC, TRPCError as TRPCError2 } from "@trpc/server";
import superjson from "superjson";
var t = initTRPC.context().create({
  transformer: superjson
});
var router = t.router;
var publicProcedure = t.procedure;
var requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError2({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user
    }
  });
});
var protectedProcedure = t.procedure.use(requireUser);
var adminProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError2({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user
      }
    });
  })
);

// server/_core/systemRouter.ts
var systemRouter = router({
  health: publicProcedure.input(
    z.object({
      timestamp: z.number().min(0, "timestamp cannot be negative")
    })
  ).query(() => ({
    ok: true
  })),
  notifyOwner: adminProcedure.input(
    z.object({
      title: z.string().min(1, "title is required"),
      content: z.string().min(1, "content is required")
    })
  ).mutation(async ({ input }) => {
    const delivered = await notifyOwner(input);
    return {
      success: delivered
    };
  })
});

// server/routers.ts
import { z as z2 } from "zod";
import { eq as eq2 } from "drizzle-orm";

// server/db.ts
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

// drizzle/schema.ts
import { integer, pgEnum, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
var roleEnum = pgEnum("role", ["user", "admin"]);
var paymentMethodEnum = pgEnum("payment_method", ["dinheiro", "pix", "cartao"]);
var statusEnum = pgEnum("status", ["active", "cancelled", "used"]);
var users = pgTable("users", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  openId: varchar("open_id", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("login_method", { length: 64 }),
  role: roleEnum("role").default("user").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  lastSignedIn: timestamp("last_signed_in").defaultNow().notNull()
});
var customers = pgTable("customers", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 20 }),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var ticketTypes = pgTable("ticket_types", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  price: integer("price").notNull(),
  // Preço em centavos
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var tickets = pgTable("tickets", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  customerId: integer("customer_id").notNull(),
  ticketTypeId: integer("ticket_type_id").notNull(),
  price: integer("price").notNull(),
  // Preço em centavos
  paymentMethod: paymentMethodEnum("payment_method").notNull(),
  status: statusEnum("status").default("active").notNull(),
  cancelledAt: timestamp("cancelled_at"),
  cancellationReason: text("cancellation_reason"),
  printedAt: timestamp("printed_at"),
  usedAt: timestamp("used_at"),
  qrToken: varchar("qr_token", { length: 255 }).unique(),
  validUntil: timestamp("valid_until"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
var auditLog = pgTable("audit_log", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  action: varchar("action", { length: 100 }).notNull(),
  entityType: varchar("entity_type", { length: 100 }).notNull(),
  entityId: integer("entity_id").notNull(),
  userId: integer("user_id"),
  details: text("details"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// server/db.ts
var { Pool } = pg;
var _db = null;
async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
        // Required for Vercel/Neon Postgres
      });
      _db = drizzle(pool);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}
async function upsertUser(user) {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }
  try {
    const values = {
      openId: user.openId
    };
    const updateSet = {};
    const textFields = ["name", "email", "loginMethod"];
    const assignNullable = (field) => {
      const value = user[field];
      if (value === void 0) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== void 0) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== void 0) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }
    if (!values.lastSignedIn) {
      values.lastSignedIn = /* @__PURE__ */ new Date();
    }
    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = /* @__PURE__ */ new Date();
    }
    await db.insert(users).values(values).onConflictDoUpdate({
      target: users.openId,
      set: updateSet
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}
async function getUserByOpenId(openId) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return void 0;
  }
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function createCustomer(customer) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(customers).values(customer).returning();
  return result;
}
async function listTicketTypes() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.select().from(ticketTypes);
}
async function createTicket(ticket) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(tickets).values(ticket).returning();
  return result;
}
async function getTicketById(id) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select().from(tickets).where(eq(tickets.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}
async function createTicketType(type) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(ticketTypes).values(type).returning();
  return result;
}
async function getTicketByQr(token) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select({
    id: tickets.id,
    customerId: tickets.customerId,
    ticketTypeId: tickets.ticketTypeId,
    ticketTypeName: ticketTypes.name,
    price: tickets.price,
    status: tickets.status,
    qrToken: tickets.qrToken,
    validUntil: tickets.validUntil,
    usedAt: tickets.usedAt,
    customerName: customers.name,
    customerPhone: customers.phone,
    customerEmail: customers.email,
    createdAt: tickets.createdAt
  }).from(tickets).leftJoin(ticketTypes, eq(tickets.ticketTypeId, ticketTypes.id)).leftJoin(customers, eq(tickets.customerId, customers.id)).where(eq(tickets.qrToken, token)).limit(1);
  return result.length > 0 ? result[0] : null;
}
async function listTickets(filters) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select({
    id: tickets.id,
    customerId: tickets.customerId,
    ticketTypeId: tickets.ticketTypeId,
    ticketTypeName: ticketTypes.name,
    price: tickets.price,
    status: tickets.status,
    paymentMethod: tickets.paymentMethod,
    createdAt: tickets.createdAt,
    cancelledAt: tickets.cancelledAt,
    cancellationReason: tickets.cancellationReason,
    printedAt: tickets.printedAt
  }).from(tickets).leftJoin(ticketTypes, eq(tickets.ticketTypeId, ticketTypes.id));
  if (filters?.status) {
    return result.filter((t2) => t2.status === filters.status);
  }
  return result;
}
async function cancelTicket(id, reason) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.update(tickets).set({
    status: "cancelled",
    cancelledAt: /* @__PURE__ */ new Date(),
    cancellationReason: reason
  }).where(eq(tickets.id, id));
  return result;
}
async function markTicketAsPrinted(id) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.update(tickets).set({
    printedAt: /* @__PURE__ */ new Date()
  }).where(eq(tickets.id, id));
  return result;
}
async function markTicketAsUsed(id) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.update(tickets).set({
    status: "used",
    usedAt: /* @__PURE__ */ new Date()
  }).where(eq(tickets.id, id));
  return result;
}
async function logAuditAction(action, entityType, entityId, userId, details) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(auditLog).values({
    action,
    entityType,
    entityId,
    userId,
    details: details ? JSON.stringify(details) : null
  });
  return result;
}
async function getSalesReport(startDate, endDate) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select({
    id: tickets.id,
    customerId: tickets.customerId,
    ticketTypeId: tickets.ticketTypeId,
    ticketTypeName: ticketTypes.name,
    price: tickets.price,
    status: tickets.status,
    paymentMethod: tickets.paymentMethod,
    createdAt: tickets.createdAt,
    cancelledAt: tickets.cancelledAt,
    cancellationReason: tickets.cancellationReason,
    printedAt: tickets.printedAt
  }).from(tickets).leftJoin(ticketTypes, eq(tickets.ticketTypeId, ticketTypes.id)).where(
    sql`${tickets.createdAt} >= ${startDate.toISOString()} AND ${tickets.createdAt} <= ${endDate.toISOString()}`
  );
  return result;
}
async function getSalesStats(startDate, endDate) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  let query = db.select().from(tickets);
  if (startDate && endDate) {
    const allTickets = await db.select().from(tickets).where(
      sql`${tickets.createdAt} >= ${startDate.toISOString()} AND ${tickets.createdAt} <= ${endDate.toISOString()}`
    );
    const stats = {
      totalSales: 0,
      totalRevenue: 0,
      totalCancelled: 0,
      totalUsed: 0,
      totalActive: 0,
      paymentMethods: {
        dinheiro: { count: 0, total: 0 },
        pix: { count: 0, total: 0 },
        cartao: { count: 0, total: 0 }
      }
    };
    allTickets.forEach((ticket) => {
      if (ticket.status !== "cancelled") {
        stats.totalSales++;
        stats.totalRevenue += ticket.price;
        const paymentMethod = ticket.paymentMethod || "dinheiro";
        if (paymentMethod === "dinheiro" || paymentMethod === "pix" || paymentMethod === "cartao") {
          stats.paymentMethods[paymentMethod].count++;
          stats.paymentMethods[paymentMethod].total += ticket.price;
        }
      }
      if (ticket.status === "cancelled") stats.totalCancelled++;
      else if (ticket.status === "used") stats.totalUsed++;
      else if (ticket.status === "active") stats.totalActive++;
    });
    return stats;
  } else {
    const allTickets = await query;
    const stats = {
      totalSales: 0,
      totalRevenue: 0,
      totalCancelled: 0,
      totalUsed: 0,
      totalActive: 0,
      paymentMethods: {
        dinheiro: { count: 0, total: 0 },
        pix: { count: 0, total: 0 },
        cartao: { count: 0, total: 0 }
      }
    };
    allTickets.forEach((ticket) => {
      if (ticket.status !== "cancelled") {
        stats.totalSales++;
        stats.totalRevenue += ticket.price;
        const paymentMethod = ticket.paymentMethod || "dinheiro";
        if (paymentMethod === "dinheiro" || paymentMethod === "pix" || paymentMethod === "cartao") {
          stats.paymentMethods[paymentMethod].count++;
          stats.paymentMethods[paymentMethod].total += ticket.price;
        }
      }
      if (ticket.status === "cancelled") stats.totalCancelled++;
      else if (ticket.status === "used") stats.totalUsed++;
      else if (ticket.status === "active") stats.totalActive++;
    });
    return stats;
  }
}

// server/routers.ts
import { v4 as uuidv4 } from "uuid";
var appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      const res = ctx.res;
      if (res.clearCookie) {
        res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      }
      return {
        success: true
      };
    })
  }),
  access: router({
    info: publicProcedure.input(z2.object({ token: z2.string() })).output(
      z2.object({
        customerName: z2.string().nullable(),
        customerPhone: z2.string().nullable(),
        customerEmail: z2.string().nullable(),
        ticketTypeName: z2.string().nullable(),
        validUntil: z2.date().nullable(),
        qrToken: z2.string(),
        status: z2.string(),
        createdAt: z2.date()
      }).nullable()
    ).query(async ({ input }) => {
      const ticket = await getTicketByQr(input.token);
      if (!ticket) return null;
      return {
        customerName: ticket.customerName,
        customerPhone: ticket.customerPhone,
        customerEmail: ticket.customerEmail,
        ticketTypeName: ticket.ticketTypeName,
        validUntil: ticket.validUntil,
        qrToken: ticket.qrToken,
        status: ticket.status,
        createdAt: ticket.createdAt
      };
    }),
    debugCreate: publicProcedure.input(z2.any()).mutation(async ({ input }) => {
      console.log("[DebugCreate] Hit!", input);
      return { success: true, message: "Server is alive and reachable" };
    }),
    // MOVED FROM ticketTypes due to routing issues
    createProduct: publicProcedure.input(
      z2.object({
        name: z2.string().min(1, "Nome \xE9 obrigat\xF3rio"),
        description: z2.string().optional(),
        price: z2.number().min(0, "Pre\xE7o n\xE3o pode ser negativo")
      })
    ).mutation(async ({ input }) => {
      try {
        console.log("[CreateProduct] Starting...", input);
        const priceInCents = Math.round(input.price * 100);
        const result = await createTicketType({
          name: input.name,
          description: input.description || null,
          price: priceInCents
        });
        return result;
      } catch (error) {
        console.error("CreateProduct Error:", error);
        throw new Error(error.message || "Failed to create product");
      }
    }),
    validate: publicProcedure.input(z2.object({ token: z2.string() })).mutation(async ({ input }) => {
      const ticket = await getTicketByQr(input.token);
      if (!ticket) {
        return { status: "invalid", message: "Ingresso n\xE3o encontrado" };
      }
      if (ticket.status === "used") {
        return {
          status: "used",
          message: "Ingresso j\xE1 utilizado",
          customer: ticket.customerName,
          usedAt: ticket.usedAt
        };
      }
      if (ticket.status !== "active") {
        return { status: "invalid", message: "Ingresso inv\xE1lido ou cancelado" };
      }
      const now = /* @__PURE__ */ new Date();
      if (ticket.validUntil && now > ticket.validUntil) {
        return { status: "expired", message: "QR Code expirado", customer: ticket.customerName };
      }
      return {
        status: "valid",
        ticket: {
          id: ticket.id,
          customerName: ticket.customerName,
          type: ticket.ticketTypeName,
          validUntil: ticket.validUntil
        }
      };
    }),
    checkIn: publicProcedure.input(z2.object({ ticketId: z2.number() })).mutation(async ({ input }) => {
      await markTicketAsUsed(input.ticketId);
      return { success: true };
    })
  }),
  tickets: router({
    list: publicProcedure.input(
      z2.object({
        status: z2.enum(["active", "cancelled", "used"]).optional()
      }).optional()
    ).query(async ({ input }) => {
      const allTickets = await listTickets({ status: input?.status });
      return allTickets.map((ticket) => ({
        ...ticket,
        price: ticket.price / 100
      }));
    }),
    create: publicProcedure.input(
      z2.object({
        customerName: z2.string().min(1),
        customerEmail: z2.string().email().optional(),
        customerPhone: z2.string().optional(),
        ticketTypeId: z2.number().int().positive(),
        paymentMethod: z2.enum(["dinheiro", "pix", "cartao"])
      })
    ).mutation(async ({ input }) => {
      const customerResult = await createCustomer({
        name: input.customerName,
        email: input.customerEmail || null,
        phone: input.customerPhone || null
      });
      const customerId = customerResult[0]?.id;
      if (!customerId) {
        throw new Error("Failed to create customer");
      }
      const ticketTypes2 = await listTicketTypes();
      const ticketType = ticketTypes2.find((t2) => t2.id === input.ticketTypeId);
      if (!ticketType) {
        throw new Error("Ticket type not found");
      }
      const ticketResult = await createTicket({
        customerId,
        ticketTypeId: input.ticketTypeId,
        price: ticketType.price,
        paymentMethod: input.paymentMethod,
        status: "active",
        qrToken: uuidv4(),
        validUntil: addHours(/* @__PURE__ */ new Date(), 12)
      });
      const createdTicket = ticketResult[0];
      if (!createdTicket) throw new Error("Failed to create ticket");
      const ticketId = createdTicket.id;
      await logAuditAction("create", "ticket", ticketId, void 0, {
        customerName: input.customerName,
        ticketType: ticketType.name,
        price: ticketType.price / 100
      });
      return {
        id: ticketId,
        customerId,
        ticketTypeId: input.ticketTypeId,
        price: ticketType.price / 100,
        status: "active",
        createdAt: createdTicket.createdAt,
        qrToken: createdTicket.qrToken,
        // IMPORTANT: Return this for the frontend link
        validUntil: createdTicket.validUntil
      };
    }),
    getById: publicProcedure.input(z2.number().int().positive()).query(async ({ input }) => {
      const ticket = await getTicketById(input);
      if (!ticket) return null;
      return {
        ...ticket,
        price: ticket.price / 100
      };
    }),
    cancel: publicProcedure.input(
      z2.object({
        ticketId: z2.number().int().positive(),
        reason: z2.string().min(1)
      })
    ).mutation(async ({ input }) => {
      const ticket = await getTicketById(input.ticketId);
      if (!ticket) {
        throw new Error("Ticket not found");
      }
      if (ticket.status !== "active") {
        throw new Error("Only active tickets can be cancelled");
      }
      await cancelTicket(input.ticketId, input.reason);
      await logAuditAction("cancel", "ticket", input.ticketId, void 0, {
        reason: input.reason,
        previousStatus: ticket.status
      });
      return { success: true };
    }),
    markPrinted: publicProcedure.input(z2.number().int().positive()).mutation(async ({ input }) => {
      const ticket = await getTicketById(input);
      if (!ticket) {
        throw new Error("Ticket not found");
      }
      await markTicketAsPrinted(input);
      await logAuditAction("print", "ticket", input, void 0, {
        ticketId: ticket.id
      });
      return { success: true };
    }),
    markUsed: publicProcedure.input(z2.number().int().positive()).mutation(async ({ input }) => {
      const ticket = await getTicketById(input);
      if (!ticket) {
        throw new Error("Ticket not found");
      }
      await markTicketAsUsed(input);
      await logAuditAction("use", "ticket", input, void 0, {
        ticketId: ticket.id
      });
      return { success: true };
    })
  }),
  ticketTypes: router({
    list: publicProcedure.query(async () => {
      const types = await listTicketTypes();
      return types.map((t2) => ({
        ...t2,
        price: t2.price / 100
      }));
    }),
    create: publicProcedure.input(
      z2.object({
        name: z2.string().min(1, "Nome \xE9 obrigat\xF3rio"),
        description: z2.string().optional(),
        price: z2.number().min(0, "Pre\xE7o n\xE3o pode ser negativo")
      })
    ).mutation(async ({ input }) => {
      console.log("[CreateProduct - MOCK MODE] Input:", input);
      return {
        id: Math.floor(Math.random() * 1e4),
        name: input.name,
        description: input.description,
        price: input.price
      };
    }),
    delete: publicProcedure.input(z2.number().int().positive()).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new Error("Database not available");
      }
      await db.delete(ticketTypes).where(eq2(ticketTypes.id, input));
      return { success: true };
    })
  }),
  reports: router({
    sales: publicProcedure.input(
      z2.object({
        startDate: z2.date(),
        endDate: z2.date()
      })
    ).query(async ({ input }) => {
      const report = await getSalesReport(input.startDate, input.endDate);
      return report.map((ticket) => ({
        ...ticket,
        price: ticket.price / 100
      }));
    }),
    stats: publicProcedure.input(
      z2.object({
        startDate: z2.date().optional(),
        endDate: z2.date().optional()
      }).optional()
    ).query(async ({ input }) => {
      const stats = await getSalesStats(input?.startDate, input?.endDate);
      return {
        ...stats,
        totalRevenue: stats.totalRevenue / 100,
        paymentMethods: {
          dinheiro: {
            count: stats.paymentMethods.dinheiro.count,
            total: stats.paymentMethods.dinheiro.total / 100
          },
          pix: {
            count: stats.paymentMethods.pix.count,
            total: stats.paymentMethods.pix.total / 100
          },
          cartao: {
            count: stats.paymentMethods.cartao.count,
            total: stats.paymentMethods.cartao.total / 100
          }
        }
      };
    })
  })
});

// shared/_core/errors.ts
var HttpError = class extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = "HttpError";
  }
};
var ForbiddenError = (msg) => new HttpError(403, msg);

// server/_core/sdk.ts
import axios from "axios";
import { parse as parseCookieHeader } from "cookie";
import { SignJWT, jwtVerify } from "jose";
var isNonEmptyString2 = (value) => typeof value === "string" && value.length > 0;
var EXCHANGE_TOKEN_PATH = `/webdev.v1.WebDevAuthPublicService/ExchangeToken`;
var GET_USER_INFO_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfo`;
var GET_USER_INFO_WITH_JWT_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfoWithJwt`;
var OAuthService = class {
  constructor(client) {
    this.client = client;
    console.log("[OAuth] Initialized with baseURL:", ENV.oAuthServerUrl);
    if (!ENV.oAuthServerUrl) {
      console.error(
        "[OAuth] ERROR: OAUTH_SERVER_URL is not configured! Set OAUTH_SERVER_URL environment variable."
      );
    }
  }
  decodeState(state) {
    const redirectUri = atob(state);
    return redirectUri;
  }
  async getTokenByCode(code, state) {
    const payload = {
      clientId: ENV.appId,
      grantType: "authorization_code",
      code,
      redirectUri: this.decodeState(state)
    };
    const { data } = await this.client.post(
      EXCHANGE_TOKEN_PATH,
      payload
    );
    return data;
  }
  async getUserInfoByToken(token) {
    const { data } = await this.client.post(
      GET_USER_INFO_PATH,
      {
        accessToken: token.accessToken
      }
    );
    return data;
  }
};
var createOAuthHttpClient = () => axios.create({
  baseURL: ENV.oAuthServerUrl,
  timeout: AXIOS_TIMEOUT_MS
});
var SDKServer = class {
  client;
  oauthService;
  constructor(client = createOAuthHttpClient()) {
    this.client = client;
    this.oauthService = new OAuthService(this.client);
  }
  deriveLoginMethod(platforms, fallback) {
    if (fallback && fallback.length > 0) return fallback;
    if (!Array.isArray(platforms) || platforms.length === 0) return null;
    const set = new Set(
      platforms.filter((p) => typeof p === "string")
    );
    if (set.has("REGISTERED_PLATFORM_EMAIL")) return "email";
    if (set.has("REGISTERED_PLATFORM_GOOGLE")) return "google";
    if (set.has("REGISTERED_PLATFORM_APPLE")) return "apple";
    if (set.has("REGISTERED_PLATFORM_MICROSOFT") || set.has("REGISTERED_PLATFORM_AZURE"))
      return "microsoft";
    if (set.has("REGISTERED_PLATFORM_GITHUB")) return "github";
    const first = Array.from(set)[0];
    return first ? first.toLowerCase() : null;
  }
  /**
   * Exchange OAuth authorization code for access token
   * @example
   * const tokenResponse = await sdk.exchangeCodeForToken(code, state);
   */
  async exchangeCodeForToken(code, state) {
    return this.oauthService.getTokenByCode(code, state);
  }
  /**
   * Get user information using access token
   * @example
   * const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
   */
  async getUserInfo(accessToken) {
    const data = await this.oauthService.getUserInfoByToken({
      accessToken
    });
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  parseCookies(cookieHeader) {
    if (!cookieHeader) {
      return /* @__PURE__ */ new Map();
    }
    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }
  getSessionSecret() {
    const secret = ENV.cookieSecret;
    return new TextEncoder().encode(secret);
  }
  /**
   * Create a session token for a Manus user openId
   * @example
   * const sessionToken = await sdk.createSessionToken(userInfo.openId);
   */
  async createSessionToken(openId, options = {}) {
    return this.signSession(
      {
        openId,
        appId: ENV.appId,
        name: options.name || ""
      },
      options
    );
  }
  async signSession(payload, options = {}) {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1e3);
    const secretKey = this.getSessionSecret();
    return new SignJWT({
      openId: payload.openId,
      appId: payload.appId,
      name: payload.name
    }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setExpirationTime(expirationSeconds).sign(secretKey);
  }
  async verifySession(cookieValue) {
    if (!cookieValue) {
      console.warn("[Auth] Missing session cookie");
      return null;
    }
    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, {
        algorithms: ["HS256"]
      });
      const { openId, appId, name } = payload;
      if (!isNonEmptyString2(openId) || !isNonEmptyString2(appId) || !isNonEmptyString2(name)) {
        console.warn("[Auth] Session payload missing required fields");
        return null;
      }
      return {
        openId,
        appId,
        name
      };
    } catch (error) {
      console.warn("[Auth] Session verification failed", String(error));
      return null;
    }
  }
  async getUserInfoWithJwt(jwtToken) {
    const payload = {
      jwtToken,
      projectId: ENV.appId
    };
    const { data } = await this.client.post(
      GET_USER_INFO_WITH_JWT_PATH,
      payload
    );
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  async authenticateRequest(req) {
    const cookies = this.parseCookies(req.headers?.cookie || "");
    const sessionCookie = cookies.get(COOKIE_NAME);
    const session = await this.verifySession(sessionCookie);
    if (!session) {
      throw ForbiddenError("Invalid session cookie");
    }
    const sessionUserId = session.openId;
    const signedInAt = /* @__PURE__ */ new Date();
    let user = await getUserByOpenId(sessionUserId);
    if (!user) {
      try {
        const userInfo = await this.getUserInfoWithJwt(sessionCookie ?? "");
        await upsertUser({
          openId: userInfo.openId,
          name: userInfo.name || null,
          email: userInfo.email ?? null,
          loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
          lastSignedIn: signedInAt
        });
        user = await getUserByOpenId(userInfo.openId);
      } catch (error) {
        console.error("[Auth] Failed to sync user from OAuth:", error);
        throw ForbiddenError("Failed to sync user info");
      }
    }
    if (!user) {
      throw ForbiddenError("User not found");
    }
    await upsertUser({
      openId: user.openId,
      lastSignedIn: signedInAt
    });
    return user;
  }
};
var sdk = new SDKServer();

// server/_core/context.ts
async function createContext(opts) {
  let user = null;
  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    user = null;
  }
  return {
    req: opts.req,
    res: opts.res,
    user
  };
}

// api/index.ts
import { sql as sql2 } from "drizzle-orm";
var app = express();
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
});
app.get("/api/debug-db-check", async (req, res) => {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database not initialized");
    const result = await db.execute(sql2`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`);
    let schemaInfo = null;
    try {
      schemaInfo = await db.execute(sql2`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'ticket_types'`);
    } catch (e) {
      schemaInfo = "Could not describe table (it may not exist)";
    }
    res.json({
      success: true,
      tables: result[0],
      // Postgres returns rows in the rows property, but drizzle execute might return differently depending on driver. 
      // node-postgres returns { rows: [], ... }. Drizzle's execute with node-postgres returns query result.
      // Let's just return the whole result to inspect.
      ticketTypesSchema: schemaInfo
    });
  } catch (e) {
    res.status(500).json({ error: e.message, stack: e.stack });
  }
});
app.post("/api/debug-create", (req, res) => {
  try {
    console.log("[RawDebug] Hit (FULL RESTORE)");
    res.json({
      success: true,
      message: "Raw endpoint worked (FULL RESTORE) - v" + (/* @__PURE__ */ new Date()).getTime(),
      received: req.body
    });
  } catch (e) {
    console.error("[RawDebug] Error:", e);
    res.status(500).json({ error: e.message });
  }
});
app.get("/api/debug-tickets", async (req, res) => {
  try {
    const db = await getDb();
    if (!db) throw new Error("DB not init");
    const result = await db.execute(sql2`SELECT * FROM "tickets" ORDER BY id DESC`);
    res.json({ count: result.rowCount || 0, tickets: result.rows || [] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.get("/api/debug-migrate", async (req, res) => {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database not initialized");
    console.log("[Migration] Starting...");
    await db.execute(sql2`CREATE TYPE "public"."payment_method" AS ENUM('dinheiro', 'pix', 'cartao')`);
    await db.execute(sql2`CREATE TYPE "public"."role" AS ENUM('user', 'admin')`);
    await db.execute(sql2`CREATE TYPE "public"."status" AS ENUM('active', 'cancelled', 'used')`);
    await db.execute(sql2`
      CREATE TABLE IF NOT EXISTS "audit_log" (
        "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        "action" varchar(100) NOT NULL,
        "entity_type" varchar(100) NOT NULL,
        "entity_id" integer NOT NULL,
        "user_id" integer,
        "details" text,
        "created_at" timestamp DEFAULT now() NOT NULL
      )
    `);
    await db.execute(sql2`
      CREATE TABLE IF NOT EXISTS "customers" (
        "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        "name" varchar(255) NOT NULL,
        "email" varchar(320),
        "phone" varchar(20),
        "created_at" timestamp DEFAULT now() NOT NULL
      )
    `);
    await db.execute(sql2`
      CREATE TABLE IF NOT EXISTS "ticket_types" (
        "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        "name" varchar(255) NOT NULL,
        "description" text,
        "price" integer NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL
      )
    `);
    await db.execute(sql2`
      CREATE TABLE IF NOT EXISTS "tickets" (
        "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        "customer_id" integer NOT NULL,
        "ticket_type_id" integer NOT NULL,
        "price" integer NOT NULL,
        "payment_method" "payment_method" NOT NULL,
        "status" "status" DEFAULT 'active' NOT NULL,
        "cancelled_at" timestamp,
        "cancellation_reason" text,
        "printed_at" timestamp,
        "used_at" timestamp,
        "qr_token" varchar(255),
        "valid_until" timestamp,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL,
        CONSTRAINT "tickets_qr_token_unique" UNIQUE("qr_token")
      )
    `);
    await db.execute(sql2`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        "open_id" varchar(64) NOT NULL,
        "name" text,
        "email" varchar(320),
        "login_method" varchar(64),
        "role" "role" DEFAULT 'user' NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL,
        "last_signed_in" timestamp DEFAULT now() NOT NULL,
        CONSTRAINT "users_open_id_unique" UNIQUE("open_id")
      )
    `);
    res.json({ success: true, message: "Migration executed successfully" });
  } catch (e) {
    console.error("[Migration] Error:", e);
    res.status(200).json({ error: e.message, warning: "Some parts might have already run" });
  }
});
app.all("/api/trpc/*", createExpressMiddleware({
  router: appRouter,
  createContext
}));
app.all("/api/*", (req, res) => {
  res.status(404).json({ error: "API endpoint not found" });
});
var index_default = app;
export {
  index_default as default
};
