# Test SSE Connection

## Quick Test from Browser

Open your browser's developer console and run:

```javascript
const eventSource = new EventSource('https://portaria-mu.vercel.app/api/mcp/sse');

eventSource.onopen = () => {
  console.log('✅ SSE connection opened successfully');
};

eventSource.addEventListener('endpoint', (event) => {
  console.log('📡 Received endpoint event:', event.data);
});

eventSource.onmessage = (event) => {
  console.log('📨 Received message:', event.data);
};

eventSource.onerror = (error) => {
  console.error('❌ SSE error:', error);
  console.log('Connection state:', eventSource.readyState);
  // 0 = CONNECTING, 1 = OPEN, 2 = CLOSED
};

// Close after 10 seconds
setTimeout(() => {
  eventSource.close();
  console.log('Connection closed');
}, 10000);
```

## Test with curl

```bash
curl -N https://portaria-mu.vercel.app/api/mcp/sse
```

You should see:
```
event: endpoint
data: https://portaria-mu.vercel.app/api/mcp/sse

: ping
```

## Test MCP Initialize

```bash
curl -X POST https://portaria-mu.vercel.app/api/mcp/sse \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": {
        "name": "test-client",
        "version": "1.0.0"
      }
    }
  }'
```

Expected response:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "protocolVersion": "2024-11-05",
    "capabilities": {
      "tools": {}
    },
    "serverInfo": {
      "name": "whatsapp-consent-server",
      "version": "1.0.0"
    }
  }
}
```

## Test Tool Call

```bash
curl -X POST https://portaria-mu.vercel.app/api/mcp/sse \
  -H "Content-Type": application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "get_phone_by_apartment",
      "arguments": {
        "apartmentNumber": "1507"
      }
    }
  }'
```

## Common Issues

### CORS Error
If you see CORS errors in the browser console:
- Make sure the deployment has the latest code with CORS headers
- Check that Vercel deployment is complete

### Connection Timeout
If the SSE connection times out:
- Check Vercel function logs for errors
- Verify the endpoint is accessible: `curl https://portaria-mu.vercel.app/api/mcp/test`

### ElevenLabs "Failed to connect"
Possible causes:
1. **CORS not enabled** - Fixed in latest deploy
2. **Vercel timeout** - SSE connections might hit Vercel's timeout limits on Hobby plan
3. **Wrong URL** - Make sure using `/api/mcp/sse` not `/api/mcp/test`
4. **ElevenLabs expects different format** - They might need HTTP Streamable instead of SSE

## Vercel Limitations

**Important:** Vercel Hobby plan has limitations:
- Function execution timeout: 10 seconds
- No support for long-running connections (like SSE)
- Serverless functions are stateless

For production SSE with ElevenLabs, consider:
1. **Upgrade to Vercel Pro** (60s timeout)
2. **Use a different host** (Railway, Render, fly.io) that supports persistent connections
3. **Use HTTP polling instead of SSE** (less efficient but works on serverless)

## Alternative: HTTP Streamable Transport

If SSE doesn't work on Vercel, you can implement HTTP Streamable transport which is the newer MCP standard. This works better with serverless since each request is independent.
