import { z } from "zod";
import { eq } from "drizzle-orm";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import twilio from "twilio";
import * as schema from "./schema.js";

// Environment variables
const DATABASE_URL = process.env.DATABASE_URL;
const DATABASE_AUTH_TOKEN = process.env.DATABASE_AUTH_TOKEN;
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_WHATSAPP_FROM = process.env.TWILIO_WHATSAPP_FROM;
const TWILIO_CONTENT_SID = process.env.TWILIO_CONTENT_SID;

// Validate required environment variables
if (!DATABASE_URL || !DATABASE_AUTH_TOKEN) {
  throw new Error("DATABASE_URL and DATABASE_AUTH_TOKEN are required");
}

// Initialize database
const client = createClient({
  url: DATABASE_URL,
  authToken: DATABASE_AUTH_TOKEN,
});

const db = drizzle(client, { schema });

// Initialize Twilio client (lazy)
function getTwilioClient() {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    throw new Error("Twilio credentials not configured");
  }
  return twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
}

// Tool schemas
const getPhoneByApartmentSchema = z.object({
  apartmentNumber: z.string().describe("The apartment number to look up"),
});

const startConsentSchema = z.object({
  to: z.string().describe("Phone number with country code"),
  apt: z.string().describe("Apartment number"),
  visitor: z.string().describe("Visitor name"),
  company: z.string().describe("Company/delivery name"),
  ttl: z.number().int().positive().default(300),
});

const getConsentStatusSchema = z.object({
  conversationSid: z
    .string()
    .describe("The conversation SID returned from start_whatsapp_consent"),
});

// MCP Tools definition
const TOOLS = [
  {
    name: "get_phone_by_apartment",
    description:
      "Gets the resident's phone number for a given apartment number. Use this BEFORE sending a consent request if you only know the apartment number.",
    inputSchema: {
      type: "object",
      properties: {
        apartmentNumber: {
          type: "string",
          description: "The apartment number (e.g., '1507', '23B')",
        },
      },
      required: ["apartmentNumber"],
    },
  },
  {
    name: "start_whatsapp_consent",
    description:
      "Initiates a WhatsApp consent request for a visitor arrival. Sends a message to the resident with approve/deny buttons.",
    inputSchema: {
      type: "object",
      properties: {
        to: {
          type: "string",
          description: "Phone number with country code (e.g., +5511999999999)",
        },
        apt: {
          type: "string",
          description: "Apartment number",
        },
        visitor: {
          type: "string",
          description: "Visitor name",
        },
        company: {
          type: "string",
          description: "Company/delivery name",
        },
        ttl: {
          type: "number",
          description: "Time to live in seconds (default: 300)",
          default: 300,
        },
      },
      required: ["to", "apt", "visitor", "company"],
    },
  },
  {
    name: "get_consent_status",
    description:
      "Retrieves the current status of a WhatsApp consent request. Returns: pending, approved, denied, no_answer, or failed.",
    inputSchema: {
      type: "object",
      properties: {
        conversationSid: {
          type: "string",
          description:
            "The conversation SID returned from start_whatsapp_consent",
        },
      },
      required: ["conversationSid"],
    },
  },
];

// Send WhatsApp consent
async function sendWhatsAppConsent(params: {
  to: string;
  apt: string;
  visitor: string;
  company: string;
}) {
  const { to, apt, visitor, company } = params;

  if (!TWILIO_WHATSAPP_FROM || !TWILIO_CONTENT_SID) {
    throw new Error("Twilio WhatsApp configuration incomplete");
  }

  const toNumber = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;

  const client = getTwilioClient();
  const message = await client.messages.create({
    from: TWILIO_WHATSAPP_FROM,
    to: toNumber,
    contentSid: TWILIO_CONTENT_SID,
    contentVariables: JSON.stringify({
      "1": apt,
      "2": company,
      "3": visitor,
    }),
  });

  return {
    sid: message.sid,
    status: message.status,
    to: message.to,
    from: message.from,
  };
}

