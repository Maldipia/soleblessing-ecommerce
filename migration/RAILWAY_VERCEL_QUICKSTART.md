# Railway + Vercel Deployment Quick Start

This guide provides step-by-step instructions for deploying SoleBlessing to Railway (database) + Vercel (hosting).

## Prerequisites

Before starting, ensure you have:
- GitHub account with the soleblessing-ecommerce repository
- Railway account (sign up at https://railway.app)
- Vercel account (sign up at https://vercel.com)
- AWS account for S3 storage (or Cloudflare R2 alternative)

## Part 1: Set Up Railway Database (15 minutes)

Railway provides managed MySQL databases with automatic backups and scaling.

### Step 1: Create Railway Project

1. Go to https://railway.app/new
2. Click "New Project"
3. Select "Provision MySQL"
4. Name your project: `soleblessing-db`

### Step 2: Get Database Connection String

1. Click on your MySQL service
2. Go to "Variables" tab
3. Copy the `DATABASE_URL` value
4. It should look like: `mysql://root:password@containers-us-west-xxx.railway.app:1234/railway`

### Step 3: Import Database

You have two options for importing your data:

#### Option A: Using Railway CLI (Recommended)
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link to your project
railway link

# Import the SQL dump
railway run mysql -h containers-us-west-xxx.railway.app -u root -p railway < migration/database_export.sql
```

#### Option B: Using MySQL Workbench or TablePlus
1. Download the SQL file from `migration/database_export.sql`
2. Connect to Railway database using the connection details
3. Execute the SQL file to import all tables and data

### Step 4: Verify Database

```bash
# Connect to Railway MySQL
railway connect MySQL

# Check tables
SHOW TABLES;

# Verify data
SELECT COUNT(*) FROM products;
SELECT COUNT(*) FROM users;
```

## Part 2: Set Up AWS S3 Storage (10 minutes)

S3 will store product images, payment proofs, and review photos.

### Step 1: Create S3 Bucket

1. Go to AWS Console → S3
2. Click "Create bucket"
3. Bucket name: `soleblessing-images` (must be globally unique)
4. Region: `us-east-1` (or your preferred region)
5. **Uncheck** "Block all public access" (we need public read for product images)
6. Click "Create bucket"

### Step 2: Configure Bucket Policy

1. Go to bucket → Permissions → Bucket Policy
2. Add this policy (replace `soleblessing-images` with your bucket name):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::soleblessing-images/*"
    }
  ]
}
```

### Step 3: Create IAM User

1. Go to IAM → Users → Add User
2. User name: `soleblessing-app`
3. Access type: Programmatic access
4. Permissions: Attach existing policy → `AmazonS3FullAccess`
5. Create user and **save the Access Key ID and Secret Access Key**

### Step 4: Configure CORS (Optional)

If you need to upload from the browser:

1. Go to bucket → Permissions → CORS
2. Add this configuration:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": []
  }
]
```

## Part 3: Set Up Authentication (20 minutes)

Choose one of these authentication providers:

### Option A: NextAuth.js (Recommended)

NextAuth is flexible and supports many providers (Google, Facebook, Email, etc.).

#### Step 1: Install NextAuth

```bash
cd /home/ubuntu/soleblessing
pnpm add next-auth
```

#### Step 2: Configure Google OAuth (Example)

1. Go to Google Cloud Console → APIs & Services → Credentials
2. Create OAuth 2.0 Client ID
3. Authorized redirect URIs: `https://your-domain.vercel.app/api/auth/callback/google`
4. Save Client ID and Client Secret

#### Step 3: Update Code

Create `server/_core/nextauth.ts`:

```typescript
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
};

export default NextAuth(authOptions);
```

### Option B: Clerk (Easiest)

Clerk provides the simplest setup with beautiful pre-built UI components.

#### Step 1: Create Clerk Account

1. Go to https://clerk.com
2. Create new application: "SoleBlessing"
3. Choose authentication methods (Google, Facebook, Email)

#### Step 2: Get API Keys

1. Go to API Keys
2. Copy `Publishable Key` and `Secret Key`

#### Step 3: Install Clerk

```bash
pnpm add @clerk/nextjs
```

## Part 4: Deploy to Vercel (10 minutes)

### Step 1: Import GitHub Repository

1. Go to https://vercel.com/new
2. Import `Maldipia/soleblessing-ecommerce`
3. Configure project:
   - Framework Preset: **Vite**
   - Root Directory: `./`
   - Build Command: `pnpm build`
   - Output Directory: `client/dist`

### Step 2: Add Environment Variables

Go to Project Settings → Environment Variables and add:

#### Database
```
DATABASE_URL=mysql://root:password@containers-us-west-xxx.railway.app:1234/railway
```

#### AWS S3
```
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
S3_BUCKET_NAME=soleblessing-images
S3_PUBLIC_URL=https://soleblessing-images.s3.amazonaws.com
```

