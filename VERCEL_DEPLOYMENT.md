# Deploying SoleBlessing to Vercel

This guide walks you through deploying the SoleBlessing e-commerce website to Vercel with external database and storage services.

## Prerequisites

Before deploying to Vercel, you need to set up the following external services to replace Manus-managed infrastructure:

### 1. Database (Choose One)

#### Option A: PlanetScale (Recommended)
- **Why**: MySQL-compatible, generous free tier, excellent performance
- **Setup**: https://planetscale.com/
  1. Create account and new database
  2. Get connection string from dashboard
  3. Enable SSL connections

#### Option B: Railway
- **Why**: Simple setup, supports MySQL
- **Setup**: https://railway.app/
  1. Create new project
  2. Add MySQL service
  3. Copy DATABASE_URL from variables

#### Option C: Supabase
- **Why**: PostgreSQL with built-in auth (can replace Manus OAuth)
- **Setup**: https://supabase.com/
  1. Create new project
  2. Get Postgres connection string
  3. **Note**: Requires changing Drizzle ORM from MySQL to Postgres

### 2. File Storage (Choose One)

#### Option A: AWS S3
- **Why**: Industry standard, reliable
- **Setup**:
  1. Create AWS account
  2. Create S3 bucket (public read access)
  3. Create IAM user with S3 permissions
  4. Get Access Key ID and Secret Access Key

#### Option B: Cloudflare R2
- **Why**: S3-compatible, cheaper egress
- **Setup**: https://www.cloudflare.com/products/r2/
  1. Create R2 bucket
  2. Get API credentials
  3. Configure public access

### 3. Authentication (Choose One)

#### Option A: NextAuth.js (Recommended)
- **Why**: Most flexible, supports many providers
- **Setup**: https://next-auth.js.org/
  1. Install: `pnpm add next-auth`
  2. Configure providers (Google, Facebook, Email)
  3. Replace Manus OAuth endpoints

#### Option B: Clerk
- **Why**: Easiest setup, beautiful UI
- **Setup**: https://clerk.com/
  1. Create Clerk account
  2. Get publishable and secret keys
  3. Install Clerk SDK
  4. Replace authentication logic

## Step-by-Step Deployment

### Step 1: Set Up External Services

1. **Database**: Choose and set up one of the database options above
2. **Storage**: Choose and set up one of the storage options above
3. **Auth**: Choose and set up one of the authentication options above

### Step 2: Update Code for External Services

#### A. Update Database Connection

If using **PlanetScale** or **Railway** (MySQL):
```typescript
// No code changes needed, just update DATABASE_URL
```

If using **Supabase** (PostgreSQL):
```bash
# Install Postgres adapter
pnpm remove drizzle-orm/mysql2
pnpm add drizzle-orm/postgres-js postgres
```

Update `server/db.ts`:
```typescript
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const client = postgres(process.env.DATABASE_URL!);
export const db = drizzle(client);
```

#### B. Update S3 Storage

Update `storage/index.ts` with your S3 credentials:
```typescript
import { S3Client } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME!;
```

#### C. Replace Authentication

**If using NextAuth**:
1. Create `server/_core/auth.ts` with NextAuth configuration
2. Replace `server/_core/oauth.ts` endpoints
3. Update `client/src/hooks/useAuth.ts` to use NextAuth session

**If using Clerk**:
1. Install Clerk: `pnpm add @clerk/nextjs`
2. Wrap app with `<ClerkProvider>`
3. Replace `useAuth()` with `useUser()` from Clerk

### Step 3: Create Vercel Configuration

Create `vercel.json`:
```json
{
  "version": 2,
  "buildCommand": "pnpm build",
  "devCommand": "pnpm dev",
  "installCommand": "pnpm install",
  "framework": "vite",
  "outputDirectory": "client/dist",
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "/server/_core/index.ts"
    }
  ]
}
```

### Step 4: Configure Environment Variables in Vercel

Go to your Vercel project settings and add these environment variables:

#### Database
```
DATABASE_URL=mysql://user:password@host:port/database?ssl={"rejectUnauthorized":true}
```

