#!/usr/bin/env node

// Load environment variables FIRST before any other imports
import dotenv from "dotenv";
dotenv.config();

// Now import everything else after env is loaded
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "~/server/db/index.js";
import { whatsappConsents } from "~/server/db/schema.js";
import { sendWhatsAppConsent } from "~/server/services/twilio.js";

/**
 * MCP Server for WhatsApp Consent Flow
 * Exposes tools for ElevenLabs Agents to manage visitor consent via WhatsApp
 */

// Tool schemas
const startConsentSchema = z.object({
  to: z.string().describe("Phone number with country code (e.g., +5511999999999)"),
  apt: z.string().describe("Apartment number"),
  visitor: z.string().describe("Visitor name"),
  company: z.string().describe("Company/delivery name"),
  ttl: z
    .number()
    .int()
    .positive()
    .default(300)
    .describe("Time to live in seconds (default: 300)"),
});

const getConsentStatusSchema = z.object({
  conversationSid: z
    .string()
    .describe("The conversation SID returned from start_whatsapp_consent"),
});

// Define tools
const tools: Tool[] = [
  {
    name: "start_whatsapp_consent",
    description:
      "Initiates a WhatsApp consent request for a visitor arrival. Sends a message to the resident with approve/deny buttons. Returns a conversation SID to track the request.",
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

// Create MCP server
const server = new Server(
  {
    name: "whatsapp-consent-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

// Handle list tools request
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "start_whatsapp_consent": {
        const input = startConsentSchema.parse(args);
        const { to, apt, visitor, company, ttl } = input;

        // Send WhatsApp message
        const message = await sendWhatsAppConsent({ to, apt, visitor, company });

        // Insert consent record
        try {
          await db.insert(whatsappConsents).values({
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
          // Continue even if insert fails (may be duplicate)
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                conversationSid: message.sid,
                status: "pending",
                message: "WhatsApp consent request sent successfully",
              }),
            },
          ],
        };
      }

      case "get_consent_status": {
        const input = getConsentStatusSchema.parse(args);
        const { conversationSid } = input;

        // Query consent status
        const consent = await db.query.whatsappConsents.findFirst({
          where: eq(whatsappConsents.conversationSid, conversationSid),
        });

        if (!consent) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  error: "Consent request not found",
                  conversationSid,
                }),
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                conversationSid: consent.conversationSid,
                status: consent.status,
                apt: consent.apt,
                visitor: consent.visitor,
                company: consent.company,
                decidedAt: consent.decidedAt,
                transcript: consent.transcript
                  ? (JSON.parse(consent.transcript) as unknown[])
                  : [],
              }),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            error: error instanceof Error ? error.message : "Unknown error",
            tool: name,
          }),
        },
      ],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("WhatsApp Consent MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
