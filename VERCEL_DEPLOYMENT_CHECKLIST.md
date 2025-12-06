# SoleBlessing Vercel Deployment Checklist

This personalized checklist guides you through deploying your SoleBlessing e-commerce website to Vercel. Complete each section in order, filling in your actual values as you go.

**Estimated Time:** 45-60 minutes  
**Difficulty:** Intermediate

---

## Pre-Deployment Checklist

Before starting the Vercel deployment, ensure you have completed these prerequisites:

- [ ] **Railway MySQL database created and running**
  - Status: ⬜ Not Started | ⬜ In Progress | ⬜ Complete
  - Guide: `migration/RAILWAY_DATABASE_SETUP.md`

- [ ] **Database imported successfully**
  - Status: ⬜ Not Started | ⬜ In Progress | ⬜ Complete
  - Expected: 1 user, 30 products, 84 browsing history records
  - Verification: Run `SELECT COUNT(*) FROM products;` should return 30

- [ ] **AWS S3 bucket created**
  - Status: ⬜ Not Started | ⬜ In Progress | ⬜ Complete
  - Bucket name: `_______________________________`
  - Region: `_______________________________`

- [ ] **IAM user created with S3 permissions**
  - Status: ⬜ Not Started | ⬜ In Progress | ⬜ Complete
  - Access Key ID: `AKIA________________________`
  - Secret Access Key: (saved securely)

- [ ] **Authentication provider chosen**
  - ⬜ NextAuth.js (flexible, supports multiple providers)
  - ⬜ Clerk (easiest, beautiful UI)
  - ⬜ Other: `_______________________________`

- [ ] **OAuth credentials obtained** (if using NextAuth)
  - Google Client ID: `_______________________________`
  - Google Client Secret: (saved securely)
  - OR Facebook/GitHub/etc. credentials ready

---

## Part 1: Gather All Required Information

### 1.1 Railway Database Connection

Fill in your Railway MySQL connection details (find these in Railway → MySQL service → Variables tab):

```
MYSQL_URL (full connection string):
mysql://root:___PASSWORD___@___HOST___:___PORT___/railway

Individual components:
Host:     ________________________________________
Port:     ________________________________________
Username: root
Password: ________________________________________
Database: railway
```

**Where to find:**
1. Go to https://railway.app
2. Open your SoleBlessing project
3. Click on MySQL service
4. Click "Variables" tab
5. Copy `MYSQL_URL` value

### 1.2 AWS S3 Credentials

Fill in your AWS S3 details (find these in AWS Console → IAM → Users → Security Credentials):

```
S3_BUCKET_NAME:        ________________________________________
AWS_REGION:            ________________________________________
AWS_ACCESS_KEY_ID:     AKIA____________________________________
AWS_SECRET_ACCESS_KEY: ________________________________________
S3_PUBLIC_URL:         https://___BUCKET___.s3.amazonaws.com
```

**Where to find:**
1. Bucket name: AWS Console → S3 → Your bucket name
2. Region: Same as where you created the bucket (e.g., `us-east-1`)
3. Access keys: AWS Console → IAM → Users → Your user → Security credentials

### 1.3 Authentication Credentials

**If using NextAuth.js:**
```
NEXTAUTH_SECRET:       ________________________________________ (generate with: openssl rand -base64 32)
GOOGLE_CLIENT_ID:      ________________________________________
GOOGLE_CLIENT_SECRET:  ________________________________________
```

