import { NextResponse } from "next/server";
import { env } from "~/env";

export async function GET() {
  const diagnostics = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    checks: {
      database: {
        configured: !!(env.DATABASE_URL && env.DATABASE_AUTH_TOKEN),
        url: env.DATABASE_URL
          ? `${env.DATABASE_URL.substring(0, 20)}...`
          : "NOT_SET",
      },
      twilio: {
        accountSid: !!env.TWILIO_ACCOUNT_SID,
        authToken: !!env.TWILIO_AUTH_TOKEN,
        whatsappFrom: !!env.TWILIO_WHATSAPP_FROM,
        contentSid: !!env.TWILIO_CONTENT_SID,
        statusWebhook: !!env.TWILIO_STATUS_WEBHOOK,
        whatsappFromValue: env.TWILIO_WHATSAPP_FROM ?? "NOT_SET",
        contentSidValue: env.TWILIO_CONTENT_SID ?? "NOT_SET",
      },
      auth: {
        betterAuthSecret: !!env.BETTER_AUTH_SECRET,
        githubClientId: !!env.BETTER_AUTH_GITHUB_CLIENT_ID,
        githubClientSecret: !!env.BETTER_AUTH_GITHUB_CLIENT_SECRET,
      },
    },
    endpoints: {
      mcpSse: "/api/mcp/sse",
      mcpTest: "/api/mcp/test",
      twilioWebhook: "/api/webhooks/twilio/whatsapp",
      diagnostics: "/api/diagnostics",
    },
    recommendations: [] as string[],
  };

  // Add recommendations based on missing configurations
  if (!diagnostics.checks.twilio.accountSid) {
    diagnostics.recommendations.push(
      "Set TWILIO_ACCOUNT_SID environment variable",
    );
  }
  if (!diagnostics.checks.twilio.authToken) {
    diagnostics.recommendations.push(
      "Set TWILIO_AUTH_TOKEN environment variable",
    );
  }
  if (!diagnostics.checks.twilio.whatsappFrom) {
    diagnostics.recommendations.push(
      "Set TWILIO_WHATSAPP_FROM environment variable (e.g., whatsapp:+14155238886)",
    );
  } else {
    // Additional check for sandbox number
    if (diagnostics.checks.twilio.whatsappFromValue === "whatsapp:+14155238886") {
      diagnostics.recommendations.push(
        "⚠️ Using Twilio Sandbox number. Join sandbox first: Send 'join <sandbox-code>' to +14155238886 on WhatsApp",
      );
    }
  }
  if (!diagnostics.checks.twilio.contentSid) {
    diagnostics.recommendations.push(
      "Set TWILIO_CONTENT_SID environment variable (WhatsApp template SID)",
    );
  }
  if (!diagnostics.checks.twilio.statusWebhook) {
    diagnostics.recommendations.push(
      "Set TWILIO_STATUS_WEBHOOK environment variable",
    );
  }
  if (!diagnostics.checks.auth.betterAuthSecret) {
    diagnostics.recommendations.push(
      "Set BETTER_AUTH_SECRET environment variable for production",
    );
  }

  if (diagnostics.recommendations.length === 0) {
    diagnostics.recommendations.push(
      "All required environment variables are configured!",
    );
  }

  return NextResponse.json(diagnostics, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
    },
  });
}
