import { z } from "zod";
import { notifyOwner } from "./notification";
import { adminProcedure, publicProcedure, router } from "./trpc";

export const systemRouter = router({
  health: publicProcedure
    .input(
      z.object({
        timestamp: z.number().min(0, "timestamp cannot be negative"),
      })
    )
    .query(() => ({
      ok: true,
    })),

  notifyOwner: adminProcedure
    .input(
      z.object({
        title: z.string().min(1, "title is required"),
        content: z.string().min(1, "content is required"),
      })
    )
    .mutation(async ({ input }) => {
      const delivered = await notifyOwner(input);
      return {
        success: delivered,
      } as const;
    }),

  brevoStatus: publicProcedure.query(async () => {
    const { ENV } = await import("./env");
    const hasKey = !!ENV.brevoApiKey;
    let apiWorks = false;
    let error = null;

    if (hasKey) {
      try {
        const res = await fetch("https://api.brevo.com/v3/account", {
          headers: { "api-key": ENV.brevoApiKey! }
        });
        if (res.ok) {
          apiWorks = true;
        } else {
          error = `Status: ${res.status} - ${await res.text()}`;
        }
      } catch (e: any) {
        error = e.message;
      }
    }

    return { apiWorks, error };
  }),

  verifySubscriber: publicProcedure

    .input(z.object({
      email: z.string().optional(),
      phone: z.string().optional()
    }))
    .mutation(async ({ input }) => {
      const { ENV } = await import("./env");
      if (!ENV.manychatApiToken) return { error: "No Token" };

      const results: any = {};

      if (input.email) {
        try {
          const res = await fetch(`https://api.manychat.com/fb/subscriber/findByInfo?email=${encodeURIComponent(input.email)}`, {
            headers: { "Authorization": `Bearer ${ENV.manychatApiToken}` }
          });
          results.emailSearch = { status: res.status, data: await res.json() };
        } catch (e: any) { results.emailError = e.message; }
      }

      if (input.phone) {
        try {
          // Try raw
          const res1 = await fetch(`https://api.manychat.com/fb/subscriber/findByInfo?phone=${encodeURIComponent(input.phone)}`, {
            headers: { "Authorization": `Bearer ${ENV.manychatApiToken}` }
          });
          results.phoneSearchRaw = { status: res1.status, data: await res1.json() };

          // Try formatted (if not already +)
          let formatted = input.phone.replace(/\D/g, "");
          if (!formatted.startsWith("+")) formatted = "+" + formatted; // simple
          // If it doesn't have 55 and looks like BR, add it (just for test)
          if (!formatted.startsWith("+55") && formatted.length < 13) formatted = "+55" + formatted.replace("+", "");

          const res2 = await fetch(`https://api.manychat.com/fb/subscriber/findByInfo?phone=${encodeURIComponent(formatted)}`, {
            headers: { "Authorization": `Bearer ${ENV.manychatApiToken}` }
          });
          results.phoneSearchFormatted = { tested: formatted, status: res2.status, data: await res2.json() };

        } catch (e: any) { results.phoneError = e.message; }
      }

      return results;
    }),
});
