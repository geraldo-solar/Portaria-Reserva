import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, customers, ticketTypes, tickets, auditLog, InsertCustomer, InsertTicket, InsertAuditLog, InsertTicketType } from "../drizzle/schema";
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

/**
 * Criar novo cliente
 */
export async function createCustomer(customer: InsertCustomer) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(customers).values(customer);
  return result;
}

/**
 * Obter cliente por ID
 */
export async function getCustomerById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.select().from(customers).where(eq(customers.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

/**
 * Listar todos os tipos de ingressos
 */
export async function listTicketTypes() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.select().from(ticketTypes);
}

/**
 * Criar novo ingresso
 */
export async function createTicket(ticket: InsertTicket) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(tickets).values(ticket);
  return result;
}

/**
 * Obter ingresso por ID
 */
export async function getTicketById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.select().from(tickets).where(eq(tickets.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

/**
 * Criar novo tipo de ingresso
 */
export async function createTicketType(type: InsertTicketType) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(ticketTypes).values(type);
  return result;
}

/**
 * Obter ingresso por QR Token
 */
export async function getTicketByQr(token: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select({
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
      createdAt: tickets.createdAt,
    })
    .from(tickets)
    .leftJoin(ticketTypes, eq(tickets.ticketTypeId, ticketTypes.id))
    .leftJoin(customers, eq(tickets.customerId, customers.id))
    .where(eq(tickets.qrToken, token))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}



/**
 * Listar todos os ingressos com filtros opcionais
 */
export async function listTickets(filters?: {
  status?: string;
  startDate?: Date;
  endDate?: Date;
  customerId?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Fazer JOIN com ticketTypes para obter o nome do produto
  const result = await db
    .select({
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
      printedAt: tickets.printedAt,
    })
    .from(tickets)
    .leftJoin(ticketTypes, eq(tickets.ticketTypeId, ticketTypes.id));

  if (filters?.status) {
    return result.filter(t => t.status === filters.status);
  }

  return result;
}

/**
 * Cancelar ingresso
 */
export async function cancelTicket(id: number, reason: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .update(tickets)
    .set({
      status: "cancelled" as any,
      cancelledAt: new Date(),
      cancellationReason: reason,
    })
    .where(eq(tickets.id, id));

  return result;
}

/**
 * Registrar impressão de ingresso
 */
export async function markTicketAsPrinted(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .update(tickets)
    .set({
      printedAt: new Date(),
    })
    .where(eq(tickets.id, id));

  return result;
}

/**
 * Marcar ingresso como utilizado (Check-in)
 */
export async function markTicketAsUsed(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .update(tickets)
    .set({
      status: "used" as any,
      usedAt: new Date(),
    })
    .where(eq(tickets.id, id));

  return result;
}

/**
 * Registrar ação na auditoria
 */
export async function logAuditAction(
  action: string,
  entityType: string,
  entityId: number,
  userId?: number,
  details?: Record<string, any>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(auditLog).values({
    action,
    entityType,
    entityId,
    userId,
    details: details ? JSON.stringify(details) : null,
  });

  return result;
}

/**
 * Obter relatório de vendas por período
 */
export async function getSalesReport(startDate: Date, endDate: Date) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Retorna todos os ingressos criados no período com nome do produto
  const result = await db
    .select({
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
      printedAt: tickets.printedAt,
    })
    .from(tickets)
    .leftJoin(ticketTypes, eq(tickets.ticketTypeId, ticketTypes.id))
    .where(
      sql`${tickets.createdAt} >= ${startDate.toISOString()} AND ${tickets.createdAt} <= ${endDate.toISOString()}`
    );

  return result;
}

/**
 * Obter estatísticas de vendas
 */
export async function getSalesStats(startDate?: Date, endDate?: Date) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Buscar ingressos filtrados por data na query SQL
  let query = db.select().from(tickets);

  // Aplicar filtro de data na query SQL se fornecido
  if (startDate && endDate) {
    const allTickets = await db
      .select()
      .from(tickets)
      .where(
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
        cartao: { count: 0, total: 0 },
      },
    };

    allTickets.forEach((ticket) => {
      // Apenas contar vendas ativas (não canceladas)
      if (ticket.status !== "cancelled") {
        stats.totalSales++;
        stats.totalRevenue += ticket.price;

        // Contar por método de pagamento
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
    // Sem filtro de data, buscar todos
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
        cartao: { count: 0, total: 0 },
      },
    };

    allTickets.forEach((ticket) => {
      // Apenas contar vendas ativas (não canceladas)
      if (ticket.status !== "cancelled") {
        stats.totalSales++;
        stats.totalRevenue += ticket.price;

        // Contar por método de pagamento
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