#### Authentication (NextAuth)
```
NEXTAUTH_URL=https://your-domain.vercel.app
NEXTAUTH_SECRET=generate_with_openssl_rand_base64_32
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

#### OR Authentication (Clerk)
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

#### Security
```
JWT_SECRET=generate_with_openssl_rand_base64_32
```

#### App Configuration
```
VITE_APP_TITLE=SoleBlessing - Premium Sneaker Store
VITE_APP_LOGO=/logo.png
OWNER_OPEN_ID=your_new_oauth_user_id
OWNER_NAME=Your Name
```

### Step 3: Deploy

1. Click "Deploy"
2. Wait 2-3 minutes for build to complete
3. Visit your deployment URL

## Part 5: Post-Deployment Tasks (15 minutes)

### Step 1: Run Database Migrations

If you haven't imported the database yet:

```bash
# Pull environment variables from Vercel
vercel env pull .env.local

# Run migrations
pnpm db:push
```

### Step 2: Import Products

```bash
# Make sure GOOGLE_SHEETS_API_KEY is set
pnpm exec tsx scripts/import-from-sheets.ts
```

### Step 3: Test Core Features

- [ ] Visit homepage - products should load
- [ ] Click on a product - detail page should work
- [ ] Test authentication - login/logout
- [ ] Add product to cart
- [ ] Test checkout flow
- [ ] Upload payment proof (tests S3)
- [ ] Submit a review with photo (tests S3)
- [ ] Access admin dashboard

### Step 4: Configure Custom Domain (Optional)

1. Go to Vercel Project → Settings → Domains
2. Add your domain: `soleblessingofficial.com`
3. Update DNS records as instructed
4. Wait for SSL certificate to provision (automatic)

## Troubleshooting

### Build Fails

**Error**: `Cannot find module 'xyz'`
- **Fix**: Make sure all dependencies are in `package.json`
- Run `pnpm install` locally to verify

**Error**: `Environment variable not found`
- **Fix**: Add missing variables in Vercel settings
- Redeploy after adding variables

### Database Connection Fails

**Error**: `ECONNREFUSED` or `Connection timeout`
- **Fix**: Check Railway database is running
- Verify DATABASE_URL is correct
- Ensure Railway allows external connections (should be default)

**Error**: `Access denied for user`
- **Fix**: Check username/password in DATABASE_URL
- Verify database exists

### S3 Upload Fails

**Error**: `Access Denied`
- **Fix**: Verify IAM user has S3 permissions
- Check bucket policy allows public read
- Ensure AWS credentials are correct

**Error**: `Bucket not found`
- **Fix**: Verify S3_BUCKET_NAME matches your bucket
- Check AWS_REGION is correct

### Authentication Not Working

**Error**: `NEXTAUTH_URL is not defined`
- **Fix**: Add NEXTAUTH_URL to Vercel environment variables
- Must match your actual domain

**Error**: `OAuth callback failed`
- **Fix**: Check OAuth redirect URLs in provider settings
- Must match: `https://your-domain.vercel.app/api/auth/callback/google`

## Cost Estimate

### Monthly Costs

| Service | Free Tier | Paid Tier |
|---------|-----------|-----------|
| **Railway** | $5 credit/month | $5-20/month |
| **Vercel** | Free (Hobby) | $20/month (Pro) |
| **AWS S3** | 5GB free first year | $5-20/month |
| **NextAuth** | Free | Free |
| **Clerk** | 10,000 users free | $25/month |
| **Total** | ~$0-10/month | ~$30-65/month |

## Migration Checklist

- [ ] Railway MySQL database created
- [ ] Database imported from SQL dump
- [ ] AWS S3 bucket created and configured
- [ ] IAM user created with S3 permissions
- [ ] Authentication provider configured (NextAuth/Clerk)
- [ ] All environment variables added to Vercel
- [ ] GitHub repository imported to Vercel
- [ ] Deployment successful
- [ ] Products imported from Google Sheets
- [ ] Core features tested
- [ ] Custom domain configured (optional)

## Need Help?

- **Railway Docs**: https://docs.railway.app
- **Vercel Docs**: https://vercel.com/docs
- **NextAuth Docs**: https://next-auth.js.org
- **Clerk Docs**: https://clerk.com/docs
- **AWS S3 Docs**: https://docs.aws.amazon.com/s3

## Alternative: Stay on Manus

If this migration seems too complex, consider staying on the Manus platform:

**Advantages**:
- All services pre-configured
- One-click publishing
- Custom domain support
- No external service setup
- Integrated analytics
- Automatic SSL

**To publish on Manus**:
1. Click "Publish" in Management UI
2. Configure custom domain
3. Done!

---

**Author**: Manus AI  
**Last Updated**: December 2024
