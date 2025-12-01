# Deployment Guide

## Overview
This application uses a split deployment strategy:
- **Frontend**: Vercel (static React app)
- **Backend**: Railway or Render (Express API server)
- **Database**: Supabase (PostgreSQL)

## Step 1: Deploy Backend to Railway

### Option A: Using Railway CLI

1. Install Railway CLI:
   ```bash
   npm i -g @railway/cli
   ```

2. Login to Railway:
   ```bash
   railway login
   ```

3. Initialize project:
   ```bash
   cd backend
   railway init
   ```

4. Set environment variables:
   ```bash
   railway variables set DATABASE_URL="your-supabase-connection-string"
   railway variables set JWT_SECRET="your-production-jwt-secret"
   railway variables set NODE_ENV="production"
   railway variables set FRONTEND_URL="https://your-vercel-app.vercel.app"
   ```

5. Deploy:
   ```bash
   railway up
   ```

6. Get your backend URL:
   ```bash
   railway domain
   ```

### Option B: Using Railway Dashboard

1. Go to https://railway.app and create a new project
2. Connect your GitHub repository
3. Select the `backend` folder as the root directory
4. Add environment variables in the dashboard:
   - `DATABASE_URL`: Your Supabase connection string
   - `JWT_SECRET`: A secure random string (generate with `openssl rand -base64 32`)
   - `NODE_ENV`: production
   - `FRONTEND_URL`: https://your-app.vercel.app (will update after frontend deploy)
5. Railway will auto-deploy from your main branch
6. Copy the generated domain (e.g., `your-app.up.railway.app`)

## Step 2: Deploy Frontend to Vercel

### Using Vercel CLI

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Login to Vercel:
   ```bash
   vercel login
   ```

3. Deploy from frontend directory:
   ```bash
   cd frontend
   vercel
   ```

4. Follow the prompts:
   - Set up and deploy? **Y**
   - Which scope? Select your account
   - Link to existing project? **N**
   - Project name? `ncaa-volleyball-bracket` (or your choice)
   - In which directory is your code located? `./`
   - Override settings? **N**

5. Set environment variable:
   ```bash
   vercel env add VITE_API_URL
   ```
   Enter your Railway backend URL: `https://your-app.up.railway.app/api`

6. Redeploy with environment variable:
   ```bash
   vercel --prod
   ```

### Using Vercel Dashboard

1. Go to https://vercel.com and import your GitHub repo
2. Configure project:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. Add environment variable:
   - `VITE_API_URL`: `https://your-railway-backend.up.railway.app/api`
4. Deploy

## Step 3: Update Backend CORS

After getting your Vercel URL, update the Railway backend environment variable:

```bash
railway variables set FRONTEND_URL="https://your-vercel-app.vercel.app"
```

Or update in the Railway dashboard settings.

## Step 4: Test Production Deployment

1. Visit your Vercel URL
2. Test signup and login
3. Test bracket functionality
4. Check browser console for any API errors

## Environment Variables Summary

### Backend (Railway)
- `DATABASE_URL`: Supabase PostgreSQL connection string
- `JWT_SECRET`: Secure random string for JWT signing
- `NODE_ENV`: production
- `FRONTEND_URL`: Your Vercel deployment URL
- `PORT`: Auto-set by Railway (optional)

### Frontend (Vercel)
- `VITE_API_URL`: Your Railway backend URL + `/api`

## Troubleshooting

### CORS Errors
- Ensure `FRONTEND_URL` in Railway matches your exact Vercel URL (including https://)
- No trailing slash in URLs

### 404 on Routes
- Frontend routing is handled by `vercel.json` rewrites
- Ensure `vercel.json` is in the frontend directory

### Database Connection Issues
- Verify `DATABASE_URL` includes all parameters (username, password, host, port, database)
- Check Supabase connection pooling limits

### Build Failures
- Check that all dependencies are in `package.json`
- Ensure TypeScript compiles locally first

## Alternative: Deploy Backend to Render

If you prefer Render over Railway:

1. Go to https://render.com
2. Create new Web Service
3. Connect GitHub repo
4. Configure:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
5. Add same environment variables as Railway
6. Render will provide a URL (e.g., `your-app.onrender.com`)

Note: Render free tier goes to sleep after 15 minutes of inactivity.

## Monitoring

### Railway
- View logs: `railway logs`
- Or check dashboard for real-time logs

### Vercel
- Check deployment logs in Vercel dashboard
- View function logs for any errors

## Cost Estimates

### Free Tier Limits
- **Vercel**: 100 GB bandwidth/month (plenty for 100s of users)
- **Railway**: $5 credit/month (covers basic usage)
- **Render**: Free tier available (sleeps after inactivity)
- **Supabase**: 500 MB database, 2GB bandwidth/month

### Paid Tier Costs (if needed)
- **Vercel Pro**: $20/month (1 TB bandwidth)
- **Railway**: ~$5-10/month for constant uptime
- **Render Starter**: $7/month (no sleep)
- **Supabase Pro**: $25/month (8 GB database)

## Next Steps

1. Set up custom domain (optional)
2. Enable analytics in Vercel
3. Set up error monitoring (Sentry)
4. Configure database backups
5. Add rate limiting to API endpoints
