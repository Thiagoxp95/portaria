#!/usr/bin/env node
/**
 * Consent Timeout Checker
 *
 * This script marks pending WhatsApp consent requests as "no_answer"
 * if they exceed their TTL (time to live).
 *
 * Usage:
 * - Run manually: pnpm timeout:check
 * - Run via cron: Add to crontab to run every minute or as needed
 *   Example crontab entry (runs every minute):
 *   * * * * * cd /path/to/portaria && pnpm timeout:check
 *
 * For production, consider using:
 * - Vercel Cron (if deployed on Vercel)
 * - AWS EventBridge (if on AWS)
 * - GitHub Actions scheduled workflows
 * - Or a dedicated cron job service
 */

import { eq, and, sql } from "drizzle-orm";
import { db } from "~/server/db";
import { whatsappConsents } from "~/server/db/schema";

async function checkExpiredConsents() {
  console.log(`[${new Date().toISOString()}] Checking for expired consents...`);

  try {
    // Find all pending consents that have exceeded their TTL
    // Formula: current_time > (created_at + ttl_seconds)
    const expiredConsents = await db
      .select()
      .from(whatsappConsents)
      .where(
        and(
          eq(whatsappConsents.status, "pending"),
          sql`${whatsappConsents.createdAt} + ${whatsappConsents.ttlSeconds} < unixepoch()`,
        ),
      );

    if (expiredConsents.length === 0) {
      console.log("No expired consents found.");
      return { marked: 0, sids: [] };
    }

    console.log(`Found ${expiredConsents.length} expired consent(s).`);

    // Update them to no_answer status
    const updatedSids: string[] = [];
    for (const consent of expiredConsents) {
      await db
        .update(whatsappConsents)
        .set({
          status: "no_answer",
          decidedAt: new Date(),
        })
        .where(eq(whatsappConsents.conversationSid, consent.conversationSid));

      updatedSids.push(consent.conversationSid);
      console.log(
        `Marked consent ${consent.conversationSid} (apt: ${consent.apt}, visitor: ${consent.visitor}) as no_answer`,
      );
    }

    console.log(
      `Successfully marked ${updatedSids.length} consent(s) as no_answer.`,
    );

    return {
      marked: updatedSids.length,
      sids: updatedSids,
    };
  } catch (error) {
    console.error("Error checking expired consents:", error);
    throw error;
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  checkExpiredConsents()
    .then((result) => {
      console.log("Done:", result);
      process.exit(0);
    })
    .catch((error) => {
      console.error("Fatal error:", error);
      process.exit(1);
    });
}

export { checkExpiredConsents };