**If using Clerk:**
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: pk_test_____________________
CLERK_SECRET_KEY:                  sk_test_____________________
```

### 1.4 Application Settings

```
VITE_APP_TITLE:  SoleBlessing - Premium Sneaker Store
VITE_APP_LOGO:   /logo.png
JWT_SECRET:      ________________________________________ (generate with: openssl rand -base64 32)
```

---

## Part 2: Import GitHub Repository to Vercel

### Step 2.1: Navigate to Vercel

1. Open your browser and go to **https://vercel.com/new**
2. Sign in with your GitHub account (if not already signed in)
3. Authorize Vercel to access your GitHub repositories if prompted

### Step 2.2: Import Repository

1. You'll see a list of your GitHub repositories
2. Find **"Maldipia/soleblessing-ecommerce"**
3. Click **"Import"** next to it

**If you don't see the repository:**
- Click "Adjust GitHub App Permissions"
- Grant Vercel access to the repository
- Return to import page

### Step 2.3: Configure Project

Vercel will auto-detect the framework, but verify these settings:

| Setting | Value |
|---------|-------|
| **Framework Preset** | Vite |
| **Root Directory** | `./` (leave as is) |
| **Build Command** | `pnpm build` |
| **Output Directory** | `client/dist` |
| **Install Command** | `pnpm install` |

**Important:** Do NOT click "Deploy" yet! We need to add environment variables first.

### Step 2.4: Add Environment Variables

Click **"Environment Variables"** to expand the section.

For each variable below:
1. Enter the **Key** (variable name) in the left field
2. Enter the **Value** (your actual value) in the right field
3. Click **"Add"**

#### Database Variables

```
Key: DATABASE_URL
Value: mysql://root:___PASSWORD___@___HOST___:___PORT___/railway
(Use your actual MYSQL_URL from Railway)
```

#### AWS S3 Variables

```
Key: AWS_REGION
Value: ________________ (e.g., us-east-1)

Key: AWS_ACCESS_KEY_ID
Value: AKIA________________

Key: AWS_SECRET_ACCESS_KEY
Value: ________________

Key: S3_BUCKET_NAME
Value: ________________

