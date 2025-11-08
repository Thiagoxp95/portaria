# Portaria MCP Server - Standalone Deployment

Standalone MCP server for WhatsApp consent system that supports persistent SSE connections for ElevenLabs integration.

## 🎯 Problem This Solves

Vercel's serverless architecture has timeout limitations (10s on Hobby, 60s on Pro) that prevent persistent SSE connections needed by ElevenLabs MCP integration.

This standalone server runs on platforms that support long-running processes and persistent connections.

## 🚀 Quick Start - Choose Your Platform

### Option 1: fly.io (✨ RECOMMENDED - FREE)

**Best choice:** Free tier, no credit card, **NO SPIN DOWN**, always online!

```bash
# Install flyctl
brew install flyctl  # macOS
# or see FLYIO_DEPLOYMENT.md for other OS

# Login
flyctl auth signup  # or: flyctl auth login

# Deploy
cd mcp-server
flyctl launch --no-deploy
flyctl secrets set DATABASE_URL="..." DATABASE_AUTH_TOKEN="..." ...
flyctl deploy

# Your MCP server is live at: https://portaria-mcp.fly.dev
```

📖 **Complete guide**: [FLYIO_DEPLOYMENT.md](./FLYIO_DEPLOYMENT.md)

---

### Option 2: Render.com (FREE)

**Good choice:** Free tier, no credit card, but **spins down after 15min** of inactivity.

1. Go to [render.com](https://render.com)
2. Sign up (no credit card!)
3. New Web Service → Connect GitHub
4. Select `portaria` repo
5. Root directory: `mcp-server`
6. Runtime: Docker
7. Add environment variables
8. Deploy!

📖 **Complete guide**: [RENDER_DEPLOYMENT.md](./RENDER_DEPLOYMENT.md)

---

### Option 3: Railway (PAID)

**Production choice:** No free tier, but reliable $5/month service.

📖 **Complete guide**: [RAILWAY_DEPLOYMENT.md](./RAILWAY_DEPLOYMENT.md)

---

## 📊 Platform Comparison

| Platform | Free Tier | Credit Card | Spin Down | Cost/Month | Best For |
|----------|-----------|-------------|-----------|------------|----------|
| **fly.io** ✨ | ✅ Yes | ❌ No | ❌ No | $0 | **Production (Recommended!)** |
| Render | ✅ Yes | ❌ No | ✅ 15min | $0 ($7 for always-on) | Testing |
| Railway | ❌ No | ✅ Yes | ❌ No | $5 | Production |
| Vercel | ✅ Yes | ❌ No | N/A | $0 ($20 Pro) | ❌ No SSE support |

**Winner: fly.io** - Free, no credit card, no spin down, perfect for this use case!

---

## 🛠️ Local Development

```bash
cd mcp-server

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
# Edit .env with your credentials

# Run in development mode
npm run dev

# Visit http://localhost:3000/health
```

---

## 🧪 Testing

### Health Check
```bash
curl https://your-app.onrender.com/health
```

### SSE Connection
```bash
curl -N https://your-app.onrender.com/sse
```

### MCP Initialize
```bash
curl -X POST https://your-app.onrender.com/message \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": {"name": "test", "version": "1.0.0"}
    }
  }'
```

---

## 🔧 Environment Variables

Required:
```env
DATABASE_URL=libsql://your-database.turso.io
DATABASE_AUTH_TOKEN=your-turso-auth-token
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
TWILIO_CONTENT_SID=HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Optional:
```env
PORT=3000  # Auto-set by hosting platform
```

**Copy these from your main app's `.env` file!**

---

## 🔌 ElevenLabs Configuration

Once deployed, configure ElevenLabs:

1. Go to ElevenLabs Dashboard
2. Your Agent → Integrations
3. Add Custom MCP Server
4. Fill in:
   - **Server Type**: SSE
   - **Server URL**: `https://your-app.fly.dev/sse`
   - **Secret Token**: (leave empty)
5. Save and test!

---

## 📡 Available Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Server info |
| `/health` | GET | Health check |
| `/sse` | GET | SSE connection (for ElevenLabs) |
| `/message` | POST | MCP protocol messages |

---

## 🛠️ Available MCP Tools

1. **`get_phone_by_apartment`**
   - Input: `{ apartmentNumber: "1507" }`
   - Returns: `{ phoneNumber: "+5511999999999", residentName: "..." }`

2. **`start_whatsapp_consent`**
   - Input: `{ to: "+5511999999999", apt: "1507", visitor: "John", company: "Amazon" }`
   - Returns: `{ conversationSid: "SM...", status: "pending" }`

3. **`get_consent_status`**
   - Input: `{ conversationSid: "SM..." }`
   - Returns: `{ status: "approved|denied|pending", ... }`

---

## 📁 Project Structure

```
mcp-server/
├── src/
│   ├── index.ts          # Express server with SSE
│   ├── mcp-handler.ts    # MCP protocol implementation
│   └── schema.ts         # Database schemas
├── Dockerfile            # Container configuration
├── fly.toml              # fly.io configuration
├── package.json          # Dependencies
├── tsconfig.json         # TypeScript config
└── README.md            # This file
```

---

## 🐛 Troubleshooting

### Connection Issues

**ElevenLabs can't connect:**
1. Check server is running: Visit `/health` endpoint
2. Check logs on hosting platform
3. Verify SSE endpoint works: `curl -N https://your-app/sse`
4. If using Render free tier, service may be sleeping (wait 30s)

### Database Errors

**"DATABASE_URL not set":**
- Verify environment variables are configured on hosting platform
- Check secrets/env vars in platform dashboard

### Build Failures

**TypeScript errors:**
```bash
# Test build locally
npm run build
```

**Missing dependencies:**
```bash
npm install
```

---

## 💰 Cost Estimates

### fly.io (Recommended)
- **Free tier**: 3 VMs, 160GB bandwidth
- **This app uses**: 1 VM, ~1-5GB/month
- **Cost**: **$0/month** ✅

### Render
- **Free tier**: 750 hours/month (more than 24/7)
- **Spin down**: After 15 minutes (wakes automatically)
- **Cost**: **$0/month** (or $7/mo for always-on)

### Railway
- **No free tier**
- **Cost**: ~$5/month

---

## 🔄 Updates & Redeployment

### fly.io
```bash
cd mcp-server
flyctl deploy
```

### Render
- Auto-deploys on git push to main branch

### Railway
- Auto-deploys on git push to main branch

---

## 📚 Documentation

- [fly.io Deployment Guide](./FLYIO_DEPLOYMENT.md) ⭐ Recommended
- [Render Deployment Guide](./RENDER_DEPLOYMENT.md)
- [Railway Deployment Guide](./RAILWAY_DEPLOYMENT.md)
- [Main App Setup](../WHATSAPP_CONSENT_SETUP.md)

---

## 🆘 Support

- Check deployment guides for platform-specific help
- View logs on your hosting platform dashboard
- Test endpoints manually before configuring ElevenLabs

---

**Created**: 2025-11-07
**Recommended Platform**: fly.io (free, no spin down)
**Alternative**: Render.com (free with spin down)
