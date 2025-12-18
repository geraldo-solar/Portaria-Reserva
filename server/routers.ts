import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { eq } from "drizzle-orm";
import {
  createCustomer,
  listTicketTypes,
  createTicket,
  getTicketById,
  listTickets,
  cancelTicket,
  markTicketAsPrinted,
  markTicketAsUsed,
  logAuditAction,
  getSalesReport,
  getSalesStats,
} from "./db";
import { v4 as uuidv4 } from "uuid";
import { getDb } from "./db";
import { ticketTypes } from "../drizzle/schema";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      // @ts-ignore - Vercel serverless compatibility
      if (ctx.res.clearCookie) {
        ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      }
      return {
        success: true,
      } as const;
    }),
  }),

  tickets: router({
    list: publicProcedure
      .input(
        z.object({
          status: z.enum(["active", "cancelled", "used"]).optional(),
        }).optional()
      )
      .query(async ({ input }) => {
        const allTickets = await listTickets({ status: input?.status });
        return allTickets.map((ticket) => ({
          ...ticket,
          price: ticket.price / 100,
        }));
      }),

    create: publicProcedure
      .input(
        z.object({
          customerName: z.string().min(1),
          customerEmail: z.string().email().optional(),
          customerPhone: z.string().optional(),
          ticketTypeId: z.number().int().positive(),
          paymentMethod: z.enum(["dinheiro", "pix", "cartao"]),
        })
      )
      .mutation(async ({ input }) => {
        const customerResult = await createCustomer({
          name: input.customerName,
          email: input.customerEmail || null,
          phone: input.customerPhone || null,
        });

        const customerId = (customerResult[0]?.insertId as number) || 1;

        const ticketTypes = await listTicketTypes();
        const ticketType = ticketTypes.find((t) => t.id === input.ticketTypeId);

        if (!ticketType) {
          throw new Error("Ticket type not found");
        }

        const ticketResult = await createTicket({
          customerId,
          ticketTypeId: input.ticketTypeId,
          price: ticketType.price,
          paymentMethod: input.paymentMethod,
          status: "active",
        });

        const ticketId = (ticketResult[0]?.insertId as number) || 1;

        await logAuditAction("create", "ticket", ticketId, undefined, {
          customerName: input.customerName,
          ticketType: ticketType.name,
          price: ticketType.price / 100,
        });

        return {
          id: ticketId,
          customerId,
          ticketTypeId: input.ticketTypeId,
          price: ticketType.price / 100,
          status: "active",
          createdAt: new Date(),
        };
      }),

    getById: publicProcedure
      .input(z.number().int().positive())
      .query(async ({ input }) => {
        const ticket = await getTicketById(input);
        if (!ticket) return null;
        return {
          ...ticket,
          price: ticket.price / 100,
        };
      }),

    cancel: publicProcedure
      .input(
        z.object({
          ticketId: z.number().int().positive(),
          reason: z.string().min(1),
        })
      )
      .mutation(async ({ input }) => {
        const ticket = await getTicketById(input.ticketId);
        if (!ticket) {
          throw new Error("Ticket not found");
        }

        if (ticket.status !== "active") {
          throw new Error("Only active tickets can be cancelled");
        }

        await cancelTicket(input.ticketId, input.reason);

        await logAuditAction("cancel", "ticket", input.ticketId, undefined, {
          reason: input.reason,
          previousStatus: ticket.status,
        });

        return { success: true };
      }),

    markPrinted: publicProcedure
      .input(z.number().int().positive())
      .mutation(async ({ input }) => {
        const ticket = await getTicketById(input);
        if (!ticket) {
          throw new Error("Ticket not found");
        }

        await markTicketAsPrinted(input);

        await logAuditAction("print", "ticket", input, undefined, {
          ticketId: ticket.id,
        });

        return { success: true };
      }),

    markUsed: publicProcedure
      .input(z.number().int().positive())
      .mutation(async ({ input }) => {
        const ticket = await getTicketById(input);
        if (!ticket) {
          throw new Error("Ticket not found");
        }

        await markTicketAsUsed(input);

        await logAuditAction("use", "ticket", input, undefined, {
          ticketId: ticket.id,
        });

        return { success: true };
      }),
  }),

  ticketTypes: router({
    list: publicProcedure.query(async () => {
      const types = await listTicketTypes();
      return types.map((t) => ({
        ...t,
        price: t.price / 100,
      }));
    }),

    create: publicProcedure
      .input(
        z.object({
          name: z.string().min(1, "Nome é obrigatório"),
          description: z.string().optional(),
          price: z.number().min(0, "Preço não pode ser negativo"),
        })
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) {
          throw new Error("Database not available");
        }

        const priceInCents = Math.round(input.price * 100);

        const result = await db.insert(ticketTypes).values({
          name: input.name,
          description: input.description || null,
          price: priceInCents,
        });

        const newType = await listTicketTypes();
        const created = newType[newType.length - 1];

        return {
          id: created.id,
          name: created.name,
          description: created.description,
          price: created.price / 100,
        };
      }),

    delete: publicProcedure
      .input(z.number().int().positive())
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) {
          throw new Error("Database not available");
        }

        await db.delete(ticketTypes).where(eq(ticketTypes.id, input));

        return { success: true };
      }),
  }),

  reports: router({
    sales: publicProcedure
      .input(
        z.object({
          startDate: z.date(),
          endDate: z.date(),
        })
      )
      .query(async ({ input }) => {
        const report = await getSalesReport(input.startDate, input.endDate);
        return report.map((ticket) => ({
          ...ticket,
          price: ticket.price / 100,
        }));
      }),

    stats: publicProcedure
      .input(
        z.object({
          startDate: z.date().optional(),
          endDate: z.date().optional(),
        }).optional()
      )
      .query(async ({ input }) => {
        const stats = await getSalesStats(input?.startDate, input?.endDate);
        return {
          ...stats,
          totalRevenue: stats.totalRevenue / 100,
          paymentMethods: {
            dinheiro: {
              count: stats.paymentMethods.dinheiro.count,
              total: stats.paymentMethods.dinheiro.total / 100,
            },
            pix: {
              count: stats.paymentMethods.pix.count,
              total: stats.paymentMethods.pix.total / 100,
            },
            cartao: {
              count: stats.paymentMethods.cartao.count,
              total: stats.paymentMethods.cartao.total / 100,
            },
          },
        };
      }),
  }),
});

export type AppRouter = typeof appRouter;
