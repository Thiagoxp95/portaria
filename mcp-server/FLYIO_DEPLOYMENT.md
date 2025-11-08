# Deploy MCP Server to fly.io (FREE)

fly.io offers a **truly free tier** with **no credit card required** and **no spin down**!

## ✅ Why fly.io?

- ✅ **FREE tier** - No credit card needed initially
- ✅ **No spin down** - Always online (unlike Render)
- ✅ **3 shared VMs free** - More than enough
- ✅ **160GB bandwidth/month** - Plenty for this app
- ✅ **Global edge locations** - Deploy worldwide

## Free Tier Details

**Included for free:**
- 3 shared-cpu-1x VMs (256MB RAM each)
- 3GB persistent storage
- 160GB outbound bandwidth/month

**Perfect for this MCP server** which uses minimal resources.

---

## Prerequisites

Install fly.io CLI:

### macOS
```bash
brew install flyctl
```

### Linux/WSL
```bash
curl -L https://fly.io/install.sh | sh
```

### Windows (PowerShell)
```powershell
iwr https://fly.io/install.ps1 -useb | iex
```

---

## Step 1: Sign Up

```bash
flyctl auth signup
```

Or login if you have an account:
```bash
flyctl auth login
```

**No credit card required for free tier!**

---

## Step 2: Create fly.toml Configuration

Create this file in `mcp-server/fly.toml`:

```toml
app = "portaria-mcp"
primary_region = "sjc"  # Change to your nearest region

[build]
  dockerfile = "Dockerfile"

[env]
  PORT = "8080"

[http_service]
  internal_port = 8080
  force_https = true
  auto_stop_machines = false  # Keep running (important!)
  auto_start_machines = true
  min_machines_running = 1

[[vm]]
  cpu_kind = "shared"
  cpus = 1
  memory_mb = 256
```

**Regions you can use:**
- `sjc` - San Jose (US West)
- `iad` - Virginia (US East)
- `gru` - São Paulo (Brazil) ← Best for Brazil!
- `ams` - Amsterdam (Europe)
- `syd` - Sydney (Australia)

See all regions: `flyctl platform regions`

---

## Step 3: Initialize App

```bash
cd mcp-server

# Initialize (creates app on fly.io)
flyctl launch --no-deploy

# Answer prompts:
# - App name: portaria-mcp (or press enter for random)
# - Region: gru (for Brazil) or nearest to you
# - PostgreSQL: No
# - Redis: No
```

This creates the app but doesn't deploy yet (we need to add secrets first).

---

## Step 4: Add Environment Variables as Secrets

fly.io uses "secrets" for environment variables:

```bash
# Set all secrets at once
flyctl secrets set \
  DATABASE_URL="libsql://your-database.turso.io" \
  DATABASE_AUTH_TOKEN="your-turso-auth-token" \
  TWILIO_ACCOUNT_SID="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" \
  TWILIO_AUTH_TOKEN="your-twilio-auth-token" \
  TWILIO_WHATSAPP_FROM="whatsapp:+14155238886" \
  TWILIO_CONTENT_SID="HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

**Get these values from your `.env` file**

---

## Step 5: Deploy

```bash
flyctl deploy
```

First deployment takes 2-3 minutes. Watch the logs:

```bash
flyctl logs
```

When you see "🚀 Portaria MCP Server running on port 8080" - it's live!

---

## Step 6: Get Your URL

```bash
flyctl info
```

Your URL will be:
```
https://portaria-mcp.fly.dev
```

Or if you chose a different name:
```
https://your-app-name.fly.dev
```

---

## Step 7: Test Deployment

### Test Health Endpoint

```bash
curl https://portaria-mcp.fly.dev/health
```

Should return:
```json
{
  "status": "ok",
  "service": "portaria-mcp-server",
  "version": "1.0.0"
}
```

### Test SSE Endpoint

```bash
curl -N https://portaria-mcp.fly.dev/sse
```

Should stream events:
```
event: endpoint
data: https://portaria-mcp.fly.dev/message

: ping
```

---

## Step 8: Configure ElevenLabs

1. Go to **ElevenLabs Dashboard**
2. Navigate to **Your Agent** → **Integrations**
3. Click **"Add Custom MCP Server"**
4. Fill in:
   - **Name**: Portaria WhatsApp Consent
   - **Description**: Manages visitor consent via WhatsApp
   - **Server Type**: SSE
   - **Server URL**: `https://portaria-mcp.fly.dev/sse`
   - **Secret Token**: (leave empty)
5. Click **"Save"**
6. Test connection - should work immediately! ✅

---

