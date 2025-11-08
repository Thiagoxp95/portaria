import type { NextRequest } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "~/server/db";
import { whatsappConsents, residents } from "~/server/db/schema";
import { sendWhatsAppConsent } from "~/server/services/twilio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// MCP Protocol Types
interface MCPRequest {
  jsonrpc: "2.0";
  id?: string | number;
  method: string;
  params?: unknown;
}

interface MCPResponse {
  jsonrpc: "2.0";
  id?: string | number;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

// Tool schemas
const startConsentSchema = z.object({
  to: z.string().describe("Phone number with country code"),
  apt: z.string().describe("Apartment number"),
  visitor: z.string().describe("Visitor name"),
  company: z.string().describe("Company/delivery name"),
  ttl: z.number().int().positive().default(300),
});

const getConsentStatusSchema = z.object({
  conversationSid: z.string().describe("Conversation SID from start_whatsapp_consent"),
});

const getPhoneByApartmentSchema = z.object({
  apartmentNumber: z.string().describe("The apartment number to look up"),
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
          description: "The conversation SID returned from start_whatsapp_consent",
        },
      },
      required: ["conversationSid"],
    },
  },
];

/**
 * Handle MCP tool execution
 */
async function handleToolCall(toolName: string, args: unknown) {
  try {
    switch (toolName) {
      case "get_phone_by_apartment": {
        const input = getPhoneByApartmentSchema.parse(args);
        const { apartmentNumber } = input;

        const resident = await db.query.residents.findFirst({
          where: eq(residents.apartmentNumber, apartmentNumber),
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
          where: eq(whatsappConsents.conversationSid, conversationSid),
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
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : "Unknown error executing tool",
    );
  }
}

/**
 * Handle MCP protocol requests
 */
async function handleMCPRequest(request: MCPRequest): Promise<MCPResponse> {
  const { method, params, id } = request;

  try {
    switch (method) {
      case "initialize": {
        return {
          jsonrpc: "2.0",
          id,
          result: {
            protocolVersion: "2024-11-05",
            capabilities: {
              tools: {},
            },
            serverInfo: {
              name: "whatsapp-consent-server",
              version: "1.0.0",
            },
          },
        };
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
        const { name, arguments: args } = params as {
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
        data: error,
      },
    };
  }
}

/**
 * SSE GET endpoint - establishes SSE connection
 */
export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Send SSE endpoint notification
        const endpointEvent = `event: endpoint\ndata: ${request.nextUrl.origin}/api/mcp/sse\n\n`;
        controller.enqueue(encoder.encode(endpointEvent));

        // Keep connection alive with periodic pings
        const pingInterval = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(`: ping\n\n`));
          } catch {
            clearInterval(pingInterval);
          }
        }, 30000); // Ping every 30 seconds

        // Store interval for cleanup
        (controller as unknown as { pingInterval: NodeJS.Timeout }).pingInterval = pingInterval;
      } catch (error) {
        console.error("SSE stream error:", error);
        controller.error(error);
      }
    },
    cancel() {
      // Cleanup on connection close
      const pingInterval = (this as unknown as { pingInterval?: NodeJS.Timeout }).pingInterval;
      if (pingInterval) {
        clearInterval(pingInterval);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no", // Disable nginx buffering
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

/**
 * OPTIONS endpoint - handle CORS preflight
 */
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400",
    },
  });
}

/**
 * POST endpoint - handles MCP protocol messages
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as MCPRequest;

    // Validate JSON-RPC format
    if (body.jsonrpc !== "2.0") {
      return Response.json(
        {
          jsonrpc: "2.0",
          id: body.id,
          error: {
            code: -32600,
            message: "Invalid Request: jsonrpc must be 2.0",
          },
        },
        { status: 400 },
      );
    }

    const response = await handleMCPRequest(body);

    return Response.json(response, {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  } catch (error) {
    console.error("MCP POST error:", error);

    return Response.json(
      {
        jsonrpc: "2.0",
        error: {
          code: -32700,
          message: "Parse error",
          data: error instanceof Error ? error.message : "Unknown error",
        },
      },
      { status: 400 },
    );
  }
}
