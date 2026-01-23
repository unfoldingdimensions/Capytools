# Quick Start Guide

Get your Handcraft Resume application running in 5 minutes!

## Prerequisites

- Node.js 18+ installed
- A PostgreSQL database (we recommend [Neon](https://neon.tech) for free hosting)
- A [Clerk](https://clerk.com) account for authentication

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Set Up Environment Variables

1. Copy the example environment file:
```bash
cp .env.example .env.local
```

2. Get your database URL from Neon:
   - Sign up at [neon.tech](https://neon.tech)
   - Create a new project
   - Copy the connection string
   - Paste it as `DATABASE_URL` and `DIRECT_URL` in `.env.local`

3. Get your Clerk credentials:
   - Sign up at [clerk.com](https://clerk.com)
   - Create a new application
   - Go to API Keys
   - Copy `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`
   - Paste them in `.env.local`

4. Generate encryption keys:
```bash
# On Mac/Linux
openssl rand -base64 32

# On Windows (PowerShell)
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```
   - Use the output for `ENCRYPTION_KEY` and `JWT_SECRET`

5. Set your app URL:
```
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

Your `.env.local` should look like:
```env
DATABASE_URL="postgresql://user:pass@host.neon.tech/dbname"
DIRECT_URL="postgresql://user:pass@host.neon.tech/dbname"
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
ENCRYPTION_KEY="your-generated-key-here"
JWT_SECRET="your-generated-key-here"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"
```

## Step 3: Set Up the Database

```bash
# Generate Prisma client
npm run prisma:generate

# Create database tables
npm run prisma:migrate
```

## Step 4: Configure Clerk Webhooks (Important!)

1. In Clerk Dashboard, go to **Webhooks**
2. Click **Add Endpoint**
3. For local development, use ngrok or similar:
   ```bash
   # Install ngrok: https://ngrok.com
   ngrok http 3000
   ```
4. Add endpoint URL: `https://your-ngrok-url.ngrok.io/api/webhooks/clerk`
5. Subscribe to events:
   - `user.created`
   - `user.updated`
   - `user.deleted`
6. Copy the **Signing Secret** and add it to `.env.local`:
   ```
   CLERK_WEBHOOK_SECRET="whsec_..."
   ```

## Step 5: Run the Application

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser!

## Step 6: Test the Application

1. Click **Sign Up** to create an account
2. After signing in, you'll be redirected to the dashboard
3. Click **Create New Resume** to start building
4. Fill in your information
5. Export your resume as PDF or DOCX

## Troubleshooting

### Database Connection Error
- Check your `DATABASE_URL` is correct
- Make sure your Neon database is active
- Run `npm run prisma:migrate` to ensure tables are created

### Authentication Error
- Verify Clerk keys are correct
- Check that webhook is configured and receiving events
- Look at Clerk Dashboard → Logs for webhook delivery status

### Encryption Errors
- Ensure `ENCRYPTION_KEY` and `JWT_SECRET` are set and at least 32 characters
- Don't use spaces or special characters in these keys

### Port Already in Use
```bash
# Kill the process on port 3000
# Mac/Linux:
lsof -ti:3000 | xargs kill

# Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

## Next Steps

1. Explore the codebase:
   - `/app` - Next.js pages and layouts
   - `/pages/api` - API routes
   - `/components` - React components
   - `/lib` - Utilities and services

2. Read the [README.md](./README.md) for detailed documentation

3. Check out the [API Documentation](#) section in README

4. Start customizing the resume templates!

## Need Help?

- Check the [README.md](./README.md) for detailed docs
- Review error logs in the console
- Check Clerk Dashboard for auth issues
- Verify database tables with `npm run prisma:studio`

Happy building! 🚀

