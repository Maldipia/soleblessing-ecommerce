# Railway Deployment Guide for SoleBlessing Backend

This guide will help you deploy the SoleBlessing Express backend to Railway.

## Architecture

- **Railway** → Backend server (Express + tRPC + Google Sheets sync)
- **Vercel** → Frontend static files (React app)
- **Communication** → Frontend calls Railway API via CORS

---

## Step 1: Create Railway Project

1. Go to [railway.app](https://railway.app)
2. Sign in with GitHub
3. Click "New Project"
4. Select "Deploy from GitHub repo"
5. Choose your `soleblessing` repository
6. Railway will auto-detect Node.js and use the configuration files

---

## Step 2: Configure Environment Variables in Railway

In your Railway project dashboard, go to **Variables** tab and add these:

### Required Variables:

```
DATABASE_URL=<your-railway-mysql-url>
JWT_SECRET=<random-secret-key>
GOOGLE_SHEETS_API_KEY=<your-google-api-key>
GOOGLE_SHEETS_SHEET_ID=<your-sheet-id>
FRONTEND_URL=https://www.soleblessingofficial.com
NODE_ENV=production
```

### Optional (if using Manus OAuth):

```
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://auth.manus.im
VITE_APP_ID=<your-app-id>
OWNER_OPEN_ID=<your-openid>
OWNER_NAME=<your-name>
```

### Optional (if using S3 storage):

```
AWS_ACCESS_KEY_ID=<your-access-key>
AWS_SECRET_ACCESS_KEY=<your-secret-key>
AWS_REGION=<your-region>
AWS_S3_BUCKET=<your-bucket>
```

---

## Step 3: Deploy Backend

Railway will automatically:
1. Install dependencies (`pnpm install`)
2. Build the project (`pnpm build`)
3. Start the server (`pnpm start`)
4. Assign a public URL (e.g., `https://soleblessing-backend.up.railway.app`)

---

## Step 4: Get Railway Backend URL

After deployment completes:
1. Go to your Railway project **Settings** tab
2. Find the **Public Domain** section
3. Copy the URL (e.g., `https://soleblessing-production.up.railway.app`)
4. **Important:** Add `/api/trpc` to the end for the full API URL

Example: `https://soleblessing-production.up.railway.app/api/trpc`

---

## Step 5: Configure Vercel Frontend

1. Go to your Vercel project settings
2. Navigate to **Environment Variables**
3. Add a new variable:
   - **Name:** `VITE_API_URL`
   - **Value:** `https://your-railway-url.up.railway.app/api/trpc`
4. Redeploy your Vercel frontend

---

## Step 6: Update CORS in Railway

If you get CORS errors:

1. Make sure `FRONTEND_URL` environment variable is set in Railway
2. The backend is already configured to accept requests from:
   - `https://www.soleblessingofficial.com`
   - `https://soleblessingofficial.com`
   - `https://soleblessing-ecommerce.vercel.app`

---

## Step 7: Test the Integration

1. Visit `https://www.soleblessingofficial.com/products`
2. Open browser DevTools (F12) → Network tab
3. You should see API requests going to your Railway backend
4. Products should load successfully!

---

## Troubleshooting

### Products not loading?

1. Check Railway logs for errors
2. Verify `VITE_API_URL` is set correctly in Vercel
3. Test Railway API directly: `curl https://your-railway-url.up.railway.app/api/trpc/inventory.list`

### CORS errors?

1. Verify `FRONTEND_URL` is set in Railway environment variables
2. Make sure it matches your Vercel domain exactly (including https://)

### Database connection errors?

1. Check `DATABASE_URL` format: `mysql://user:password@host:port/database`
2. Verify Railway MySQL service is running
3. Check Railway logs for connection errors

---

## Monitoring

- **Railway Dashboard** → View logs, metrics, and deployment status
- **Vercel Dashboard** → View frontend deployment status
- **Google Sheets** → Inventory auto-syncs every 5 minutes

---

## Cost

- **Railway:** Free tier includes $5/month credit (enough for small apps)
- **Vercel:** Free tier includes unlimited static hosting
- **Total:** $0-5/month depending on traffic

---

## Next Steps After Deployment

1. Point your custom domain to Vercel (already done: soleblessingofficial.com)
2. Monitor Railway logs for any errors
3. Test all features (products, cart, checkout, admin panel)
4. Set up database backups in Railway
