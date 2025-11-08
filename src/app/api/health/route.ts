import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    endpoints: {
      health: "/api/health",
      mcpTest: "/api/mcp/test",
      mcpSse: "/api/mcp/sse",
      trpc: "/api/trpc",
      webhook: "/api/webhooks/twilio/whatsapp",
    },
  });
}
