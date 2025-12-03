# Environment Variables for Vercel Deployment

This document lists all environment variables required for deploying SoleBlessing to Vercel.

## Required Variables

### Database
```
DATABASE_URL=mysql://username:password@host:port/database?ssl={"rejectUnauthorized":true}
```
- **Description**: MySQL connection string from PlanetScale, Railway, or other provider
- **Example**: `mysql://user:pass@aws.connect.psdb.cloud/soleblessing?ssl={"rejectUnauthorized":true}`

### AWS S3 Storage
```
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key
S3_BUCKET_NAME=your-bucket-name
S3_PUBLIC_URL=https://your-bucket.s3.amazonaws.com
```
- **Description**: AWS credentials for storing product images, payment proofs, and review photos
- **Alternative**: Use Cloudflare R2 (S3-compatible)

### Authentication (Choose One)

#### Option A: NextAuth.js
```
NEXTAUTH_URL=https://your-domain.vercel.app
NEXTAUTH_SECRET=generate_random_32_char_secret
GOOGLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_CLIENT_SECRET=your_google_oauth_secret
```

#### Option B: Clerk
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
CLERK_SECRET_KEY=sk_test_xxxxx
```

### JWT & Security
```
JWT_SECRET=generate_random_32_char_secret
```
- **Description**: Secret for signing JWT tokens
- **Generate**: `openssl rand -base64 32`

### Application Configuration
```
VITE_APP_TITLE=SoleBlessing - Premium Sneaker Store
VITE_APP_LOGO=/logo.png
OWNER_OPEN_ID=your_oauth_user_id
OWNER_NAME=Your Name
```

## Optional Variables

### Google Sheets Integration
```
GOOGLE_SHEETS_API_KEY=your_api_key
GOOGLE_SHEETS_SPREADSHEET_ID=your_spreadsheet_id
```

### Email Notifications (SMTP)
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=SoleBlessing <noreply@soleblessing.com>
```

### Payment Gateway (Future)
```
STRIPE_PUBLIC_KEY=pk_test_xxxxx
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
```

### Analytics
```
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

## Adding Variables to Vercel

### Via Vercel Dashboard
1. Go to your project settings
2. Navigate to "Environment Variables"
3. Add each variable with its value
4. Select environments (Production, Preview, Development)
5. Click "Save"

### Via Vercel CLI
```bash
vercel env add DATABASE_URL production
vercel env add AWS_ACCESS_KEY_ID production
# ... add all variables
```

## Security Best Practices

1. **Never commit secrets to git** - Use `.gitignore` for `.env.local`
2. **Use strong secrets** - Generate with `openssl rand -base64 32`
3. **Rotate regularly** - Change secrets periodically
4. **Enable SSL** - Always use SSL for database connections
5. **Restrict access** - Use IAM roles with minimal permissions
6. **Monitor usage** - Set up alerts for unusual activity

## Troubleshooting

### Variable not found
- Ensure variable is added to correct environment (Production/Preview/Development)
- Redeploy after adding new variables

### Database connection fails
- Check DATABASE_URL format
- Verify SSL settings
- Ensure database allows connections from Vercel IPs

### S3 upload fails
- Verify IAM user has S3 permissions
- Check bucket policy allows public read
- Ensure CORS is configured if needed
