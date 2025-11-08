import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "~/server/db";
import { whatsappConsents } from "~/server/db/schema";
import { validateTwilioSignature } from "~/server/services/twilio";

/**
 * Webhook endpoint for Twilio WhatsApp inbound messages
 * This endpoint receives user replies to WhatsApp consent requests
 */
export async function POST(request: NextRequest) {
  try {
    // Get the request body as form data
    const formData = await request.formData();
    const body: Record<string, string> = {};

    formData.forEach((value, key) => {
      if (typeof value === "string") {
        body[key] = value;
      } else if (value instanceof File) {
        body[key] = value.name; // Use filename for File objects
      } else {
        body[key] = String(value);
      }
    });

    // Validate Twilio signature
    const signature = request.headers.get("x-twilio-signature") ?? "";
    const url = request.url;

    if (!validateTwilioSignature(signature, url, body)) {
      console.error("Invalid Twilio signature");
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 },
      );
    }

    // Extract relevant fields from Twilio webhook
    const {
      Body: messageBody,
      From: from,
      MessageSid: messageSid,
      SmsStatus: status,
      ButtonPayload: buttonPayload,
    } = body;

    // Determine the user's response
    // Check if it's a button response first
    let userResponse: "approved" | "denied" | "failed";

    if (buttonPayload) {
      // Handle button quick-reply responses
      const payload = buttonPayload.toLowerCase();
      if (payload === "approve" || payload === "approved") {
        userResponse = "approved";
      } else if (payload === "deny" || payload === "denied") {
        userResponse = "denied";
      } else {
        userResponse = "failed";
      }
    } else {
      // Handle text responses
      const reply = (messageBody ?? "").trim().toLowerCase();

      // Match approval keywords (multilingual)
      const approvedPattern =
        /^(approve|approved|yes|sim|oui|sí|si|ok|okay)$/i;
      // Match denial keywords (multilingual)
      const deniedPattern = /^(deny|denied|no|nao|não|non)$/i;

      if (approvedPattern.test(reply)) {
        userResponse = "approved";
      } else if (deniedPattern.test(reply)) {
        userResponse = "denied";
      } else {
        userResponse = "failed";
      }
    }

    // Find the pending consent for this phone number
    const toNumber = from?.replace("whatsapp:", "") ?? "";

    const existingConsent = await db.query.whatsappConsents.findFirst({
      where: and(
        eq(whatsappConsents.toNumber, toNumber),
        eq(whatsappConsents.status, "pending"),
      ),
      orderBy: (consents, { desc }) => [desc(consents.createdAt)],
    });

    if (!existingConsent) {
      console.warn(
        `No pending consent found for phone number: ${toNumber}`,
      );
      return NextResponse.json(
        { message: "No pending consent found" },
        { status: 200 },
      );
    }

    // Update the consent record
    const transcript: Array<{
      type: string;
      body?: string;
      buttonPayload?: string;
      sid?: string;
      status?: string;
      timestamp: string;
      decision?: string;
    }> = existingConsent.transcript
      ? (JSON.parse(existingConsent.transcript) as Array<{
          type: string;
          body?: string;
          buttonPayload?: string;
          sid?: string;
          status?: string;
          timestamp: string;
          decision?: string;
        }>)
      : [];

    transcript.push({
      type: "inbound",
      body: messageBody,
      buttonPayload,
      sid: messageSid,
      status,
      timestamp: new Date().toISOString(),
      decision: userResponse,
    });

    await db
      .update(whatsappConsents)
      .set({
        status: userResponse,
        decidedAt: new Date(),
        transcript: JSON.stringify(transcript),
      })
      .where(
        eq(whatsappConsents.conversationSid, existingConsent.conversationSid),
      );

    console.log(
      `Consent ${existingConsent.conversationSid} updated to: ${userResponse}`,
    );

    // Optionally send a confirmation message back
    // (This is optional and can be removed if not needed)
    const confirmationMessage =
      userResponse === "approved"
        ? "Thank you! Entry has been approved."
        : userResponse === "denied"
          ? "Thank you! Entry has been denied."
          : "Sorry, I didn't understand your response.";

    // Return TwiML response (optional)
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${confirmationMessage}</Message>
</Response>`,
      {
        status: 200,
        headers: {
          "Content-Type": "text/xml",
        },
      },
    );
  } catch (error) {
    console.error("Error processing Twilio webhook:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * Handle GET requests (for testing/verification)
 */
export async function GET() {
  return NextResponse.json({
    message: "Twilio WhatsApp webhook endpoint is active",
    timestamp: new Date().toISOString(),
  });
}
