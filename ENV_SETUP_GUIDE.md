# Environment Variables Setup Guide

## 📋 Creating Your `.env.local` File

Since `.env.local` is protected by `.gitignore` (for security), you need to create it manually.

### Step 1: Create the File

In the root directory, create a new file named `.env.local` and paste the following:

```env
# Database Configuration
DATABASE_URL="postgresql://user:password@host:5432/database?sslmode=require"
DIRECT_URL="postgresql://user:password@host:5432/database?sslmode=require"

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_your_key_here"
CLERK_SECRET_KEY="sk_test_your_secret_here"
CLERK_WEBHOOK_SECRET="whsec_your_webhook_secret_here"

# Clerk Routes
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL="/dashboard"
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL="/dashboard"

# App Configuration
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"

# Security & Encryption Keys
ENCRYPTION_KEY="your_encryption_key_here_32_chars_minimum"
JWT_SECRET="your_jwt_secret_here_32_chars_minimum"

# AI API Configuration (Phase 2 - Choose one)
# Option 1: OpenAI (Recommended for production, requires payment)
OPENAI_API_KEY="sk-your_openai_key_here"

# Option 2: NVIDIA NIM (Free for testing, compatible with OpenAI SDK)
NVIDIA_API_KEY="nvapi-your_nvidia_key_here"
OPENAI_BASE_URL="https://integrate.api.nvidia.com/v1"
AI_MODEL="meta/llama-3.2-1b-instruct"

# Supabase Storage (Phase 2 - Optional)
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your_anon_key_here"
SUPABASE_SERVICE_ROLE_KEY="your_service_role_key_here"

# Upstash Redis (Optional)
UPSTASH_REDIS_REST_URL="https://your-redis.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your_token_here"

# Stripe (Phase 2 - Optional)
STRIPE_SECRET_KEY="sk_test_your_stripe_secret"
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_your_stripe_publishable"
STRIPE_WEBHOOK_SECRET="whsec_your_stripe_webhook_secret"

# Razorpay (Phase 2 - Optional)
RAZORPAY_KEY_ID="rzp_test_your_key_id"
RAZORPAY_KEY_SECRET="your_razorpay_secret"
RAZORPAY_WEBHOOK_SECRET="your_razorpay_webhook_secret"

# Rate Limiting
RATE_LIMIT_MAX_REQUESTS="100"
RATE_LIMIT_WINDOW_MS="900000"
```

---

## 🔑 Required Setup (Phase 1)

### 1. Database Setup (PostgreSQL via Neon)

**Why**: Store user data, resumes, and application state

