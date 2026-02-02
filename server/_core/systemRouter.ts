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

    return { hasKey, apiWorks, error };
  }),
});
