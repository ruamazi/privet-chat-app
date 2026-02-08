# Deploying to Vercel

This guide will walk you through deploying Privet Chat to Vercel.

## Prerequisites

1. A Vercel account (free tier works fine)
2. An Upstash account with Redis database
3. Your project code pushed to GitHub/GitLab/Bitbucket

## Step 1: Prepare Upstash Redis

1. Go to [Upstash Console](https://console.upstash.com/)
2. Create a new Redis database
3. Once created, go to the "REST API" section
4. Copy the `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`
5. **Note**: Upstash Realtime uses the same Redis instance, no separate setup needed

## Step 2: Prepare Your Repository

Make sure your code is committed and pushed to a Git repository:

```bash
git add .
git commit -m "Ready for Vercel deployment"
git push origin main
```

## Step 3: Deploy to Vercel

### Option A: Using Vercel CLI

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Login to Vercel:
```bash
vercel login
```

3. Deploy:
```bash
vercel
```

4. Follow the prompts and set your environment variables when asked.

### Option B: Using Vercel Dashboard (Recommended)

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New Project"
3. Import your Git repository
4. Configure the project:
   - **Framework Preset**: Next.js
   - **Build Command**: `bun run build`
   - **Output Directory**: `.next`
   - **Install Command**: `bun install`

5. Add Environment Variables:
   - `UPSTASH_REDIS_REST_URL`: Your Upstash Redis URL
   - `UPSTASH_REDIS_REST_TOKEN`: Your Upstash Redis token

6. Click "Deploy"

## Step 4: Configure Environment Variables

If you didn't set them during deployment:

1. Go to your project in Vercel Dashboard
2. Click "Settings" → "Environment Variables"
3. Add the following:

| Name | Value | Environment |
|------|-------|-------------|
| `UPSTASH_REDIS_REST_URL` | `https://your-db.upstash.io` | Production, Preview, Development |
| `UPSTASH_REDIS_REST_TOKEN` | `your-token` | Production, Preview, Development |

4. Redeploy if necessary

## Step 5: Verify Deployment

1. Once deployed, Vercel will provide you with a URL (e.g., `https://your-app.vercel.app`)
2. Visit the URL and test:
   - Create a room
   - Share the link
   - Send messages
   - Test self-destruct timer
   - Test encryption

## Troubleshooting

### Build Errors

If you encounter build errors:

1. Check that all dependencies are in `package.json`
2. Ensure `bun.lock` is committed to your repo
3. Try running locally first: `bun run build`

### Redis Connection Errors

If the app can't connect to Redis:

1. Verify your Upstash credentials are correct
2. Check that the Redis database is in the same region as your Vercel deployment
3. Ensure the REST API is enabled in Upstash

### Proxy/Middleware Issues

The app uses Next.js Proxy (formerly Middleware) for room access control. If you get 500 errors:

1. Check Vercel function logs in the dashboard
2. Verify Redis connection in the proxy
3. Ensure the proxy file is at `src/proxy.ts`

### Real-time Not Working

If messages don't appear in real-time:

1. Check browser console for WebSocket errors
2. Verify Redis is working (check Upstash dashboard)
3. Ensure the `/api/realtime` route is accessible

## Performance Optimization

### Enable Vercel Edge Network

Your app will automatically use Vercel's Edge Network for static assets.

### Redis Region

For best performance, deploy your Vercel app in a region close to your Upstash Redis:
- Upstash supports multiple regions
- Vercel supports `iad1` (US East), `sin1` (Singapore), etc.

### Environment-Specific Settings

For production, you might want to:

1. Use separate Redis databases for production/preview
2. Set `NODE_ENV=production`
3. Enable Vercel Analytics

## Updating Your Deployment

To update:

```bash
git add .
git commit -m "Update feature X"
git push origin main
```

Vercel will automatically redeploy on push.

## Custom Domain (Optional)

1. In Vercel Dashboard, go to your project
2. Click "Settings" → "Domains"
3. Add your custom domain
4. Follow DNS configuration instructions

## Security Considerations

1. **Never commit `.env` file** - Use Vercel environment variables
2. **Rotate tokens periodically** - Update Redis tokens in Vercel settings
3. **Enable HTTPS** - Vercel provides this automatically
4. **Review Upstash security settings** - Enable encryption in transit

## Support

If you encounter issues:

1. Check Vercel's [documentation](https://vercel.com/docs)
2. Check Upstash's [documentation](https://docs.upstash.com/)
3. Open an issue on GitHub

---

**Your app is now live!** 🚀
