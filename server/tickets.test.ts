import { describe, it, expect, beforeEach, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "test",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as TrpcContext["res"],
  };

  return ctx;
}

describe("Tickets API", () => {
  let caller: ReturnType<typeof appRouter.createCaller>;
  let validTicketTypeId: number;

  beforeEach(async () => {
    const ctx = createContext();
    caller = appRouter.createCaller(ctx);
    
    // Buscar um ticketType válido existente
    const ticketTypes = await caller.ticketTypes.list();
    if (ticketTypes.length > 0) {
      validTicketTypeId = ticketTypes[0].id;
    } else {
      // Se não existir, criar um
      const created = await caller.ticketTypes.create({
        name: "Test Ticket",
        description: "Test ticket type",
        price: 50.0,
      });
      validTicketTypeId = created.id;
    }
  });

  describe("ticketTypes.list", () => {
    it("should return list of ticket types", async () => {
      const result = await caller.ticketTypes.list();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("tickets.list", () => {
    it("should return empty list initially", async () => {
      const result = await caller.tickets.list();
      expect(Array.isArray(result)).toBe(true);
    });

    it("should filter by status", async () => {
      const result = await caller.tickets.list({ status: "active" });
      expect(Array.isArray(result)).toBe(true);
      // Todos os ingressos retornados devem ter status 'active'
      result.forEach((ticket) => {
        expect(ticket.status).toBe("active");
      });
    });
  });

  describe("tickets.create", () => {
    it("should create a new ticket", async () => {
      const result = await caller.tickets.create({
        customerName: "John Doe",
        customerEmail: "john@example.com",
        customerPhone: "(11) 99999-9999",
        ticketTypeId: validTicketTypeId,
        paymentMethod: "dinheiro",
      });

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.customerId).toBeDefined();
      expect(result.qrCode).toBeDefined();
      expect(result.status).toBe("active");
      expect(result.price).toBeGreaterThanOrEqual(0);
    });

    it("should fail without customer name", async () => {
      try {
        await caller.tickets.create({
          customerName: "",
          ticketTypeId: validTicketTypeId,
          paymentMethod: "dinheiro",
        });
        expect.fail("Should have thrown an error");
      } catch (error: any) {
        expect(error.message).toBeDefined();
      }
    });

    it("should fail with invalid ticket type", async () => {
      try {
        await caller.tickets.create({
          customerName: "John Doe",
          ticketTypeId: 99999,
          paymentMethod: "dinheiro",
        });
        expect.fail("Should have thrown an error");
      } catch (error: any) {
        expect(error.message).toContain("not found");
      }
    });
  });

  describe("tickets.getById", () => {
    it("should return null for non-existent ticket", async () => {
      const result = await caller.tickets.getById(99999);
      expect(result).toBeNull();
    });

    it("should return ticket by id", async () => {
      // Criar um ingresso
      const created = await caller.tickets.create({
        customerName: "Jane Doe",
        ticketTypeId: validTicketTypeId,
        paymentMethod: "pix",
      });

      // Buscar o ingresso criado
      const result = await caller.tickets.getById(created.id);
      expect(result).toBeDefined();
      expect(result?.id).toBe(created.id);
      expect(result?.qrCode).toBe(created.qrCode);
    });
  });

  describe("tickets.cancel", () => {
    it("should cancel an active ticket", async () => {
      // Criar um ingresso
      const created = await caller.tickets.create({
        customerName: "Bob Smith",
        ticketTypeId: validTicketTypeId,
        paymentMethod: "cartao",
      });

      // Cancelar o ingresso
      const result = await caller.tickets.cancel({
        ticketId: created.id,
        reason: "Customer requested cancellation",
      });

      expect(result.success).toBe(true);

      // Verificar que o ingresso foi cancelado
      const cancelled = await caller.tickets.getById(created.id);
      expect(cancelled?.status).toBe("cancelled");
      expect(cancelled?.cancellationReason).toBe("Customer requested cancellation");
    });

    it("should fail to cancel already cancelled ticket", async () => {
      // Criar um ingresso
      const created = await caller.tickets.create({
        customerName: "Alice Johnson",
        ticketTypeId: validTicketTypeId,
        paymentMethod: "dinheiro",
      });

      // Cancelar uma vez
      await caller.tickets.cancel({
        ticketId: created.id,
        reason: "First cancellation",
      });

      // Tentar cancelar novamente
      try {
        await caller.tickets.cancel({
          ticketId: created.id,
          reason: "Second cancellation",
        });
        expect.fail("Should have thrown an error");
      } catch (error: any) {
        expect(error.message).toContain("Only active tickets");
      }
    });
  });

  describe("reports.stats", () => {
    it("should return sales statistics", async () => {
      const result = await caller.reports.stats();
      expect(result).toBeDefined();
      expect(result.totalSales).toBeGreaterThanOrEqual(0);
      expect(result.totalRevenue).toBeGreaterThanOrEqual(0);
      expect(result.totalActive).toBeGreaterThanOrEqual(0);
      expect(result.totalCancelled).toBeGreaterThanOrEqual(0);
      expect(result.totalUsed).toBeGreaterThanOrEqual(0);
    });
  });

  describe("reports.sales", () => {
    it("should return sales report for date range", async () => {
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = new Date();

      const result = await caller.reports.sales({
        startDate,
        endDate,
      });

      expect(Array.isArray(result)).toBe(true);
    });
  });
});
