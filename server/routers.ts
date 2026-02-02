import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { addHours } from "date-fns";
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
  getTicketByQr,
  createTicketType,
} from "./db";
import { v4 as uuidv4 } from "uuid";
import { getDb } from "./db";
import { ticketTypes } from "../drizzle/schema";
import { createBrevoContact } from "./services/brevo";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      const res = (ctx.res as unknown) as any;
      // @ts-ignore
      if (res.clearCookie) {
        // @ts-ignore
        res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      }
      return {
        success: true,
      } as const;
    }),
  }),

  access: router({
    info: publicProcedure
      .input(z.object({ token: z.string() }))
      .output(
        z.object({
          customerName: z.string().nullable(),
          customerPhone: z.string().nullable(),
          customerEmail: z.string().nullable(),
          ticketTypeName: z.string().nullable(),
          validUntil: z.date().nullable(),
          qrToken: z.string(),
          status: z.string(),
          createdAt: z.date(),
        }).nullable()
      )
      .query(async ({ input }) => {
        const ticket = await getTicketByQr(input.token) as any;
        if (!ticket) return null;

        return {
          customerName: ticket.customerName,
          customerPhone: ticket.customerPhone,
          customerEmail: ticket.customerEmail,
          ticketTypeName: ticket.ticketTypeName,
          validUntil: ticket.validUntil,
          qrToken: ticket.qrToken,
          status: ticket.status,
          createdAt: ticket.createdAt,
        };
      }),

    debugCreate: publicProcedure
      .input(z.any())
      .mutation(async ({ input }) => {
        console.log("[DebugCreate] Hit!", input);
        return { success: true, message: "Server is alive and reachable" };
      }),

    // MOVED FROM ticketTypes due to routing issues
    createProduct: publicProcedure
      .input(
        z.object({
          name: z.string().min(1, "Nome é obrigatório"),
          description: z.string().optional(),
          price: z.number().min(0, "Preço não pode ser negativo"),
        })
      )
      .mutation(async ({ input }) => {
        try {
          console.log("[CreateProduct] Starting...", input);
          // REAL DB MODE
          const priceInCents = Math.round(input.price * 100);

          const result = await createTicketType({
            name: input.name,
            description: input.description || null,
            price: priceInCents,
          });

          return result;
        } catch (error: any) {
          console.error("CreateProduct Error:", error);
          throw new Error(error.message || "Failed to create product");
        }
      }),

    validate: publicProcedure
      .input(z.object({ token: z.string() }))
      .mutation(async ({ input }) => {
        const ticket = await getTicketByQr(input.token);

        if (!ticket) {
          return { status: "invalid", message: "Ingresso não encontrado" } as const;
        }

        if (ticket.status === 'used') {
          return {
            status: "used",
            message: "Ingresso já utilizado",
            customer: ticket.customerName,
            usedAt: ticket.usedAt
          } as const;
        }

        if (ticket.status !== "active") {
          return { status: "invalid", message: "Ingresso inválido ou cancelado" } as const;
        }

        const now = new Date();
        if (ticket.validUntil && now > ticket.validUntil) {
          return { status: "expired", message: "QR Code expirado", customer: ticket.customerName } as const;
        }

        return {
          status: "valid",
          ticket: {
            id: ticket.id,
            customerName: ticket.customerName,
            type: ticket.ticketTypeName,
            validUntil: ticket.validUntil
          }
        } as const;
      }),

    checkIn: publicProcedure
      .input(z.object({ ticketId: z.number() }))
      .mutation(async ({ input }) => {
        await markTicketAsUsed(input.ticketId);
        return { success: true };
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
        const allTickets = await listTickets({ status: input?.status }) as any[];
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

        const customerId = customerResult[0]?.id;

        if (!customerId) {
          throw new Error("Failed to create customer");
        }

        const ticketTypes = await listTicketTypes() as any[];
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
          qrToken: uuidv4(),
          validUntil: addHours(new Date(), 12),
        });

        // Postgres returns the row directly
        const createdTicket = ticketResult[0] as any;
        if (!createdTicket) throw new Error("Failed to create ticket");

        const ticketId = createdTicket.id;

        await logAuditAction("create", "ticket", ticketId, undefined, {
          customerName: input.customerName,
          ticketType: ticketType.name,
          price: ticketType.price / 100,
        });

        if (input.customerEmail && input.customerPhone) {
          // Fire and forget Brevo sync
          createBrevoContact(input.customerName, input.customerEmail, input.customerPhone)
            .catch(err => console.error("Brevo sync failed:", err));
        }

        return {
          id: ticketId,
          customerId,
          ticketTypeId: input.ticketTypeId,
          price: ticketType.price / 100,
          status: "active",
          createdAt: createdTicket.createdAt,
          qrToken: createdTicket.qrToken, // IMPORTANT: Return this for the frontend link
          validUntil: createdTicket.validUntil
        };
      }),

    getById: publicProcedure
      .input(z.number().int().positive())
      .query(async ({ input }) => {
        const ticket = await getTicketById(input) as any;
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
        const ticket = await getTicketById(input.ticketId) as any;
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
        const ticket = await getTicketById(input) as any;
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
        const ticket = await getTicketById(input) as any;
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
      const types = await listTicketTypes() as any[];
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
        console.log("[CreateProduct - MOCK MODE] Input:", input);

        // MOCK RETURN to isolate DB crash
        return {
          id: Math.floor(Math.random() * 10000),
          name: input.name,
          description: input.description,
          price: input.price
        };
      }),

    delete: publicProcedure
      .input(z.number().int().positive())
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) {
          throw new Error("Database not available");
        }

        // @ts-ignore
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
        const report = await getSalesReport(input.startDate, input.endDate) as any[];
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
        const stats = await getSalesStats(input?.startDate, input?.endDate) as any;
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