#### S3 Storage
```
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
S3_BUCKET_NAME=your-bucket-name
S3_PUBLIC_URL=https://your-bucket.s3.amazonaws.com
```

#### Authentication (NextAuth)
```
NEXTAUTH_URL=https://your-domain.vercel.app
NEXTAUTH_SECRET=generate_random_secret_here
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

#### Authentication (Clerk)
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

#### JWT & Security
```
JWT_SECRET=generate_random_secret_here
```

#### App Configuration
```
VITE_APP_TITLE=SoleBlessing - Premium Sneaker Store
VITE_APP_LOGO=/logo.png
```

### Step 5: Deploy to Vercel

#### Option A: Deploy via Vercel Dashboard
1. Go to https://vercel.com/new
2. Import your GitHub repository: `Maldipia/soleblessing-ecommerce`
3. Configure project:
   - Framework Preset: Vite
   - Root Directory: `./`
   - Build Command: `pnpm build`
   - Output Directory: `client/dist`
4. Add all environment variables from Step 4
5. Click "Deploy"

#### Option B: Deploy via Vercel CLI
```bash
# Install Vercel CLI
pnpm add -g vercel

# Login to Vercel
vercel login

# Deploy
cd /home/ubuntu/soleblessing
vercel --prod
```

### Step 6: Run Database Migrations

After first deployment, run migrations:

```bash
# Using Vercel CLI
vercel env pull .env.local
pnpm db:push
```

Or manually run SQL from `drizzle/migrations/` in your database console.

### Step 7: Import Products

Run the Google Sheets import script:
```bash
pnpm exec tsx scripts/import-from-sheets.ts
```

## Post-Deployment Checklist

- [ ] Database connected and migrations run
- [ ] S3 storage working (test image uploads)
- [ ] Authentication working (test login/logout)
- [ ] Products imported from Google Sheets
- [ ] Payment proof upload working
- [ ] Admin dashboard accessible
- [ ] Orders can be placed
- [ ] Reviews can be submitted
- [ ] Email notifications sending (if configured)

## Troubleshooting

### Build Errors

**Error**: `Cannot find module 'drizzle-orm/mysql2'`
- **Fix**: Make sure you installed the correct Drizzle adapter for your database

**Error**: `process.env.DATABASE_URL is undefined`
- **Fix**: Add DATABASE_URL to Vercel environment variables

### Runtime Errors

**Error**: `ECONNREFUSED` when connecting to database
- **Fix**: Check database URL format and SSL settings

**Error**: `Access Denied` for S3
- **Fix**: Verify IAM user has S3 permissions and bucket policy allows public read

**Error**: Authentication not working
- **Fix**: Check NEXTAUTH_URL matches your Vercel domain

## Alternative: Stay on Manus Platform

If this migration seems complex, consider staying on the Manus platform:

**Advantages**:
- All services pre-configured and integrated
- No external service setup needed
- One-click publishing
- Custom domain support
- Automatic SSL certificates
- Built-in analytics

**To publish on Manus**:
1. Click "Publish" button in Management UI
2. Configure custom domain in Settings → Domains
3. Point your DNS to Manus servers

## Cost Comparison

### Vercel Setup
- Vercel: $0 (Hobby) or $20/month (Pro)
- PlanetScale: $0 (Free tier) or $29/month
- AWS S3: ~$5-20/month depending on usage
- Clerk/NextAuth: $0 (Free tier) or $25/month
- **Total**: $0-75/month

### Manus Platform
- All-inclusive hosting with database, storage, auth
- Check current pricing at https://manus.im/pricing

## Need Help?

- Vercel Documentation: https://vercel.com/docs
- PlanetScale Docs: https://planetscale.com/docs
- NextAuth Docs: https://next-auth.js.org/getting-started/introduction
- Clerk Docs: https://clerk.com/docs

## Migration Support

If you need help with the migration, consider:
1. Hiring a developer familiar with Vercel deployments
2. Using Vercel's migration services
3. Reaching out to Manus support for export assistance
