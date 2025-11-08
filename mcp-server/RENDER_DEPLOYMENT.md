# Deploy MCP Server to Render.com (FREE)

Render.com offers a **generous free tier** with **no credit card required**! Perfect for testing and light production use.

## ✅ Why Render?

- ✅ **100% FREE tier** - No credit card needed
- ✅ **750 hours/month free** - More than enough for 24/7 operation
- ✅ **Persistent connections** - Perfect for SSE
- ✅ **Automatic HTTPS** - Free SSL certificates
- ✅ **Easy GitHub deployment** - Auto-deploy on push

## ⚠️ Free Tier Limitations

- **Spins down after 15 minutes of inactivity** (restarts automatically on request)
- **First request after sleep takes ~30 seconds** to wake up
- **Shared CPU** - Slower than paid plans but fine for this use case

**For production**: Upgrade to Starter ($7/month) for always-on service.

---

## Step 1: Create Render Account

1. Go to [render.com](https://render.com)
2. Sign up with GitHub (easiest)
3. **No credit card required** ✅

## Step 2: Create New Web Service

1. Click **"New +"** button
2. Select **"Web Service"**
3. Connect your GitHub account if not connected
4. Search for **`portaria`** repository
5. Click **"Connect"**

## Step 3: Configure Service

Fill in the form:

### Basic Settings
- **Name**: `portaria-mcp-server` (or any name you like)
- **Region**: Choose closest to you (e.g., Oregon if in US)
- **Branch**: `main`
- **Root Directory**: `mcp-server`

### Build Settings
- **Runtime**: `Docker`
- **Dockerfile Path**: `mcp-server/Dockerfile`

### Plan
- **Instance Type**: **Free** (select this!)

Click **"Create Web Service"** (you'll add env vars next)

## Step 4: Add Environment Variables

Before the service deploys:

1. Scroll down to **"Environment Variables"**
2. Click **"Add Environment Variable"**
3. Add each one:

```
DATABASE_URL=libsql://your-database.turso.io
DATABASE_AUTH_TOKEN=your-turso-auth-token
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
TWILIO_CONTENT_SID=HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Get these values from your main app's `.env` file**

4. Click **"Save Changes"**

## Step 5: Wait for Deployment

- First deployment takes 3-5 minutes
- Watch the logs in real-time
- When you see "🚀 Portaria MCP Server running on port 3000" - it's ready!

## Step 6: Get Your URL

Render automatically provides a URL:

```
https://portaria-mcp-server.onrender.com
```

You can find it at the top of your service page.

## Step 7: Test the Deployment

### Test Health Endpoint

Visit in your browser:
```
https://portaria-mcp-server.onrender.com/health
```

Should see:
```json
{
  "status": "ok",
  "service": "portaria-mcp-server",
  "version": "1.0.0"
}
```

### Test SSE Endpoint

In terminal:
```bash
curl -N https://portaria-mcp-server.onrender.com/sse
```

Should see streaming events:
```
event: endpoint
data: https://portaria-mcp-server.onrender.com/message

: ping
```

## Step 8: Configure ElevenLabs

1. Go to **ElevenLabs Dashboard**
2. Navigate to **Your Agent** → **Integrations**
3. Click **"Add Custom MCP Server"**
4. Fill in:
   - **Name**: Portaria WhatsApp Consent
   - **Description**: Manages visitor consent via WhatsApp
   - **Server Type**: SSE
   - **Server URL**: `https://portaria-mcp-server.onrender.com/sse`
   - **Secret Token**: (leave empty)
5. Click **"Save"**
6. Test the connection!

## Step 9: Keep Service Awake (Optional)

Since the free tier spins down after 15 minutes, you can keep it awake with:

### Option 1: UptimeRobot (Free)

1. Sign up at [uptimerobot.com](https://uptimerobot.com) (free)
2. Add new monitor:
   - **Type**: HTTP(s)
   - **URL**: `https://portaria-mcp-server.onrender.com/health`
   - **Interval**: 5 minutes
3. This pings your service every 5 minutes, keeping it awake!

### Option 2: Cron Job (Free)

If you have a server or use GitHub Actions:

```yaml
# .github/workflows/keep-alive.yml
name: Keep MCP Server Alive
on:
  schedule:
    - cron: '*/5 * * * *' # Every 5 minutes
jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - run: curl https://portaria-mcp-server.onrender.com/health
```

### Option 3: Upgrade to Starter ($7/month)

For production use, upgrade to Starter plan:
- Always on (no spin down)
- Faster performance
- More resources

---

## Auto-Deploy on Git Push

Render automatically redeploys when you push to GitHub:

```bash
cd mcp-server/src
# Make changes...

git add .
git commit -m "Update MCP server"
git push

# Render auto-deploys! 🎉
```

## Monitoring

### View Logs

1. Go to your service in Render dashboard
2. Click **"Logs"** tab
3. See real-time logs

### Metrics

Render provides:
- Request count
- Response times
- Error rates
- Memory usage

## Troubleshooting

### Service Won't Start

**Check logs in Render dashboard**

Common issues:
- Missing environment variables
- Database connection failed
- TypeScript build errors

**Solution**: Check "Logs" tab for specific error

### "Service Unavailable" Error

**Cause**: Service is spinning up from sleep (free tier)

**Solution**:
- Wait 30 seconds and try again
- Set up UptimeRobot to keep it awake
- Or upgrade to Starter plan

### ElevenLabs "Failed to Connect"

**First request after sleep takes ~30s**

**Solutions**:
1. Wake up service first: Visit `/health` endpoint
2. Wait 30 seconds, then configure ElevenLabs
3. Set up UptimeRobot to prevent sleep

## Cost Comparison

| Platform | Free Tier | Paid Plan | Best For |
|----------|-----------|-----------|----------|
| **Render** | ✅ 750hrs/mo | $7/mo | Testing & light use |
| Railway | ❌ None | $5/mo | Production |
| fly.io | ✅ Limited | $5/mo | Global scale |
| Vercel | ✅ Unlimited | $20/mo | ❌ No SSE support |

## Upgrading to Paid

If you need always-on service:

1. Go to service settings
2. Change plan to **Starter** ($7/month)
3. Add payment method
4. Service stays online 24/7

**Benefits**:
- No spin down delay
- Better performance
- More CPU/RAM
- Priority support

## Alternative Free Options

### fly.io (Also Free)

- **Free tier**: 3 shared VMs, 160GB bandwidth/month
- **No spin down** like Render
- See `FLYIO_DEPLOYMENT.md` for guide

### Koyeb (Free)

- **Free tier**: 1 service, always on
- No credit card for 14 days
- After trial: Need payment method

---

## Next Steps

1. ✅ Deploy to Render (free)
2. ✅ Configure ElevenLabs
3. ✅ Test with a visitor flow
4. 📊 Monitor usage for a week
5. 💰 Decide if you need paid plan ($7/mo for always-on)

## Support

- **Render Docs**: [render.com/docs](https://render.com/docs)
- **Render Discord**: Active community
- **This Project**: Check service logs in dashboard

---

**Created**: 2025-11-07
**Cost**: $0/month (free tier)
**Recommended For**: Testing and light production use