Key: S3_PUBLIC_URL
Value: https://___BUCKET___.s3.amazonaws.com
```

#### Authentication Variables (NextAuth)

If using NextAuth.js:

```
Key: NEXTAUTH_URL
Value: https://your-project-name.vercel.app
(You'll update this after deployment)

Key: NEXTAUTH_SECRET
Value: ________________ (generate with: openssl rand -base64 32)

Key: GOOGLE_CLIENT_ID
Value: ________________

Key: GOOGLE_CLIENT_SECRET
Value: ________________
```

#### Authentication Variables (Clerk)

If using Clerk:

```
Key: NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
Value: pk_test_________________

Key: CLERK_SECRET_KEY
Value: sk_test_________________
```

#### Application Variables

```
Key: JWT_SECRET
Value: ________________ (generate with: openssl rand -base64 32)

Key: VITE_APP_TITLE
Value: SoleBlessing - Premium Sneaker Store

Key: VITE_APP_LOGO
Value: /logo.png

Key: NODE_ENV
Value: production
```

#### Optional: Analytics (if you want to add Google Analytics)

```
Key: VITE_ANALYTICS_ID
Value: G-________________ (your Google Analytics ID)
```

**Total Environment Variables:** 12-15 depending on auth provider

### Step 2.5: Deploy

1. Review all environment variables to ensure they're correct
2. Click **"Deploy"**
3. Vercel will start building your project
4. Wait 3-5 minutes for the build to complete

**Build Progress:**
- Installing dependencies (1-2 min)
- Building application (1-2 min)
- Deploying to edge network (30 sec)

---

## Part 3: Post-Deployment Configuration

### Step 3.1: Get Deployment URL

Once deployment completes:

1. Vercel will show your deployment URL: `https://soleblessing-ecommerce-xxx.vercel.app`
2. Copy this URL - you'll need it for OAuth configuration

### Step 3.2: Update OAuth Redirect URLs

**If using NextAuth with Google:**

1. Go to Google Cloud Console → APIs & Services → Credentials
2. Click on your OAuth 2.0 Client ID
3. Under "Authorized redirect URIs", add:
   ```
   https://soleblessing-ecommerce-xxx.vercel.app/api/auth/callback/google
   ```
4. Click "Save"

**If using Clerk:**

1. Go to Clerk Dashboard → Your Application → Settings
2. Under "Allowed redirect URLs", add:
   ```
   https://soleblessing-ecommerce-xxx.vercel.app
   ```
3. Click "Save"

### Step 3.3: Update NEXTAUTH_URL (if using NextAuth)

1. Go back to Vercel → Your Project → Settings → Environment Variables
2. Find `NEXTAUTH_URL`
3. Click "Edit"
4. Update value to your actual deployment URL:
   ```
   https://soleblessing-ecommerce-xxx.vercel.app
   ```
5. Click "Save"
6. Go to Deployments tab
7. Click "Redeploy" on the latest deployment

### Step 3.4: Test Your Deployment

Visit your deployment URL and test these features:

- [ ] **Homepage loads** - Should show hero section and product cards
- [ ] **Products page** - Should display 30 products with images
- [ ] **Product detail page** - Click a product, should show details
- [ ] **Authentication** - Click login, should redirect to OAuth provider
- [ ] **Login works** - Complete login flow, should redirect back
- [ ] **Add to cart** - Add a product, cart count should update
- [ ] **Wishlist** - Add to wishlist, should save
- [ ] **Checkout** - Go to cart, proceed to checkout
- [ ] **Payment proof upload** - Upload an image (tests S3)
- [ ] **Review submission** - Submit a review with photo (tests S3)
- [ ] **Admin access** - Login as admin, access admin dashboard

### Step 3.5: Check for Errors

If anything doesn't work:

1. Go to Vercel → Your Project → Deployments → Latest → "View Function Logs"
2. Look for error messages
3. Common issues:
   - Database connection errors → Check DATABASE_URL
   - S3 upload errors → Check AWS credentials
   - Auth errors → Check OAuth redirect URLs

---

## Part 4: Configure Custom Domain (Optional)

### Step 4.1: Add Domain to Vercel

1. Go to Vercel → Your Project → Settings → Domains
2. Click "Add"
3. Enter your domain: `soleblessingofficial.com`
4. Click "Add"

### Step 4.2: Configure DNS

Vercel will show you DNS records to add. Go to your domain registrar and add:

**Option A: Using A Record (Recommended)**
```
Type: A
Name: @
Value: 76.76.21.21
TTL: 3600
```

**Option B: Using CNAME**
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
TTL: 3600
```

### Step 4.3: Wait for DNS Propagation

- DNS changes can take 1-48 hours to propagate
- Vercel will automatically provision SSL certificate
- You'll receive an email when domain is ready

### Step 4.4: Update OAuth Redirect URLs

Once custom domain is active, update OAuth redirect URLs to use your custom domain:

**NextAuth:**
```
https://soleblessingofficial.com/api/auth/callback/google
```

**Clerk:**
```
https://soleblessingofficial.com
```

---

## Part 5: Import Products from Google Sheets

### Step 5.1: Set Google Sheets API Key

If you want to import more products from your Google Sheets:

1. Get Google Sheets API key (see `scripts/import-from-sheets.ts` for instructions)
2. Add to Vercel environment variables:
   ```
   Key: GOOGLE_SHEETS_API_KEY
   Value: ________________
   ```

### Step 5.2: Run Import Script

You can run the import script locally or via Vercel CLI:

**Option A: Local**
```bash
# Pull environment variables from Vercel
vercel env pull .env.local

# Run import
pnpm exec tsx scripts/import-from-sheets.ts
```

**Option B: Vercel CLI**
```bash
# Install Vercel CLI
npm install -g vercel

# Link to project
vercel link

# Run import
vercel run pnpm exec tsx scripts/import-from-sheets.ts
```

---

## Troubleshooting

### Build Fails on Vercel

**Error:** `Cannot find module 'xyz'`

**Solution:**
1. Check `package.json` includes all dependencies
2. Run `pnpm install` locally to verify
3. Commit any missing dependencies
4. Redeploy

### Database Connection Fails

**Error:** `ECONNREFUSED` or `Connection timeout`

**Solution:**
1. Verify `DATABASE_URL` is correct in Vercel environment variables
2. Check Railway database is running (Railway dashboard)
3. Test connection locally:
   ```bash
   mysql -h HOST -P PORT -u root -p railway
   ```

### S3 Upload Fails

**Error:** `Access Denied` when uploading images

**Solution:**
1. Verify AWS credentials are correct
2. Check IAM user has `AmazonS3FullAccess` permission
3. Verify bucket policy allows public read
4. Check bucket name matches `S3_BUCKET_NAME`

### Authentication Not Working

**Error:** `NEXTAUTH_URL is not defined`

**Solution:**
1. Add `NEXTAUTH_URL` to Vercel environment variables
2. Value should be your deployment URL
3. Redeploy after adding

**Error:** `OAuth callback failed`

**Solution:**
1. Check OAuth redirect URLs in provider settings
2. Must exactly match: `https://your-domain.vercel.app/api/auth/callback/google`
3. No trailing slashes
4. Use HTTPS (not HTTP)

---

## Deployment Checklist Summary

### Pre-Deployment
- [ ] Railway MySQL database created
- [ ] Database data imported (30 products, 1 user)
- [ ] AWS S3 bucket created
- [ ] IAM user with S3 permissions created
- [ ] OAuth provider configured (Google/Clerk/etc.)

### Vercel Configuration
- [ ] GitHub repository imported to Vercel
- [ ] All environment variables added (12-15 total)
- [ ] Build settings verified (Vite, pnpm, client/dist)
- [ ] Deployed successfully

### Post-Deployment
- [ ] Deployment URL obtained
- [ ] OAuth redirect URLs updated
- [ ] NEXTAUTH_URL updated (if using NextAuth)
- [ ] All features tested (auth, cart, checkout, reviews)
- [ ] No errors in function logs

### Optional
- [ ] Custom domain configured
- [ ] DNS records added
- [ ] SSL certificate provisioned
- [ ] Google Sheets import configured
- [ ] Products imported from Sheets

---

## Environment Variables Reference

Copy this template and fill in your actual values:

```bash
# Database
DATABASE_URL="mysql://root:PASSWORD@HOST:PORT/railway"

# AWS S3
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="AKIA..."
AWS_SECRET_ACCESS_KEY="..."
S3_BUCKET_NAME="soleblessing-images"
S3_PUBLIC_URL="https://soleblessing-images.s3.amazonaws.com"

# Authentication (NextAuth)
NEXTAUTH_URL="https://your-project.vercel.app"
NEXTAUTH_SECRET="..." # openssl rand -base64 32
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."

# OR Authentication (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."

# Application
JWT_SECRET="..." # openssl rand -base64 32
VITE_APP_TITLE="SoleBlessing - Premium Sneaker Store"
VITE_APP_LOGO="/logo.png"
NODE_ENV="production"

# Optional
GOOGLE_SHEETS_API_KEY="..." # For product import
VITE_ANALYTICS_ID="G-..." # Google Analytics
```

---

## Next Steps After Deployment

1. **Monitor Performance**
   - Go to Vercel → Analytics
   - Check page load times
   - Monitor error rates

2. **Set Up Monitoring**
   - Enable Vercel Analytics
   - Set up error tracking (Sentry)
   - Configure uptime monitoring

3. **Optimize Images**
   - Use Vercel Image Optimization
   - Update image URLs to use Vercel CDN

4. **Add More Products**
   - Update Google Sheets with more product images
   - Run import script to add to database

5. **Marketing**
   - Share your website URL
   - Set up social media accounts
   - Configure SEO meta tags

---

## Support Resources

- **Vercel Documentation**: https://vercel.com/docs
- **Railway Documentation**: https://docs.railway.app
- **NextAuth Documentation**: https://next-auth.js.org
- **Clerk Documentation**: https://clerk.com/docs
- **Migration Guides**: `migration/` directory in your repo

## Getting Help

- **Vercel Support**: https://vercel.com/support
- **Railway Discord**: https://discord.gg/railway
- **GitHub Issues**: https://github.com/Maldipia/soleblessing-ecommerce/issues

---

**Author**: Manus AI  
**Last Updated**: December 2024  
**Version**: 1.0

**Good luck with your deployment! 🚀**
