import { NextResponse } from "next/server";

/**
 * Simple test endpoint to verify MCP SSE server is reachable
 * Visit: http://localhost:3000/api/mcp/test
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "MCP SSE server is running",
    endpoints: {
      sse: "/api/mcp/sse (GET for SSE connection)",
      rpc: "/api/mcp/sse (POST for MCP messages)",
    },
    tools: [
      {
        name: "start_whatsapp_consent",
        description: "Start a WhatsApp consent request",
      },
      {
        name: "get_consent_status",
        description: "Get the status of a consent request",
      },
    ],
    usage: {
      elevenlabs: {
        serverType: "SSE",
        serverUrl: "https://your-domain.com/api/mcp/sse",
        description: "Add this URL as a custom MCP server in ElevenLabs",
      },
    },
  });
}
