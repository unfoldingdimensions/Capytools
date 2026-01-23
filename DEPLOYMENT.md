# Deployment Guide

This guide covers deploying Handcraft Resume to Vercel (recommended) and other platforms.

## Vercel Deployment (Recommended)

Vercel is the recommended platform as it's built by the creators of Next.js and offers the best performance and developer experience.

### Prerequisites

- GitHub account
- Vercel account (sign up at [vercel.com](https://vercel.com))
- Production database (Neon, Supabase, or other PostgreSQL provider)
- Clerk production account

### Step 1: Prepare Your Repository

1. Push your code to GitHub:
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/handcraft-resume.git
git push -u origin main
```

2. Ensure `.env.local` is in `.gitignore` (it should be by default)

### Step 2: Create Production Database

Using Neon (recommended):

1. Go to [neon.tech](https://neon.tech)
2. Create a new project
3. Copy the connection string
4. Save it for Step 4

### Step 3: Set Up Production Clerk

1. Go to [clerk.com](https://clerk.com) dashboard
2. Create a production instance or switch to production keys
3. Note down:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`

### Step 4: Deploy to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click **Add New** → **Project**
3. Import your GitHub repository
4. Configure environment variables:

```env
# Database
DATABASE_URL=your-production-database-url
DIRECT_URL=your-production-database-url

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# App
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
NODE_ENV=production

# Security (generate new keys for production!)
ENCRYPTION_KEY=your-production-encryption-key-32-chars
JWT_SECRET=your-production-jwt-secret-32-chars

# Rate Limiting
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=900000
```

5. Click **Deploy**

### Step 5: Run Database Migrations

After deployment:

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Link to your project
vercel link

# Run migrations
vercel env pull .env.production
npx prisma migrate deploy
```

Or use Vercel's edge functions:
- Go to your project settings
- Enable **Vercel Postgres** or configure your external database
- Migrations will run automatically on deployment

### Step 6: Configure Clerk Webhook

1. Go to Clerk Dashboard → Webhooks
2. Add new endpoint: `https://your-domain.vercel.app/api/webhooks/clerk`
3. Subscribe to events:
   - `user.created`
   - `user.updated`
   - `user.deleted`
4. Copy the signing secret
5. Add to Vercel environment variables:
   ```
   CLERK_WEBHOOK_SECRET=whsec_...
   ```

### Step 7: Test Production Deployment

1. Visit your deployed URL
2. Sign up for an account
3. Create a test resume
4. Export to PDF/DOCX
5. Upload a resume file
6. Verify all functionality works

## Environment Variables Checklist

Before going live, verify all these are set:

- [ ] `DATABASE_URL` - Production database
- [ ] `DIRECT_URL` - Production database (same as above)
- [ ] `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Production key
- [ ] `CLERK_SECRET_KEY` - Production secret
- [ ] `CLERK_WEBHOOK_SECRET` - Webhook signing secret
- [ ] `NEXT_PUBLIC_APP_URL` - Your production domain
- [ ] `ENCRYPTION_KEY` - Strong, unique, 32+ characters
- [ ] `JWT_SECRET` - Strong, unique, 32+ characters
- [ ] `NODE_ENV=production`

## Post-Deployment

### Configure Custom Domain

1. In Vercel project settings → Domains
2. Add your custom domain
3. Follow DNS configuration instructions
4. Update `NEXT_PUBLIC_APP_URL` environment variable
5. Update Clerk allowed domains

### Set Up Monitoring

1. **Vercel Analytics**: Enable in project settings
2. **Error Tracking**: Consider Sentry integration
3. **Uptime Monitoring**: Use UptimeRobot or similar

### Database Backups

For Neon:
- Automatic backups are included
- Configure backup retention in settings

For other providers:
- Set up automated backups
- Test restore procedures

## Alternative Deployment Options

### Netlify

1. Similar to Vercel process
2. Use `netlify.toml` for configuration:
```toml
[build]
  command = "npm run build"
  publish = ".next"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

### Railway

1. Connect GitHub repository
2. Add environment variables
3. Deploy automatically

### Docker

See `Dockerfile` (to be created) for containerization.

## Security Checklist

Before going live:

- [ ] All secrets are production-grade (not reused from dev)
- [ ] HTTPS is enabled (automatic on Vercel)
- [ ] Rate limiting is configured
- [ ] Audit logs are being created
- [ ] Error messages don't expose sensitive data
- [ ] Database has proper indexes
- [ ] Webhook endpoints are secured
- [ ] CORS is properly configured
- [ ] Input validation is working

## Troubleshooting

### Build Failures

**Problem**: TypeScript errors during build
```bash
# Solution: Run type check locally
npm run type-check
```

**Problem**: Missing environment variables
```bash
# Solution: Verify all required vars are set in Vercel
vercel env ls
```

### Runtime Errors

**Problem**: Database connection timeout
- Check connection string is correct
- Verify database is accessible from Vercel
- Check connection pool settings

**Problem**: Clerk authentication fails
- Verify production keys are used
- Check allowed origins in Clerk dashboard
- Verify webhook is configured correctly

### Performance Issues

**Problem**: Slow API responses
- Check database query performance with `prisma studio`
- Add appropriate indexes
- Enable Vercel's Edge Functions if needed

**Problem**: Large bundle size
- Run `npm run build` locally and check size
- Use dynamic imports for heavy components
- Enable compression in `next.config.ts`

## Rollback Procedure

If something goes wrong:

1. In Vercel dashboard → Deployments
2. Find the last working deployment
3. Click **...** → **Promote to Production**
4. Deployment rolls back instantly

## Support

For deployment issues:
- Check Vercel logs in dashboard
- Review build logs
- Check function logs
- Review Clerk webhook logs

## Cost Estimation

### Vercel
- **Hobby Plan**: Free
  - 100GB bandwidth
  - Unlimited deployments
  - Hobby projects

- **Pro Plan**: $20/month
  - 1TB bandwidth
  - Team collaboration
  - Production projects

### Neon Database
- **Free Tier**: $0
  - 0.5GB storage
  - 1 project
  - Good for testing

- **Pro**: ~$20/month
  - 10GB storage
  - Multiple projects
  - Production use

### Clerk Authentication
- **Free Tier**: $0
  - 5,000 MAU (Monthly Active Users)
  - All features

- **Pro**: $25/month
  - 1,000 MAU included
  - Additional users: $0.02/user

**Estimated Total**: $0 - $65/month depending on usage

---

Need help? Check the [README.md](./README.md) or create an issue on GitHub.

