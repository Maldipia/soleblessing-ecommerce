# SoleBlessing Deployment Guide

## Current Status

✅ **GitHub Repository:** https://github.com/Maldipia/soleblessing-ecommerce  
✅ **All code pushed** - Clearance sale, Railway config, CORS setup  
❌ **Backend NOT deployed** - This is why products don't show  
❌ **Frontend needs backend URL** - Vercel doesn't know where the API is  

---

## The Problem

Your Vercel deployment only has **static HTML/CSS/JS files**. The Express backend server with:
- tRPC API endpoints
- Google Sheets inventory sync (446 products)
- Database connections
- Authentication

...is **NOT running anywhere**. That's why the Products page shows "Loading..." forever.

---

## The Solution: Deploy Backend to Railway

### Step 1: Create Railway Project (5 minutes)

1. Go to **https://railway.app**
2. Click **"Login"** → Sign in with GitHub
3. Click **"New Project"**
4. Select **"Deploy from GitHub repo"**
5. Choose **`Maldipia/soleblessing-ecommerce`**
6. Railway will detect Node.js and start building

---

### Step 2: Add Environment Variables in Railway

Click on your Railway project → **"Variables"** tab → Add these:

#### Required Variables:

```bash
DATABASE_URL=mysql://root:password@containers-us-west-123.railway.app:1234/railway
JWT_SECRET=your-random-secret-key-here
GOOGLE_SHEETS_API_KEY=your-google-api-key
GOOGLE_SHEETS_SHEET_ID=your-sheet-id
NODE_ENV=production
```

**Where to get these:**

- **DATABASE_URL**: From your Railway MySQL service (if you have one) or your existing database
- **JWT_SECRET**: Generate with: `openssl rand -base64 32`
- **GOOGLE_SHEETS_API_KEY**: From Google Cloud Console (you're already using this)
- **GOOGLE_SHEETS_SHEET_ID**: From your Google Sheets URL

#### Optional (if using Manus OAuth):

```bash
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://auth.manus.im
VITE_APP_ID=your-app-id
OWNER_OPEN_ID=your-openid
OWNER_NAME=Your Name
```

#### Optional (if using S3):

```bash
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-bucket
```

---

### Step 3: Get Railway Backend URL

After deployment completes (2-3 minutes):

1. Go to Railway project → **"Settings"** tab
2. Scroll to **"Networking"** section
3. Click **"Generate Domain"** if not already generated
4. Copy the URL (e.g., `soleblessing-production.up.railway.app`)
5. **Add `/api/trpc` to the end**

Example full URL: `https://soleblessing-production.up.railway.app/api/trpc`

---

### Step 4: Configure Vercel

1. Go to **https://vercel.com/dashboard**
2. Select your **soleblessing-ecommerce** project
3. Go to **"Settings"** → **"Environment Variables"**
4. Add new variable:
   - **Name:** `VITE_API_URL`
   - **Value:** `https://your-railway-url.up.railway.app/api/trpc`
   - **Environment:** Production, Preview, Development (select all)
5. Click **"Save"**

---

### Step 5: Redeploy Vercel

1. Go to **"Deployments"** tab in Vercel
2. Click **"..."** on the latest deployment
3. Click **"Redeploy"**
4. Wait 1-2 minutes for deployment

---

### Step 6: Test Your Website

1. Visit **https://www.soleblessingofficial.com/products**
2. Open browser DevTools (F12) → **"Network"** tab
3. You should see API calls to your Railway backend
4. **Products should load!** 🎉

---

## Troubleshooting

### Products still not loading?

**Check Railway logs:**
1. Railway dashboard → Your project → **"Deployments"** tab
2. Click latest deployment → View logs
3. Look for errors

**Check Vercel environment variable:**
1. Verify `VITE_API_URL` is set correctly
2. Make sure it includes `/api/trpc` at the end
3. Redeploy after any changes

**Test Railway API directly:**
```bash
curl https://your-railway-url.up.railway.app/api/trpc/inventory.list
```

Should return JSON data, not HTML.

### CORS errors?

Add this to Railway environment variables:
```bash
FRONTEND_URL=https://www.soleblessingofficial.com
```

### Database connection errors?

Verify `DATABASE_URL` format:
```
mysql://username:password@host:port/database
```

---

## Cost

- **Railway:** $5/month free credit (enough for this app)
- **Vercel:** Free (static hosting)
- **Total:** $0-5/month

---

## Architecture

```
┌─────────────────────────────────────────┐
│  www.soleblessingofficial.com (Vercel)  │
│  Static React Frontend                   │
└────────────────┬────────────────────────┘
                 │
                 │ API Calls (CORS)
                 │
                 ▼
┌─────────────────────────────────────────┐
│  Railway Backend                         │
│  - Express Server                        │
│  - tRPC API                              │
│  - Google Sheets Sync (every 5 min)     │
│  - Database Connection                   │
│  - Authentication                        │
└─────────────────────────────────────────┘
```

---

## Next Steps After Deployment

1. ✅ Verify all 446 products display correctly
2. ✅ Test clearance sale page (/clearance)
3. ✅ Test cart and checkout flow
4. ✅ Test admin panel
5. 📊 Monitor Railway logs for errors
6. 🔄 Set up database backups in Railway

---

## Need Help?

- **Railway Docs:** https://docs.railway.app
- **Railway Discord:** https://discord.gg/railway
- **Check Railway logs** for detailed error messages
