# Vercel Environment Variables - Quick Reference

This is a quick reference for adding environment variables to Vercel. For the complete file with all variables, see `.env.vercel`.

## How to Add Variables to Vercel

1. Go to **https://vercel.com/dashboard**
2. Select your **soleblessing-ecommerce** project
3. Click **Settings** → **Environment Variables**
4. For each variable below, click **"Add New"**:
   - Enter **Key** (variable name)
   - Enter **Value** (your actual value)
   - Select **Production, Preview, Development** (all three)
   - Click **"Save"**

---

## Required Variables (Minimum 12)

### Database (1 variable)

```
DATABASE_URL
mysql://root:PASSWORD@HOST:PORT/railway
```
**Get from:** Railway → MySQL Service → Variables → MYSQL_URL

---

### AWS S3 Storage (5 variables)

```
AWS_REGION
us-east-1

AWS_ACCESS_KEY_ID
AKIAXXXXXXXXXXXXXXXXX

AWS_SECRET_ACCESS_KEY
XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

S3_BUCKET_NAME
soleblessing-images

S3_PUBLIC_URL
https://soleblessing-images.s3.amazonaws.com
```
**Get from:** AWS Console → IAM → Users → Security Credentials

---

### Authentication - NextAuth (4 variables)

**Use this if you chose NextAuth:**

```
NEXTAUTH_URL
https://your-project.vercel.app

NEXTAUTH_SECRET
(generate with: openssl rand -base64 32)

GOOGLE_CLIENT_ID
XXXXXXXXXXXX-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX.apps.googleusercontent.com

GOOGLE_CLIENT_SECRET
GOCSPX-XXXXXXXXXXXXXXXXXXXXXXXXXXXX
```
**Get from:** Google Cloud Console → APIs & Services → Credentials

---

### Authentication - Clerk (2 variables)

**Use this if you chose Clerk instead:**

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
pk_test_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

CLERK_SECRET_KEY
sk_test_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```
**Get from:** Clerk Dashboard → API Keys

---

### Application Security (1 variable)

```
JWT_SECRET
(generate with: openssl rand -base64 32)
```

---

### Application Configuration (2 variables)

```
VITE_APP_TITLE
SoleBlessing - Premium Sneaker Store

VITE_APP_LOGO
/logo.png
```

---

## Generate Secrets

Run these commands in your terminal to generate secure random secrets:

```bash
# For NEXTAUTH_SECRET
openssl rand -base64 32

# For JWT_SECRET
openssl rand -base64 32
```

Copy the output and use as the variable value.

---

## Complete Checklist

Copy this checklist and check off as you add each variable:

### Database
- [ ] DATABASE_URL

### AWS S3
- [ ] AWS_REGION
- [ ] AWS_ACCESS_KEY_ID
- [ ] AWS_SECRET_ACCESS_KEY
- [ ] S3_BUCKET_NAME
- [ ] S3_PUBLIC_URL

### Authentication (choose one)
**NextAuth:**
- [ ] NEXTAUTH_URL
- [ ] NEXTAUTH_SECRET
- [ ] GOOGLE_CLIENT_ID
- [ ] GOOGLE_CLIENT_SECRET

**OR Clerk:**
- [ ] NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
- [ ] CLERK_SECRET_KEY

### Security
- [ ] JWT_SECRET

### Application
- [ ] VITE_APP_TITLE
- [ ] VITE_APP_LOGO

---

## Copy-Paste Template for Vercel

Copy this entire block and keep it handy while adding variables:

```bash
# === REQUIRED VARIABLES ===

# Database
DATABASE_URL=mysql://root:PASSWORD@HOST:PORT/railway

# AWS S3
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIAXXXXXXXXXXXXXXXXX
AWS_SECRET_ACCESS_KEY=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
S3_BUCKET_NAME=soleblessing-images
S3_PUBLIC_URL=https://soleblessing-images.s3.amazonaws.com

# NextAuth (if using)
NEXTAUTH_URL=https://your-project.vercel.app
NEXTAUTH_SECRET=GENERATE_WITH_OPENSSL
GOOGLE_CLIENT_ID=XXXXXXXXXXXX-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-XXXXXXXXXXXXXXXXXXXXXXXXXXXX

# OR Clerk (if using instead)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
CLERK_SECRET_KEY=sk_test_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# Security
JWT_SECRET=GENERATE_WITH_OPENSSL

# Application
VITE_APP_TITLE=SoleBlessing - Premium Sneaker Store
VITE_APP_LOGO=/logo.png
```

---

## After Adding Variables

1. Click **"Deploy"** to trigger a new deployment with the environment variables
2. Wait 3-5 minutes for build to complete
3. Test your deployment:
   - Visit your Vercel URL
   - Try logging in
   - Add a product to cart
   - Upload a payment proof (tests S3)

---

## Troubleshooting

**Build fails with "Environment variable not found"**
- Go back to Vercel → Settings → Environment Variables
- Verify all required variables are added
- Check for typos in variable names
- Redeploy

**Database connection fails**
- Verify DATABASE_URL is correct
- Test connection from Railway dashboard
- Ensure Railway database is running

**S3 upload fails**
- Verify AWS credentials are correct
- Check IAM user has S3 permissions
- Verify bucket name matches S3_BUCKET_NAME

**Authentication doesn't work**
- Update NEXTAUTH_URL to your actual Vercel URL
- Verify OAuth redirect URLs in provider settings
- Check client ID and secret are correct

---

## Optional Variables (Add Later)

Once your site is working, consider adding these optional variables for enhanced functionality:

### Analytics
```
VITE_ANALYTICS_ID=G-XXXXXXXXXX
```

### Email Notifications
```
RESEND_API_KEY=re_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
RESEND_FROM_EMAIL=orders@soleblessingofficial.com
```

### Error Tracking
```
SENTRY_DSN=https://XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX@o123456.ingest.sentry.io/1234567
```

### Google Sheets Import
```
GOOGLE_SHEETS_API_KEY=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

See `.env.vercel` for complete list of optional variables.

---

**Quick Links:**
- Full variables file: `.env.vercel`
- Deployment checklist: `VERCEL_DEPLOYMENT_CHECKLIST.md`
- Railway setup: `migration/RAILWAY_DATABASE_SETUP.md`
- GitHub repo: https://github.com/Maldipia/soleblessing-ecommerce

---

**Last Updated:** December 2024  
**Author:** Manus AI
