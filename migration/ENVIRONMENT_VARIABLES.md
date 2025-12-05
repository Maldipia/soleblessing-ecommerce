# Environment Variables for Migration

This document lists all environment variables currently used in the Manus-hosted SoleBlessing project. You'll need to recreate or replace these when deploying to Railway + Vercel.

## Current Environment Variables

### Database
- `DATABASE_URL` - MySQL connection string (currently Manus-managed)
  - **Action Required**: Create new MySQL database on Railway and get new connection string

### Authentication & Security
- `JWT_SECRET` - Secret for signing JWT tokens
  - **Action Required**: Generate new secret with `openssl rand -base64 32`

- `OAUTH_SERVER_URL` - Manus OAuth server URL
  - **Action Required**: Replace with NextAuth or Clerk configuration

- `VITE_APP_ID` - Manus OAuth application ID
  - **Action Required**: Replace with your OAuth provider's client ID

- `VITE_OAUTH_PORTAL_URL` - Manus login portal URL
  - **Action Required**: Replace with your OAuth provider's login URL

### Owner/Admin Configuration
- `OWNER_OPEN_ID` - OAuth ID of the website owner (for admin access)
  - **Action Required**: Update with your new OAuth user ID

- `OWNER_NAME` - Name of the website owner
  - **Current Value**: (check Manus dashboard)
  - **Action Required**: Keep the same or update

### Application Branding
- `VITE_APP_TITLE` - Website title
  - **Current Value**: `SoleBlessing - Premium Sneaker Store`
  - **Action Required**: Keep the same

- `VITE_APP_LOGO` - Logo file path
  - **Current Value**: `/logo.png`
  - **Action Required**: Keep the same

### Analytics (Manus-specific)
- `VITE_ANALYTICS_ENDPOINT` - Manus analytics endpoint
  - **Action Required**: Replace with Google Analytics or Vercel Analytics

- `VITE_ANALYTICS_WEBSITE_ID` - Manus analytics website ID
  - **Action Required**: Replace with your analytics tracking ID

### Manus Built-in APIs (Will Need Replacement)
- `BUILT_IN_FORGE_API_URL` - Manus API endpoint
  - **Action Required**: Remove or replace with custom implementations

- `BUILT_IN_FORGE_API_KEY` - Manus API key (server-side)
  - **Action Required**: Remove

- `VITE_FRONTEND_FORGE_API_KEY` - Manus API key (frontend)
  - **Action Required**: Remove

### Google Integration
- `GOOGLE_DRIVE_TOKEN` - Token for Google Drive access (for product images)
  - **Action Required**: Keep if still using Google Sheets import

## New Environment Variables Needed for Railway + Vercel

### AWS S3 Storage (New)
```
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key
S3_BUCKET_NAME=soleblessing-images
S3_PUBLIC_URL=https://soleblessing-images.s3.amazonaws.com
```

### NextAuth Configuration (New - if using NextAuth)
```
NEXTAUTH_URL=https://your-domain.vercel.app
NEXTAUTH_SECRET=generate_random_32_char_secret
GOOGLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_CLIENT_SECRET=your_google_oauth_secret
```

### Clerk Configuration (New - if using Clerk)
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
CLERK_SECRET_KEY=sk_test_xxxxx
```

### Email Notifications (Optional - New)
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=SoleBlessing <noreply@soleblessing.com>
```

## Migration Checklist

- [ ] Create Railway MySQL database and get DATABASE_URL
- [ ] Generate new JWT_SECRET
- [ ] Set up AWS S3 bucket and get credentials
- [ ] Choose and configure authentication provider (NextAuth/Clerk)
- [ ] Update OWNER_OPEN_ID with new OAuth user ID
- [ ] Configure email service (optional)
- [ ] Set up analytics (Google Analytics or Vercel Analytics)
- [ ] Add all variables to Vercel project settings
- [ ] Test database connection
- [ ] Test file uploads to S3
- [ ] Test authentication flow

## Security Notes

1. **Never commit .env files to git** - Already in .gitignore
2. **Use strong secrets** - Generate with `openssl rand -base64 32`
3. **Rotate secrets regularly** - Change JWT_SECRET periodically
4. **Enable SSL** - Always use SSL for database connections
5. **Restrict S3 access** - Use IAM roles with minimal permissions
6. **Monitor usage** - Set up alerts for unusual activity

## Getting Current Values

To get the actual values of these environment variables from your current Manus deployment:

1. Contact Manus Support at https://help.manus.im
2. Request export of environment variables
3. They can provide:
   - Current DATABASE_URL (for reference)
   - JWT_SECRET (can be reused or regenerate new one)
   - OWNER_OPEN_ID (your user ID)
   - Any other non-platform-specific values

## Questions?

If you need help with any of these variables or the migration process, refer to:
- `VERCEL_DEPLOYMENT.md` - Complete deployment guide
- `RAILWAY_SETUP.md` - Railway database setup guide
- Manus Support - https://help.manus.im
