# WhatsApp Consent Flow Setup Guide

This guide explains how to set up and use the WhatsApp consent flow system for the Portaria application.

## Overview

The WhatsApp consent system allows asynchronous collection of resident consent via WhatsApp when a visitor arrives. It uses:

- **Twilio** for WhatsApp messaging
- **Drizzle ORM** with LibSQL/Turso for data persistence
- **tRPC** for type-safe API endpoints
- **MCP (Model Context Protocol)** for integration with ElevenLabs Agents
- **Next.js API Routes** for webhooks

## Prerequisites

1. **Twilio Account** with WhatsApp Business API access
2. **Twilio WhatsApp Template** configured (see below)
3. **Turso Database** (already configured in this project)
4. **ElevenLabs Account** (optional, for AI agent integration)

## Step 1: Create Twilio WhatsApp Template

1. Log in to your [Twilio Console](https://console.twilio.com)
2. Navigate to **Messaging** → **Content Editor**
3. Click **Create New Content Template**
4. Select **WhatsApp** as the channel
5. Configure the template:

### Template Details

- **Template Name**: `visitor_consent`
- **Template Type**: Utility
- **Category**: Utility
- **Language**: Portuguese (Brazil) or your preferred language

### Template Body

```
Delivery for apartment {{1}} from {{2}} ({{3}}). Approve entry?
```

### Template Variables

1. `{{1}}` - Apartment number
2. `{{2}}` - Company name
3. `{{3}}` - Visitor name

### Template Buttons (Quick Replies)

- Button 1: **Approve**
- Button 2: **Deny**

6. Submit the template for approval
7. Once approved, copy the **Content SID** (starts with `HX...`)

## Step 2: Configure Environment Variables

Add the following variables to your `.env` file:

```env
# Twilio Configuration
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
TWILIO_CONTENT_SID=HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_STATUS_WEBHOOK=https://your-domain.com/api/webhooks/twilio/whatsapp
```

### How to Get These Values

- **TWILIO_ACCOUNT_SID**: Found on your Twilio Console Dashboard
- **TWILIO_AUTH_TOKEN**: Found on your Twilio Console Dashboard (click "Show" to reveal)
- **TWILIO_WHATSAPP_FROM**: Your Twilio WhatsApp-enabled phone number (format: `whatsapp:+14155238886`)
- **TWILIO_CONTENT_SID**: The Content SID from Step 1
- **TWILIO_STATUS_WEBHOOK**: Your deployed webhook URL (see Step 3)

## Step 3: Configure Twilio Webhook

1. Deploy your Next.js application (Vercel, Railway, etc.)
2. Get your deployed URL (e.g., `https://your-app.vercel.app`)
3. In Twilio Console:
   - Go to **Messaging** → **Settings** → **WhatsApp Sandbox Settings** (for testing)
   - Or **Messaging** → **Senders** → **WhatsApp Senders** (for production)
4. Set the **Inbound Webhook URL** to:
   ```
   https://your-app.vercel.app/api/webhooks/twilio/whatsapp
   ```
5. Set HTTP Method to **POST**

## Step 4: Database Schema

The migration has already been applied. The `whatsapp_consent` table includes:

| Column | Type | Description |
|--------|------|-------------|
| `conversationSid` | TEXT (PK) | Twilio message SID |
| `toNumber` | TEXT | Recipient phone number |
| `apt` | TEXT | Apartment number |
| `visitor` | TEXT | Visitor name |
| `company` | TEXT | Company/delivery name |
| `status` | TEXT | pending, approved, denied, no_answer, failed |
| `lastMsgSid` | TEXT | Last message SID |
| `decidedAt` | INTEGER | Timestamp of decision |
| `transcript` | TEXT | JSON array of message history |
| `ttlSeconds` | INTEGER | Time to live (default: 300) |
| `createdAt` | INTEGER | Creation timestamp |
| `updatedAt` | INTEGER | Update timestamp |

## Step 5: Usage

### A. Using tRPC API (Recommended for Internal Use)

```typescript
import { api } from "~/trpc/server";

// Start a consent request
const result = await api.whatsappConsent.startConsent({
  to: "+5511999999999",
  apt: "1507",
  visitor: "John Doe",
  company: "Amazon",
  ttl: 300, // 5 minutes
});

console.log(result.conversationSid); // Use this to track the request

// Check consent status
const status = await api.whatsappConsent.getConsentStatus({
  conversationSid: result.conversationSid,
});

console.log(status.status); // "pending", "approved", "denied", etc.
```

### B. Using MCP Server (For ElevenLabs Agents)

**Important:** ElevenLabs requires MCP servers to use SSE (Server-Sent Events) or HTTP Streamable transport. Our MCP server uses stdio, so we need to use a proxy or deploy it as an HTTP endpoint.

#### Option 1: Using mcp-proxy (Recommended for Development/Testing)

1. **Install mcp-proxy globally:**

```bash
npm install -g @sparfenyuk/mcp-proxy
```

2. **Start your MCP server with mcp-proxy:**

```bash
# Start the proxy on port 3001 (or any available port)
mcp-proxy --port 3001 -- pnpm mcp:server
```

This will expose your stdio MCP server as an SSE endpoint at `http://localhost:3001/sse`

3. **For production, use ngrok or deploy to a server:**

```bash
# Using ngrok for testing
ngrok http 3001
```

This gives you a public URL like `https://abc123.ngrok.io`

#### Option 2: Use tRPC API Directly (Simplest for Production)

**Note:** For most use cases, you can skip MCP entirely and call the tRPC API directly from your ElevenLabs agent using custom tools or function calling.

Simply deploy your Next.js app and use these endpoints:

- **Start Consent:** `POST https://your-domain.com/api/trpc/whatsappConsent.startConsent`
- **Get Status:** `GET https://your-domain.com/api/trpc/whatsappConsent.getConsentStatus`

Configure these as HTTP REST tools in ElevenLabs instead of MCP tools.

#### Option 3: Deploy as MCP SSE Endpoint (Production-Ready) ✅

**Good news!** The complete MCP SSE endpoint is already implemented at `/src/app/api/mcp/sse/route.ts`

This endpoint provides full MCP protocol support with:
- ✅ SSE (Server-Sent Events) transport
- ✅ JSON-RPC 2.0 protocol
- ✅ MCP initialize, tools/list, and tools/call methods
- ✅ Both `start_whatsapp_consent` and `get_consent_status` tools
- ✅ Keep-alive pings for stable connections
- ✅ Proper error handling

**To use this endpoint:**

1. **Deploy your Next.js app** to Vercel, Railway, or any hosting platform
2. **Test the endpoint** at: `https://your-domain.com/api/mcp/test`
   - This will show you the server status and available tools
3. **Use the SSE endpoint:** `https://your-domain.com/api/mcp/sse`

#### 3. Configure in ElevenLabs Platform (For MCP Option 1 or 3)

1. **Go to your ElevenLabs Agent settings**
2. **Navigate to "Integrations" or "Tools"**
3. **Click "Add Custom MCP Server"**
4. **Fill in the configuration:**

**For Option 1 (mcp-proxy):**
```
Name: WhatsApp Consent Manager
Description: Manages visitor consent requests via WhatsApp with approve/deny options
Server Type: SSE
Server URL: http://localhost:3001/sse (local testing)
         OR https://your-ngrok-url.ngrok.io/sse (ngrok tunnel)

Secret Token: (Leave empty)
HTTP Headers: (Leave empty)
Tool Approval Mode: "Always Ask" (Recommended for security)
```

**For Option 3 (Production SSE Endpoint):**
```
Name: WhatsApp Consent Manager
Description: Manages visitor consent requests via WhatsApp with approve/deny options
Server Type: SSE
Server URL: https://your-domain.com/api/mcp/sse
         OR https://your-vercel-app.vercel.app/api/mcp/sse

Secret Token: (Optional - add if you implement auth)
HTTP Headers: (Optional)
Tool Approval Mode: "Always Ask" (Recommended for security)
```

5. **Trust the server** by checking "I trust this server"
6. **Save the configuration**

**Testing the Connection:**

Visit `https://your-domain.com/api/mcp/test` to verify the server is running. You should see:
```json
{
  "status": "ok",
  "message": "MCP SSE server is running",
  "tools": [...]
}
```

**Alternative: Using HTTP REST Tools (Simpler)**

If using Option 2 (tRPC directly), configure custom HTTP tools instead:

1. In ElevenLabs Agent settings, go to "Tools" → "Add Custom Tool"
2. **Tool 1 - Start Consent:**
   ```
   Name: start_whatsapp_consent
   Description: Sends a WhatsApp consent request to a resident
   Method: POST
   URL: https://your-domain.com/api/trpc/whatsappConsent.startConsent
   Headers:
     Content-Type: application/json
   Body:
     {
       "to": "{{phone}}",
       "apt": "{{apartment}}",
       "visitor": "{{visitor_name}}",
       "company": "{{company_name}}",
       "ttl": 300
     }
   ```

3. **Tool 2 - Get Status:**
   ```
   Name: get_consent_status
   Description: Checks the status of a consent request
   Method: POST
   URL: https://your-domain.com/api/trpc/whatsappConsent.getConsentStatus
   Headers:
     Content-Type: application/json
   Body:
     {
       "conversationSid": "{{conversation_sid}}"
     }
   ```

#### 6. Agent Prompt Example

```
When a visitor arrives:
1. Greet the visitor and ask for their name and company
2. Ask which apartment they're visiting
3. Call start_whatsapp_consent with the collected information
4. Save the conversationSid from the response
5. Inform the visitor: "I'm sending a WhatsApp message to the resident. Please wait."
6. Wait 10 seconds, then call get_consent_status
7. If status is "pending", tell visitor "Still waiting for response..." and wait another 10 seconds
8. Repeat checking every 10 seconds for up to 5 minutes (30 attempts)
9. If status is "approved", say "Entry approved! Please proceed to apartment [number]."
10. If status is "denied", say "I'm sorry, the resident has denied entry."
11. If status is "no_answer" after timeout, say "The resident hasn't responded. Please try calling them directly."
```

#### 7. Available MCP Tools

**Tool: `start_whatsapp_consent`**
```typescript
{
  "to": "+5511999999999",      // Phone with country code
  "apt": "1507",               // Apartment number
  "visitor": "John Doe",       // Visitor name
  "company": "Amazon",         // Company name
  "ttl": 300                   // Optional, defaults to 300 seconds
}
```

**Tool: `get_consent_status`**
```typescript
{
  "conversationSid": "SMxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
}
```

### C. Webhook Flow (Automatic)

The webhook at `/api/webhooks/twilio/whatsapp` automatically processes user replies:

1. Validates Twilio signature
2. Extracts user response (button click or text message)
3. Updates database with decision
4. Sends confirmation message back to user

#### Supported Response Keywords

**Approve:**
- approve, approved
- yes
- sim (Portuguese)
- oui (French)
- sí, si (Spanish)
- ok, okay

**Deny:**
- deny, denied
- no
- não, nao (Portuguese)
- non (French)

## Step 6: Timeout Job (Handling No Response)

Run the timeout checker periodically to mark expired requests as `no_answer`:

### Manual Execution

```bash
pnpm timeout:check
```

### Automated Options

#### Option 1: Crontab (Linux/macOS)

```bash
# Edit crontab
crontab -e

# Add this line to run every minute
* * * * * cd /path/to/portaria && pnpm timeout:check >> /var/log/consent-timeout.log 2>&1
```

#### Option 2: Vercel Cron (Recommended for Vercel deployments)

Create `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/check-timeouts",
      "schedule": "* * * * *"
    }
  ]
}
```

Create `/src/app/api/cron/check-timeouts/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { checkExpiredConsents } from "~/server/jobs/check-consent-timeouts";

export async function GET(request: Request) {
  // Verify cron secret (optional but recommended)
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await checkExpiredConsents();
  return NextResponse.json(result);
}
```

#### Option 3: GitHub Actions

Create `.github/workflows/check-timeouts.yml`:

```yaml
name: Check Consent Timeouts

on:
  schedule:
    - cron: '*/5 * * * *' # Every 5 minutes

jobs:
  check-timeouts:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm timeout:check
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          DATABASE_AUTH_TOKEN: ${{ secrets.DATABASE_AUTH_TOKEN }}
```

## Testing

### 1. Test the Webhook Endpoint

```bash
curl https://your-app.vercel.app/api/webhooks/twilio/whatsapp
```

Expected response:
```json
{
  "message": "Twilio WhatsApp webhook endpoint is active",
  "timestamp": "2025-11-07T..."
}
```

### 2. Test Consent Flow (via tRPC)

Create a test script or use your Next.js app:

```typescript
// Test starting a consent request
const consent = await api.whatsappConsent.startConsent({
  to: "+5511999999999", // Your test WhatsApp number
  apt: "Test 101",
  visitor: "Test Visitor",
  company: "Test Co",
  ttl: 300,
});

console.log("Consent started:", consent);

// Check status after a few seconds
setTimeout(async () => {
  const status = await api.whatsappConsent.getConsentStatus({
    conversationSid: consent.conversationSid,
  });
  console.log("Status:", status);
}, 5000);
```

### 3. Test WhatsApp Response

1. Send a consent request to your phone
2. Reply with "Approve" or "Deny"
3. Check the database or call `getConsentStatus` to verify

## Monitoring & Debugging

### View Consent Requests

```typescript
// Get all pending consents
const pending = await api.whatsappConsent.getAllConsents({
  status: "pending",
  limit: 20,
});

// Get consents by phone number
const userConsents = await api.whatsappConsent.getConsentByPhone({
  toNumber: "+5511999999999",
});
```

### Database Studio

```bash
pnpm db:studio
```

Navigate to `http://localhost:4983` to view and manage records.

### Logs

- **MCP Server**: stdout/stderr from `pnpm mcp:server`
- **Webhook**: Check your Next.js deployment logs (Vercel, Railway, etc.)
- **Timeout Job**: Check cron logs or GitHub Actions logs

## Security Considerations

1. **Webhook Validation**: The webhook validates Twilio signatures to prevent unauthorized requests
2. **Environment Variables**: Never commit `.env` files with sensitive data
3. **HTTPS**: Always use HTTPS for webhooks in production
4. **Rate Limiting**: Consider adding rate limiting to prevent abuse
5. **Database Access**: Ensure your Turso database has proper access controls

## Troubleshooting

### Issue: "Invalid signature" error in webhook

**Solution**: Ensure your webhook URL in Twilio matches exactly (including protocol, domain, and path)

### Issue: WhatsApp messages not being sent

**Solution:**
- Verify `TWILIO_CONTENT_SID` matches your approved template
- Check Twilio Console → Messaging → Logs for errors
- Ensure phone number is in E.164 format (+country_code + number)

### Issue: Status always shows "pending"

**Solution:**
- Verify webhook is configured correctly in Twilio
- Check webhook logs for incoming requests
- Test the webhook endpoint manually
- Ensure the phone number in the webhook matches the database record

### Issue: Migration errors

**Solution:**
```bash
# Reset and regenerate migrations
pnpm db:generate
pnpm db:migrate
```

## Next Steps

1. **Add UI Dashboard**: Create admin pages to view/manage consent requests
2. **Add Notifications**: Notify building staff when entry is approved/denied
3. **Analytics**: Track consent response times and approval rates
4. **Multi-language**: Support multiple languages for consent messages
5. **Voice Integration**: Integrate with ElevenLabs for voice call fallback

## API Reference

### tRPC Endpoints

All endpoints are under `api.whatsappConsent.*`:

- `startConsent(input)` - Start a new consent request
- `getConsentStatus(input)` - Get status of a request
- `getConsentByPhone(input)` - Get consents for a phone number
- `markExpiredConsents()` - Mark expired requests as no_answer (admin)
- `getAllConsents(input)` - Get all consents (protected, requires auth)

### MCP Tools

- `start_whatsapp_consent` - Initiate consent request
- `get_consent_status` - Check consent status

## Support

For issues or questions:
1. Check the logs (webhook, MCP server, database)
2. Review Twilio Console → Messaging → Logs
3. Check this documentation
4. File an issue in the project repository

---

**Created**: 2025-11-07
**Last Updated**: 2025-11-07
**Version**: 1.0.0
