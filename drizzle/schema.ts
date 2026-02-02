/**
 * Schema PostgreSQL para deploy standalone
 * Adaptado do schema MySQL original
 */

import { integer, pgEnum, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

// Enums
export const roleEnum = pgEnum("role", ["user", "admin"]);
export const paymentMethodEnum = pgEnum("payment_method", ["dinheiro", "pix", "cartao"]);
export const statusEnum = pgEnum("status", ["active", "cancelled", "used"]);

/**
 * Core user table backing auth flow.
 */
export const users = pgTable("users", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  openId: varchar("open_id", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("login_method", { length: 64 }),
  role: roleEnum("role").default("user").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  lastSignedIn: timestamp("last_signed_in").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Tabela de clientes que compraram ingressos
 */
export const customers = pgTable("customers", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 20 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = typeof customers.$inferInsert;

/**
 * Tabela de tipos de ingressos
 */
export const ticketTypes = pgTable("ticket_types", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  price: integer("price").notNull(), // Preço em centavos
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type TicketType = typeof ticketTypes.$inferSelect;
export type InsertTicketType = typeof ticketTypes.$inferInsert;

/**
 * Tabela de vendas de ingressos
 */
export const tickets = pgTable("tickets", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  customerId: integer("customer_id").notNull(),
  ticketTypeId: integer("ticket_type_id").notNull(),
  price: integer("price").notNull(), // Preço em centavos
  paymentMethod: paymentMethodEnum("payment_method").notNull(),
  status: statusEnum("status").default("active").notNull(),
  cancelledAt: timestamp("cancelled_at"),
  cancellationReason: text("cancellation_reason"),
  printedAt: timestamp("printed_at"),
  usedAt: timestamp("used_at"),
  qrToken: varchar("qr_token", { length: 255 }).unique(),
  validUntil: timestamp("valid_until"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Ticket = typeof tickets.$inferSelect;
export type InsertTicket = typeof tickets.$inferInsert;

/**
 * Tabela de auditoria para rastreamento de todas as operações
 */
export const auditLog = pgTable("audit_log", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  action: varchar("action", { length: 100 }).notNull(),
  entityType: varchar("entity_type", { length: 100 }).notNull(),
  entityId: integer("entity_id").notNull(),
  userId: integer("user_id"),
  details: text("details"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type AuditLog = typeof auditLog.$inferSelect;
export type InsertAuditLog = typeof auditLog.$inferInsert;