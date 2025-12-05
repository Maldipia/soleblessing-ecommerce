# SoleBlessing Migration Package

This directory contains everything you need to migrate your SoleBlessing e-commerce website from Manus to Railway + Vercel.

## 📦 Package Contents

### 1. Database Export
- **`database_export.json`** - Complete database dump in JSON format (0.02 MB)
  - 1 user
  - 30 products
  - 84 browsing history records
  - All other tables (empty but schema preserved)

- **`database_export.sql`** - SQL INSERT statements for importing to Railway MySQL

### 2. Documentation
- **`RAILWAY_VERCEL_QUICKSTART.md`** - Step-by-step deployment guide (⭐ START HERE)
- **`ENVIRONMENT_VARIABLES.md`** - Complete list of environment variables and migration notes

### 3. Export Script
- **`../scripts/export-database.ts`** - TypeScript script used to generate these exports

## 🚀 Quick Start

1. **Read the Quick Start Guide**
   ```bash
   cat migration/RAILWAY_VERCEL_QUICKSTART.md
   ```

2. **Set up Railway Database** (15 min)
   - Create MySQL database on Railway
   - Import `database_export.sql`

3. **Set up AWS S3** (10 min)
   - Create S3 bucket
   - Get IAM credentials

4. **Choose Authentication** (20 min)
   - NextAuth.js (flexible) OR
   - Clerk (easiest)

5. **Deploy to Vercel** (10 min)
   - Import GitHub repo
   - Add environment variables
   - Deploy!

**Total Time**: ~1 hour

## 📊 Database Summary

| Table | Records | Description |
|-------|---------|-------------|
| users | 1 | User accounts |
| products | 30 | Product catalog |
| cartItems | 0 | Shopping cart items |
| wishlist | 0 | Wishlist items |
| orders | 0 | Customer orders |
| orderItems | 0 | Order line items |
| browsingHistory | 84 | Product view tracking |
| inquiries | 0 | Customer inquiries |
| loyaltyPoints | 0 | Loyalty program |
| reviews | 0 | Product reviews |
| reviewImages | 0 | Review photos |
| reviewVotes | 0 | Review helpful votes |

## 🔐 Environment Variables

See `ENVIRONMENT_VARIABLES.md` for complete list. Key variables you'll need:

### Must Replace
- `DATABASE_URL` - Get from Railway
- `AWS_ACCESS_KEY_ID` - Get from AWS IAM
- `AWS_SECRET_ACCESS_KEY` - Get from AWS IAM
- `NEXTAUTH_URL` / `CLERK_*` - Choose auth provider

### Can Reuse
- `JWT_SECRET` - Generate new or reuse
- `VITE_APP_TITLE` - Keep same
- `VITE_APP_LOGO` - Keep same

### Must Remove (Manus-specific)
- `BUILT_IN_FORGE_API_*`
- `VITE_ANALYTICS_*` (replace with Google Analytics)
- `OAUTH_SERVER_URL` (replace with NextAuth/Clerk)

## ⚠️ Important Notes

### What's Included
✅ Complete database schema and data  
✅ All product information  
✅ User accounts  
✅ Browsing history  
✅ Deployment documentation  

### What's NOT Included
❌ Product images (stored in Manus S3)  
❌ Payment proof uploads (stored in Manus S3)  
❌ Review photos (stored in Manus S3)  
❌ Manus OAuth credentials  
❌ Manus API keys  

### What You Need to Set Up
🔧 Railway MySQL database  
🔧 AWS S3 bucket (or Cloudflare R2)  
🔧 Authentication provider (NextAuth/Clerk)  
🔧 Email service (optional)  
🔧 Analytics (Google Analytics or Vercel Analytics)  

## 📁 File Storage Migration

Your product images are currently stored in Manus-managed S3. You have two options:

### Option 1: Re-import from Google Sheets
If your Google Sheets still has image URLs:
```bash
pnpm exec tsx scripts/import-from-sheets.ts
```
This will download and optimize images to your new S3 bucket.

### Option 2: Request S3 Export from Manus
Contact Manus Support at https://help.manus.im to request:
- Bulk download of all product images
- Payment proof uploads
- Review photos

Then upload to your AWS S3 bucket.

## 🆘 Getting Help

### Documentation
- `RAILWAY_VERCEL_QUICKSTART.md` - Complete deployment guide
- `ENVIRONMENT_VARIABLES.md` - Environment variable reference
- `../VERCEL_DEPLOYMENT.md` - Detailed Vercel guide
- `../docs/API_REFERENCE.md` - API documentation

### External Resources
- Railway: https://docs.railway.app
- Vercel: https://vercel.com/docs
- NextAuth: https://next-auth.js.org
- Clerk: https://clerk.com/docs

### Support
- Manus Support: https://help.manus.im (for export requests)
- GitHub Issues: https://github.com/Maldipia/soleblessing-ecommerce/issues

## 💰 Cost Comparison

### Railway + Vercel
- Railway: $5-20/month
- Vercel: $0-20/month
- AWS S3: $5-20/month
- **Total**: $10-60/month

### Manus Platform
- All-inclusive hosting
- Check pricing at https://manus.im/pricing

## ✅ Migration Checklist

- [ ] Read RAILWAY_VERCEL_QUICKSTART.md
- [ ] Create Railway MySQL database
- [ ] Import database_export.sql
- [ ] Create AWS S3 bucket
- [ ] Set up IAM user with S3 permissions
- [ ] Choose authentication provider
- [ ] Configure OAuth (Google/Facebook/etc.)
- [ ] Import GitHub repo to Vercel
- [ ] Add all environment variables
- [ ] Deploy to Vercel
- [ ] Test database connection
- [ ] Test file uploads
- [ ] Test authentication
- [ ] Import products from Google Sheets
- [ ] Configure custom domain
- [ ] Set up analytics
- [ ] Test all features

## 🎯 Next Steps

1. **Start with the Quick Start Guide**
   ```bash
   open migration/RAILWAY_VERCEL_QUICKSTART.md
   ```

2. **Set up Railway database first** - This is the foundation

3. **Then set up S3** - Required for images

4. **Choose authentication** - NextAuth is more flexible, Clerk is easier

5. **Deploy to Vercel** - Should take ~10 minutes once everything else is ready

6. **Test thoroughly** - Make sure all features work

Good luck with your migration! 🚀

---

**Generated**: December 2024  
**Package Version**: 1.0  
**Database Records**: 115 total (1 user, 30 products, 84 browsing history)