// Handle tool execution
async function handleToolCall(toolName: string, args: unknown) {
  switch (toolName) {
    case "get_phone_by_apartment": {
      const input = getPhoneByApartmentSchema.parse(args);
      const { apartmentNumber } = input;

      const resident = await db.query.residents.findFirst({
        where: eq(schema.residents.apartmentNumber, apartmentNumber),
      });

      if (!resident) {
        throw new Error(
          `No resident found for apartment ${apartmentNumber}`,
        );
      }

      if (!resident.isActive) {
        throw new Error(
          `Resident for apartment ${apartmentNumber} is inactive`,
        );
      }

      return {
        apartmentNumber: resident.apartmentNumber,
        phoneNumber: resident.phoneNumber,
        residentName: resident.residentName,
        message: "Resident information retrieved successfully",
      };
    }

    case "start_whatsapp_consent": {
      const input = startConsentSchema.parse(args);
      const { to, apt, visitor, company, ttl } = input;

      const message = await sendWhatsAppConsent({ to, apt, visitor, company });

      try {
        await db.insert(schema.whatsappConsents).values({
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
      } catch (dbError) {
        console.error("Database insert error:", dbError);
      }

      return {
        conversationSid: message.sid,
        status: "pending",
        message: "WhatsApp consent request sent successfully",
      };
    }

    case "get_consent_status": {
      const input = getConsentStatusSchema.parse(args);
      const { conversationSid } = input;

      const consent = await db.query.whatsappConsents.findFirst({
        where: eq(schema.whatsappConsents.conversationSid, conversationSid),
      });

      if (!consent) {
        throw new Error("Consent request not found");
      }

      return {
        conversationSid: consent.conversationSid,
        status: consent.status,
        apt: consent.apt,
        visitor: consent.visitor,
        company: consent.company,
        decidedAt: consent.decidedAt,
        transcript: consent.transcript
          ? (JSON.parse(consent.transcript) as unknown[])
          : [],
      };
    }

    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

// Handle MCP protocol requests
export async function handleMCPRequest(request: {
  jsonrpc: string;
  id?: string | number;
  method: string;
  params?: unknown;
}) {
  const { method, params, id } = request;

  try {
    switch (method) {
      case "initialize": {
        // Support the client's protocol version if we recognize it
        const clientVersion =
          (params as { protocolVersion?: string })?.protocolVersion ||
          "2024-11-05";
        const supportedVersions = ["2024-11-05", "2025-03-26"];
        const protocolVersion = supportedVersions.includes(clientVersion)
          ? clientVersion
          : "2024-11-05";

        // Capabilities vary by protocol version
        const capabilities =
          protocolVersion === "2025-03-26"
            ? {
                tools: {
                  listChanged: true,
                },
              }
            : {
                tools: {},
              };

        return {
          jsonrpc: "2.0",
          id,
          result: {
            protocolVersion,
            capabilities,
            serverInfo: {
              name: "whatsapp-consent-server",
              version: "1.0.0",
            },
          },
        };
      }

      case "notifications/initialized":
      case "initialized": {
        // Client notification that it's ready - no response needed for notifications
        console.log("[MCP] Client sent initialized notification");
        return null;
      }

      case "tools/list": {
        return {
          jsonrpc: "2.0",
          id,
          result: {
            tools: TOOLS,
          },
        };
      }

      case "tools/call": {
        const { name, arguments: args} = params as {
          name: string;
          arguments?: unknown;
        };

        const result = await handleToolCall(name, args);

        return {
          jsonrpc: "2.0",
          id,
          result: {
            content: [
              {
                type: "text",
                text: JSON.stringify(result),
              },
            ],
          },
        };
      }

      default: {
        return {
          jsonrpc: "2.0",
          id,
          error: {
            code: -32601,
            message: `Method not found: ${method}`,
          },
        };
      }
    }
  } catch (error) {
    return {
      jsonrpc: "2.0",
      id,
      error: {
        code: -32603,
        message: error instanceof Error ? error.message : "Internal error",
      },
    };
  }
}