## Monitoring & Management

### View Logs (Real-time)

```bash
flyctl logs
```

### Check App Status

```bash
flyctl status
```

### View Metrics

```bash
flyctl dashboard
```

Opens web dashboard with:
- Request rates
- Response times
- CPU/Memory usage
- Error logs

### SSH into VM (for debugging)

```bash
flyctl ssh console
```

---

## Auto-Deploy from GitHub

Set up automatic deployment on git push:

### Option 1: GitHub Actions

Create `.github/workflows/deploy-mcp.yml`:

```yaml
name: Deploy MCP to fly.io

on:
  push:
    branches: [main]
    paths:
      - 'mcp-server/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - uses: superfly/flyctl-actions/setup-flyctl@master

      - run: flyctl deploy --remote-only
        working-directory: ./mcp-server
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
```

Add `FLY_API_TOKEN` to GitHub secrets:
1. Get token: `flyctl auth token`
2. GitHub repo → Settings → Secrets → New secret
3. Name: `FLY_API_TOKEN`, Value: (paste token)

### Option 2: Manual Deploy

Just run:
```bash
cd mcp-server
flyctl deploy
```

---

## Scaling (Still Free!)

You get **3 free VMs**. To add redundancy:

```bash
# Scale to 2 VMs for redundancy
flyctl scale count 2

# Scale back to 1
flyctl scale count 1
```

Both are within free tier!

---

## Troubleshooting

### App Won't Start

**Check logs:**
```bash
flyctl logs
```

**Common issues:**
- Missing secrets: `flyctl secrets list`
- Build errors: Check Dockerfile
- Port mismatch: Ensure using 8080 in fly.toml

### Database Connection Failed

**Check secrets are set:**
```bash
flyctl secrets list
```

Should see:
```
NAME
DATABASE_AUTH_TOKEN
DATABASE_URL
TWILIO_ACCOUNT_SID
...
```

**Update a secret:**
```bash
flyctl secrets set DATABASE_URL="new-value"
```

### High Memory Usage

**Check metrics:**
```bash
flyctl dashboard
```

**If needed, scale to larger VM (still free tier):**
```bash
flyctl scale vm shared-cpu-1x --memory 512
```

---

## Cost Monitoring

### Check Usage

```bash
flyctl billing show
```

Shows:
- VMs used (3 free)
- Bandwidth used (160GB free)
- Storage used (3GB free)

### Alerts

fly.io will email you if approaching limits.

**Free tier limits:**
- ✅ 3 VMs: You're using 1 (well within limits)
- ✅ 160GB bandwidth: This app uses ~1-5GB/month
- ✅ 3GB storage: This app uses ~0GB (stateless)

**You should stay free indefinitely!**

---

## Custom Domain (Optional)

Add your own domain:

```bash
# Add certificate
flyctl certs create portaria-mcp.yourdomain.com

# Add DNS record (from output):
# CNAME portaria-mcp.yourdomain.com -> portaria-mcp.fly.dev
```

---

## Upgrading (If Needed)

If you outgrow free tier:

**More VMs**: $1.94/month per additional VM
**More bandwidth**: $0.02/GB over 160GB

**For this app**: Free tier is more than enough!

---

## Comparison with Other Platforms

| Platform | Free Tier | Spin Down | Best For |
|----------|-----------|-----------|----------|
| **fly.io** | ✅ 3 VMs | ❌ No | ✅ **Recommended!** |
| Render | ✅ 750hrs/mo | ✅ Yes (15min) | Testing |
| Railway | ❌ None | ❌ No | Paid only |
| Vercel | ✅ Unlimited | N/A | ❌ No SSE |

**Winner: fly.io** ✨

---

## Commands Cheatsheet

```bash
# Deploy
flyctl deploy

# View logs
flyctl logs

# Check status
flyctl status

# View secrets
flyctl secrets list

# Update secret
flyctl secrets set KEY="value"

# Scale
flyctl scale count 2

# SSH into VM
flyctl ssh console

# Restart app
flyctl apps restart portaria-mcp
```

---

## Next Steps

1. ✅ Deploy to fly.io
2. ✅ Configure ElevenLabs
3. ✅ Test visitor workflow
4. 📊 Monitor for a week
5. 🎉 Enjoy free hosting!

## Support

- **fly.io Docs**: [fly.io/docs](https://fly.io/docs)
- **fly.io Community**: [community.fly.io](https://community.fly.io)
- **Status**: [status.fly.io](https://status.fly.io)

---

**Created**: 2025-11-07
**Cost**: $0/month (free tier)
**Recommended For**: Production use (no spin down!)
