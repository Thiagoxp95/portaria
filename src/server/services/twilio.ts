import twilio from "twilio";
import { env } from "~/env";

// Lazy initialization of Twilio client
function getTwilioClient() {
  if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN) {
    throw new Error(
      "Twilio credentials not configured. Please set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN environment variables.",
    );
  }
  return twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
}

export interface SendConsentParams {
  to: string; // Phone number with country code (e.g., +5511999999999)
  apt: string;
  visitor: string;
  company: string;
}

export interface TwilioMessage {
  sid: string;
  status: string;
  to: string;
  from: string;
}

/**
 * Sends a WhatsApp consent request using a Twilio Content Template
 * @param params - The consent request parameters
 * @returns The created message with SID for tracking
 */
export async function sendWhatsAppConsent(
  params: SendConsentParams,
): Promise<TwilioMessage> {
  const { to, apt, visitor, company } = params;

  // Validate required environment variables
  if (!env.TWILIO_WHATSAPP_FROM || !env.TWILIO_CONTENT_SID) {
    throw new Error(
      "Twilio WhatsApp configuration incomplete. Please set TWILIO_WHATSAPP_FROM and TWILIO_CONTENT_SID environment variables.",
    );
  }

  // Ensure phone number has whatsapp: prefix
  const toNumber = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;

  try {
    const client = getTwilioClient();
    const message = await client.messages.create({
      from: env.TWILIO_WHATSAPP_FROM,
      to: toNumber,
      contentSid: env.TWILIO_CONTENT_SID,
      contentVariables: JSON.stringify({
        "1": apt, // Apartment number
        "2": company, // Company name
        "3": visitor, // Visitor name
      }),
      statusCallback: env.TWILIO_STATUS_WEBHOOK,
    });

    return {
      sid: message.sid,
      status: message.status,
      to: message.to,
      from: message.from,
    };
  } catch (error) {
    console.error("Failed to send WhatsApp consent message:", error);
    throw new Error(
      `Failed to send WhatsApp message: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Validates a Twilio webhook request signature
 * @param signature - The X-Twilio-Signature header value
 * @param url - The full webhook URL
 * @param params - The POST body parameters
 * @returns True if signature is valid, false otherwise
 */
export function validateTwilioSignature(
  signature: string,
  url: string,
  params: Record<string, string>,
): boolean {
  if (!env.TWILIO_AUTH_TOKEN) {
    throw new Error(
      "TWILIO_AUTH_TOKEN not configured. Cannot validate webhook signature.",
    );
  }
  return twilio.validateRequest(
    env.TWILIO_AUTH_TOKEN,
    signature,
    url,
    params,
  );
}
