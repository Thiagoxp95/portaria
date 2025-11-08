# MCP SSE Server - Quick Start Guide

## Overview

Your Portaria app includes a production-ready MCP (Model Context Protocol) server accessible via SSE (Server-Sent Events) for integration with ElevenLabs conversational agents.

## Endpoints

### 🧪 Test Endpoint
```
GET https://your-domain.com/api/mcp/test
```
Returns server status and available tools. Use this to verify deployment.

### 🔌 SSE Connection Endpoint
```
GET https://your-domain.com/api/mcp/sse
```
Establishes SSE connection for real-time communication.

### 📨 MCP Protocol Endpoint
```
POST https://your-domain.com/api/mcp/sse
```
Handles MCP JSON-RPC 2.0 protocol messages.

## Available Tools

### 1. start_whatsapp_consent

Sends a WhatsApp consent request to a resident.

**Parameters:**
```json
{
  "to": "+5511999999999",    // Phone number with country code
  "apt": "1507",             // Apartment number
  "visitor": "John Doe",     // Visitor name
  "company": "Amazon",       // Company/delivery name
  "ttl": 300                 // Optional: Time to live in seconds
}
```

**Returns:**
```json
{
  "conversationSid": "SMxxx...",
  "status": "pending",
  "message": "WhatsApp consent request sent successfully"
}
```

### 2. get_consent_status

Retrieves the current status of a consent request.

**Parameters:**
```json
{
  "conversationSid": "SMxxx..."
}
```

**Returns:**
```json
{
  "conversationSid": "SMxxx...",
  "status": "approved|denied|pending|no_answer|failed",
  "apt": "1507",
  "visitor": "John Doe",
  "company": "Amazon",
  "decidedAt": "2025-11-07T...",
  "transcript": [...]
}
```

## ElevenLabs Configuration

### Step 1: Deploy Your App

Deploy to Vercel (recommended):
```bash
vercel
```

Or use Railway, Render, or any Next.js hosting platform.

### Step 2: Test the Deployment

Visit: `https://your-app.vercel.app/api/mcp/test`

Expected response:
```json
{
  "status": "ok",
  "message": "MCP SSE server is running",
  "endpoints": {...},
  "tools": [...]
}
```

### Step 3: Configure ElevenLabs

1. **Go to:** ElevenLabs Dashboard → Your Agent → Tools/Integrations
2. **Click:** "Add Custom MCP Server"
3. **Enter:**
   - **Name:** `WhatsApp Consent Manager`
   - **Description:** `Manages visitor consent via WhatsApp`
   - **Server Type:** `SSE`
   - **Server URL:** `https://your-app.vercel.app/api/mcp/sse`
   - **Tool Approval Mode:** `Always Ask` (recommended)
4. **Check:** "I trust this server"
5. **Save**

### Step 4: Configure Agent Prompt

Add this to your ElevenLabs agent prompt:

```
VISITOR ARRIVAL PROTOCOL:

When a visitor arrives at the building:
1. Greet warmly: "Hello! Welcome to [Building Name]. How can I help you?"
2. Ask: "What's your name?" (save as visitor_name)
3. Ask: "Which company are you from?" (save as company_name)
4. Ask: "Which apartment are you visiting?" (save as apartment)
5. Ask: "Do you have the resident's phone number, or should I use the one on file?" (save as phone)

Then execute:
6. Call start_whatsapp_consent with the collected information
7. Save the returned conversationSid
8. Say: "I'm sending a WhatsApp message to the resident now. Please wait while they respond."

9. Wait 10 seconds, then call get_consent_status
10. If status is "pending":
    - Say: "Still waiting for the resident's response..."
    - Wait another 10 seconds and check again
    - Repeat for up to 5 minutes (30 checks total)

11. Handle responses:
    - If "approved": "Great news! The resident has approved your entry. Please proceed to apartment [number]."
    - If "denied": "I'm sorry, but the resident has declined your visit at this time."
    - If "no_answer" after 5 minutes: "The resident hasn't responded yet. You may want to try calling them directly, or I can take a message."
    - If "failed": "There was an issue with the consent request. Let me get building staff to assist you."

Always be polite, professional, and helpful.
```

## Local Development

### Option 1: Test with ngrok

```bash
# Terminal 1: Start Next.js
pnpm dev

# Terminal 2: Expose with ngrok
ngrok http 3000

# Use the ngrok URL in ElevenLabs:
# https://abc123.ngrok.io/api/mcp/sse
```

### Option 2: Test with mcp-proxy

```bash
# Install mcp-proxy
npm install -g @sparfenyuk/mcp-proxy

# Start proxy
mcp-proxy --port 3001 -- pnpm mcp:server

# Use in ElevenLabs:
# http://localhost:3001/sse (local only)
```

## Protocol Details

### MCP JSON-RPC Format

**Initialize:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "2024-11-05",
    "clientInfo": {
      "name": "elevenlabs-agent",
      "version": "1.0.0"
    }
  }
}
```

**List Tools:**
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/list"
}
```

**Call Tool:**
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "start_whatsapp_consent",
    "arguments": {
      "to": "+5511999999999",
      "apt": "1507",
      "visitor": "John Doe",
      "company": "Amazon"
    }
  }
}
```

## Troubleshooting

### Server Not Responding

1. Check deployment: `https://your-domain.com/api/mcp/test`
2. Verify environment variables are set (DATABASE_URL, TWILIO_*, etc.)
3. Check server logs in your hosting platform

### ElevenLabs Can't Connect

1. Ensure URL is correct and publicly accessible
2. Verify SSL certificate (must be HTTPS in production)
3. Check CORS settings if needed
4. Test SSE connection manually with curl:
   ```bash
   curl -N https://your-domain.com/api/mcp/sse
   ```

### Tools Not Working

1. Verify Twilio credentials in `.env`
2. Check Twilio WhatsApp template is approved
3. Test directly via tRPC API:
   ```bash
   curl -X POST https://your-domain.com/api/trpc/whatsappConsent.startConsent \
     -H "Content-Type: application/json" \
     -d '{"to":"+5511999999999","apt":"101","visitor":"Test","company":"Test Co"}'
   ```

## Security

- **Tool Approval Mode:** Always use "Always Ask" in production
- **Environment Variables:** Never commit `.env` files
- **HTTPS:** Always use HTTPS in production
- **Rate Limiting:** Consider adding rate limiting to the MCP endpoint
- **Authentication:** Add authentication headers if needed

## Next Steps

1. ✅ Deploy your app
2. ✅ Test the `/api/mcp/test` endpoint
3. ✅ Configure Twilio credentials
4. ✅ Set up ElevenLabs MCP server
5. ✅ Test with a real visitor scenario
6. 📱 Set up monitoring and alerts
7. 📊 Add analytics for consent requests

## Support

For issues:
- Check the main setup guide: `WHATSAPP_CONSENT_SETUP.md`
- Review Twilio configuration
- Test endpoints individually
- Check server logs

---

**Ready to deploy?** Run `vercel` and start using your WhatsApp consent system with ElevenLabs!
