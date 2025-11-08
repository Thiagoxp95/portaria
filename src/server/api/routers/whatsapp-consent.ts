import { z } from "zod";
import { eq, and, sql } from "drizzle-orm";
import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
} from "~/server/api/trpc";
import { whatsappConsents } from "~/server/db/schema";
import { sendWhatsAppConsent } from "~/server/services/twilio";

export const whatsappConsentRouter = createTRPCRouter({
  /**
   * Start a WhatsApp consent request
   * Sends a WhatsApp message and creates a pending consent record
   */
  startConsent: publicProcedure
    .input(
      z.object({
        to: z.string().min(1), // Phone number with country code
        apt: z.string().min(1), // Apartment number
        visitor: z.string().min(1), // Visitor name
        company: z.string().min(1), // Company name
        ttl: z.number().int().positive().default(300), // TTL in seconds (default 5 minutes)
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { to, apt, visitor, company, ttl } = input;

      // Send WhatsApp message via Twilio
      const message = await sendWhatsAppConsent({ to, apt, visitor, company });

      // Insert consent record with pending status
      // Using INSERT OR IGNORE pattern for LibSQL/SQLite
      try {
        await ctx.db.insert(whatsappConsents).values({
          conversationSid: message.sid,
          toNumber: to,
          apt,
          visitor,
          company,
          lastMsgSid: message.sid,
          ttlSeconds: ttl,
          status: "pending",
          transcript: JSON.stringify([
            {
              type: "outbound",
              sid: message.sid,
              status: message.status,
              timestamp: new Date().toISOString(),
            },
          ]),
        });
      } catch (error) {
        // Handle duplicate key error gracefully
        console.error("Failed to insert consent record:", error);
        // If it's a duplicate, we can still return the SID
      }

      return {
        conversationSid: message.sid,
        status: "pending",
      };
    }),

  /**
   * Get the status of a consent request
   */
  getConsentStatus: publicProcedure
    .input(
      z.object({
        conversationSid: z.string().min(1),
      }),
    )
    .query(async ({ ctx, input }) => {
      const consent = await ctx.db.query.whatsappConsents.findFirst({
        where: eq(whatsappConsents.conversationSid, input.conversationSid),
      });

      if (!consent) {
        throw new Error("Consent request not found");
      }

      return {
        status: consent.status,
        transcript: consent.transcript
          ? (JSON.parse(consent.transcript) as unknown[])
          : [],
        decidedAt: consent.decidedAt,
        apt: consent.apt,
        visitor: consent.visitor,
        company: consent.company,
      };
    }),

  /**
   * Get consent by phone number and status
   * Useful for finding pending consents for a resident
   */
  getConsentByPhone: publicProcedure
    .input(
      z.object({
        toNumber: z.string().min(1),
        status: z
          .enum(["pending", "approved", "denied", "no_answer", "failed"])
          .optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { toNumber, status } = input;

      const consents = await ctx.db.query.whatsappConsents.findMany({
        where: status
          ? and(
              eq(whatsappConsents.toNumber, toNumber),
              eq(whatsappConsents.status, status),
            )
          : eq(whatsappConsents.toNumber, toNumber),
        orderBy: (consents, { desc }) => [desc(consents.createdAt)],
        limit: 10,
      });

      return consents.map((c) => ({
        conversationSid: c.conversationSid,
        status: c.status,
        apt: c.apt,
        visitor: c.visitor,
        company: c.company,
        createdAt: c.createdAt,
        decidedAt: c.decidedAt,
        transcript: c.transcript ? (JSON.parse(c.transcript) as unknown[]) : [],
      }));
    }),

  /**
   * Mark expired consent requests as no_answer
   * This should be called periodically (e.g., via cron job)
   */
  markExpiredConsents: publicProcedure.mutation(async ({ ctx }) => {
    // Find all pending consents that have exceeded their TTL
    const expiredConsents = await ctx.db
      .select()
      .from(whatsappConsents)
      .where(
        and(
          eq(whatsappConsents.status, "pending"),
          sql`${whatsappConsents.createdAt} + ${whatsappConsents.ttlSeconds} < unixepoch()`,
        ),
      );

    // Update them to no_answer status
    if (expiredConsents.length > 0) {
      for (const consent of expiredConsents) {
        await ctx.db
          .update(whatsappConsents)
          .set({
            status: "no_answer",
            decidedAt: new Date(),
          })
          .where(eq(whatsappConsents.conversationSid, consent.conversationSid));
      }
    }

    return {
      marked: expiredConsents.length,
      conversationSids: expiredConsents.map((c) => c.conversationSid),
    };
  }),

  /**
   * Get all consent requests (for admin/debugging)
   */
  getAllConsents: protectedProcedure
    .input(
      z.object({
        limit: z.number().int().positive().max(100).default(20),
        status: z
          .enum(["pending", "approved", "denied", "no_answer", "failed"])
          .optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { limit, status } = input;

      const consents = await ctx.db.query.whatsappConsents.findMany({
        where: status ? eq(whatsappConsents.status, status) : undefined,
        orderBy: (consents, { desc }) => [desc(consents.createdAt)],
        limit,
      });

      return consents.map((c) => ({
        conversationSid: c.conversationSid,
        toNumber: c.toNumber,
        status: c.status,
        apt: c.apt,
        visitor: c.visitor,
        company: c.company,
        createdAt: c.createdAt,
        decidedAt: c.decidedAt,
        ttlSeconds: c.ttlSeconds,
      }));
    }),
});