**Steps**:
1. Go to [neon.tech](https://neon.tech) and sign up (free tier available)
2. Click "Create Project"
3. Choose a name (e.g., "handcraft-resume")
4. Copy the connection string
5. Paste it into both `DATABASE_URL` and `DIRECT_URL`

**Example**:
```env
DATABASE_URL="postgresql://username:password@ep-cool-cloud-123456.us-east-2.aws.neon.tech/neondb?sslmode=require"
DIRECT_URL="postgresql://username:password@ep-cool-cloud-123456.us-east-2.aws.neon.tech/neondb?sslmode=require"
```

---

### 2. Clerk Authentication Setup

**Why**: Handle user authentication and session management

**Steps**:
1. Go to [clerk.com](https://clerk.com) and sign up (free: 5,000 MAU)
2. Click "Add Application"
3. Choose a name (e.g., "Handcraft Resume")
4. Select authentication methods (Email, Google, etc.)
5. Go to **API Keys** and copy:
   - Publishable Key → `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - Secret Key → `CLERK_SECRET_KEY`

**Example**:
```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_c3VwZXItc2VhbC00Ny5jbGVyay5hY2NvdW50cy5kZXYk"
CLERK_SECRET_KEY="sk_test_abcdefghijklmnopqrstuvwxyz123456789"
```

**Webhook Setup** (Important for user sync):
1. In Clerk Dashboard, go to **Webhooks**
2. Click "Add Endpoint"
3. For local development, use [ngrok](https://ngrok.com):
   ```bash
   # Install ngrok
   npm install -g ngrok
   
   # In a separate terminal, run:
   ngrok http 3000
   
   # Copy the HTTPS URL (e.g., https://abc123.ngrok.io)
   ```
4. Add endpoint: `https://your-ngrok-url.ngrok.io/api/webhooks/clerk`
5. Subscribe to events:
   - ✅ `user.created`
   - ✅ `user.updated`
   - ✅ `user.deleted`
6. Copy the **Signing Secret** → `CLERK_WEBHOOK_SECRET`

**Example**:
```env
CLERK_WEBHOOK_SECRET="whsec_1234567890abcdefghijklmnopqrstuvwxyz"
```

---

### 3. Generate Encryption Keys

**Why**: Secure sensitive data (AES-256 encryption, JWT tokens)

**Generate Strong Keys**:

#### Option 1: Using OpenSSL (Mac/Linux)
```bash
openssl rand -base64 32
```

#### Option 2: Using PowerShell (Windows)
```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

#### Option 3: Using Node.js (All Platforms)
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**Run the command TWICE** to generate:
1. `ENCRYPTION_KEY` (first run)
2. `JWT_SECRET` (second run)

**Example**:
```env
ENCRYPTION_KEY="a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6"
JWT_SECRET="z9y8x7w6v5u4t3s2r1q0p9o8n7m6l5k4j3i2h1g0f9e8d7c6b5a4"
```

---

## 🚀 Quick Setup Script

**For Mac/Linux**:
```bash
# 1. Create .env.local file
touch .env.local

# 2. Generate encryption keys
echo "ENCRYPTION_KEY=\"$(openssl rand -base64 32)\"" >> .env.local
echo "JWT_SECRET=\"$(openssl rand -base64 32)\"" >> .env.local

# 3. Add other required variables (edit the file)
echo "DATABASE_URL=\"your_database_url_here\"" >> .env.local
echo "DIRECT_URL=\"your_database_url_here\"" >> .env.local
echo "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=\"your_clerk_key\"" >> .env.local
echo "CLERK_SECRET_KEY=\"your_clerk_secret\"" >> .env.local
echo "NEXT_PUBLIC_APP_URL=\"http://localhost:3000\"" >> .env.local
echo "NODE_ENV=\"development\"" >> .env.local
```

**For Windows (PowerShell)**:
```powershell
# Generate encryption keys
$encKey = [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
$jwtSecret = [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))

Write-Host "ENCRYPTION_KEY=$encKey"
Write-Host "JWT_SECRET=$jwtSecret"
# Copy these values into your .env.local file
```

---

## 📝 After Setup

### 1. Run Database Migrations
```bash
npm run prisma:generate
npm run prisma:migrate
```

### 2. Verify Setup
```bash
# Check if environment variables are loaded
npm run dev

# You should see:
# - Next.js starting on http://localhost:3000
# - No errors about missing environment variables
```

### 3. Test Authentication
1. Visit `http://localhost:3000`
2. Click "Sign Up"
3. Create a test account
4. Verify webhook logs in terminal

---

## 🔐 Security Checklist

- [ ] `.env.local` is NOT committed to Git
- [ ] Different keys for development and production
- [ ] Encryption keys are at least 32 characters
- [ ] Clerk webhook is configured correctly
- [ ] Database URL includes `sslmode=require`
- [ ] No keys are exposed in frontend code

---

## ⚠️ Common Issues

### Issue: "ENCRYPTION_KEY environment variable is not set"
**Solution**: Make sure `.env.local` exists and contains `ENCRYPTION_KEY`

### Issue: "User not found in database"
**Solution**: Clerk webhook isn't configured. Check webhook URL and events.

### Issue: "Invalid connection string"
**Solution**: Database URL should include `?sslmode=require` at the end

### Issue: Clerk authentication not working
**Solution**: Check that `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` starts with `pk_`

---

## 📚 References

- [Neon Documentation](https://neon.tech/docs)
- [Clerk Documentation](https://clerk.com/docs)
- [Prisma Environment Variables](https://www.prisma.io/docs/concepts/components/prisma-schema/environment-variables)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)

---

## 🎯 Optional Setup (Phase 2)

These services are **not required** for Phase 1 but will be needed for Phase 2 AI features.

### Option A: NVIDIA NIM (Recommended for Development/Testing)

**Why**: Free AI API compatible with OpenAI SDK, perfect for testing Phase 2 features

**Pros**:
- ✅ **Completely FREE**
- ✅ No credit card required
- ✅ Works with OpenAI SDK (drop-in replacement)
- ✅ Fast setup (< 2 minutes)

**Steps**:
1. Go to [build.nvidia.com](https://build.nvidia.com/explore/discover)
2. Sign in with your NVIDIA account (or create one - it's free!)
3. Find "Llama 3.2 1B Instruct" or any model you prefer
4. Click **"Get API Key"**
5. Copy your API key (starts with `nvapi-`)

**Add to `.env.local`**:
```env
# NVIDIA NIM API (Free)
NVIDIA_API_KEY="nvapi-your_actual_key_here"
OPENAI_BASE_URL="https://integrate.api.nvidia.com/v1"
AI_MODEL="meta/llama-3.2-1b-instruct"
```

**Available Models** (you can use any of these):
- `meta/llama-3.2-1b-instruct` - Fast, good for testing
- `meta/llama-3.2-3b-instruct` - Balanced
- `meta/llama-3.1-8b-instruct` - High quality
- `nvidia/nemotron-mini-4b-instruct` - NVIDIA's model

**⚠️ Limitations**:
- Rate limits apply (but generous for free tier)
- Quality may be lower than GPT-4 for complex tasks
- Best for development/testing, not production

---

### Option B: OpenAI (Recommended for Production)

**Why**: Best AI quality, but requires payment

**Pros**:
- ✅ Highest quality AI responses
- ✅ Proven reliability
- ✅ Best for production use

**Cons**:
- ❌ Requires payment ($0.02-$0.05 per request)
- ❌ Credit card required

**Steps**:
1. Go to [platform.openai.com](https://platform.openai.com)
2. Sign up and add payment method
3. Go to [API Keys](https://platform.openai.com/api-keys)
4. Click **"Create new secret key"**
5. Copy your API key (starts with `sk-`)

**Add to `.env.local`**:
```env
# OpenAI API (Paid)
OPENAI_API_KEY="sk-your_openai_key_here"
# No need for OPENAI_BASE_URL or AI_MODEL (uses defaults)
```

**Cost Estimates**:
- Job Description Parsing: ~$0.03
- ATS Scoring: ~$0.05
- Resume Tailoring: ~$0.07
- Interview Questions: ~$0.05

**Monthly Cost** (estimated):
- 100 operations: ~$5
- 500 operations: ~$25
- 1,000 operations: ~$50

---

### Other Optional Services

- **Supabase**: File storage for uploaded resumes
- **Upstash Redis**: Caching and rate limiting
- **Stripe**: Payment processing
- **Razorpay**: Payment processing (India)

You can add these later when needed.

---

**Need Help?** Check the `QUICKSTART.md` for a 5-minute setup guide!

