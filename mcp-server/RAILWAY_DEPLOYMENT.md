# Deploy MCP Server to Railway

This guide will help you deploy the standalone MCP server to Railway, which supports long-running connections perfect for SSE.

## Why Railway?

- ✅ **No timeout limits** - Perfect for persistent SSE connections
- ✅ **Simple deployment** - Deploy from GitHub in minutes
- ✅ **$5/month** - Much cheaper than Vercel Pro ($20/month)
- ✅ **Free trial** - $5 credit to start

## Prerequisites

1. **Railway Account**: Sign up at [railway.app](https://railway.app)
2. **GitHub Account**: To connect your repository
3. **Environment Variables**: From your `.env` file

## Step 1: Push MCP Server to GitHub

```bash
cd /Users/txp/Pessoal/Portaria/portaria

# Add and commit the mcp-server directory
git add mcp-server/
git commit -m "Add standalone MCP server for Railway deployment"
git push
```

## Step 2: Create New Project on Railway

1. Go to [railway.app](https://railway.app)
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Connect your GitHub account if not already connected
5. Select the **`portaria`** repository
6. Railway will detect the Dockerfile automatically

## Step 3: Configure Build Settings

Railway should auto-detect the Dockerfile, but if not:

1. Click on your project
2. Go to **Settings**
3. Under **Build**, set:
   - **Root Directory**: `mcp-server`
   - **Dockerfile Path**: `mcp-server/Dockerfile`

## Step 4: Add Environment Variables

In Railway dashboard:

1. Click on your service
2. Go to **Variables** tab
3. Click **"+ New Variable"**
4. Add each variable:

```env
DATABASE_URL=libsql://your-database.turso.io
DATABASE_AUTH_TOKEN=your-turso-auth-token
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
TWILIO_CONTENT_SID=HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Where to get these values:**
- Copy from your main app's `.env` file
- These are the SAME credentials used by your Vercel deployment

## Step 5: Deploy

1. Railway will automatically deploy after you add environment variables
2. Wait for deployment to complete (usually 2-3 minutes)
3. Once deployed, Railway will provide a public URL

## Step 6: Get Your MCP Server URL

1. In Railway dashboard, click on your service
2. Go to **Settings** → **Networking**
3. Click **"Generate Domain"**
4. Your MCP server URL will be: `https://your-app.railway.app`

## Step 7: Test the Deployment

Open your browser and visit:

```
https://your-app.railway.app/health
```

You should see:
```json
{
  "status": "ok",
  "service": "portaria-mcp-server",
  "version": "1.0.0",
  "timestamp": "2025-11-07T..."
}
```

Test the SSE endpoint:
```
https://your-app.railway.app/sse
```

You should see streaming events.

## Step 8: Configure ElevenLabs

Now configure your ElevenLabs agent to use the Railway MCP server:

1. Go to ElevenLabs Dashboard
2. Navigate to your Agent → Integrations
3. Click "Add Custom MCP Server"
4. Fill in:
   - **Name**: Portaria WhatsApp Consent
   - **Description**: Manages visitor consent via WhatsApp
   - **Server Type**: SSE
   - **Server URL**: `https://your-app.railway.app/sse`
   - **Secret Token**: (leave empty for now)
5. Click "Save"

## Step 9: Test with ElevenLabs

Try connecting from ElevenLabs. It should now connect successfully!

## Monitoring & Logs

### View Logs

In Railway dashboard:
1. Click on your service
2. Go to **Deployments** tab
3. Click on the latest deployment
4. View real-time logs

### Check Metrics

Railway provides:
- CPU usage
- Memory usage
- Network traffic
- Request logs

## Troubleshooting

### Build Fails

**Error: Cannot find module**
```bash
# Make sure package.json has all dependencies
cd mcp-server
npm install
```

**Error: TypeScript compilation failed**
```bash
# Test locally first
npm run build
```

### Runtime Errors

**Error: DATABASE_URL not set**
- Check environment variables in Railway dashboard
- Make sure all variables are added

**Error: Twilio credentials invalid**
- Verify Twilio credentials in `.env`
- Test credentials work in your main app first

### Connection Issues from ElevenLabs

**"Failed to connect"**
1. Check Railway logs for errors
2. Test SSE endpoint manually: `curl https://your-app.railway.app/sse`
3. Verify CORS headers are working

**"Connection timeout"**
- Railway should NOT timeout - this is the benefit over Vercel
- Check if app crashed - view logs in Railway

## Cost Estimation

Railway pricing:
- **Free trial**: $5 credit (lasts ~1 month for this app)
- **After trial**: ~$5/month for this size app
- **Pricing model**: Pay for what you use (CPU + RAM)

This MCP server is very lightweight:
- Minimal CPU usage (only when handling requests)
- Low memory (~50-100 MB)
- **Estimated cost**: $5-7/month

## Updates & Redeployment

Railway automatically redeploys when you push to GitHub:

```bash
# Make changes to mcp-server/
cd mcp-server/src
# Edit files...

# Commit and push
git add .
git commit -m "Update MCP server"
git push

# Railway will auto-deploy!
```

## Alternative: Manual Docker Deploy

If you prefer manual control:

```bash
cd mcp-server

# Build Docker image
docker build -t portaria-mcp .

# Run locally to test
docker run -p 3000:3000 --env-file .env portaria-mcp

# Visit http://localhost:3000/health
```

## Next Steps

Once deployed and working:

1. **Update documentation** - Note the Railway URL for your team
2. **Monitor usage** - Check Railway dashboard weekly
3. **Set up alerts** - Railway can notify you of issues
4. **Consider redundancy** - Deploy to multiple regions if needed

## Support

- **Railway Docs**: [docs.railway.app](https://docs.railway.app)
- **Railway Discord**: Active community support
- **This project**: Check logs in Railway dashboard

---

**Created**: 2025-11-07
**Last Updated**: 2025-11-07
