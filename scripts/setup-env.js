#!/usr/bin/env node

/**
 * Interactive Environment Setup Script
 * 
 * This script helps you create a .env.local file with generated encryption keys
 * and prompts for required configuration values.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

function question(query) {
    return new Promise((resolve) => {
        rl.question(query, resolve);
    });
}

function generateKey() {
    return crypto.randomBytes(32).toString('base64');
}

async function main() {
    console.log('\n🚀 Handcraft Resume - Environment Setup\n');
    console.log('This script will help you create your .env.local file.\n');

    const envPath = path.join(__dirname, '..', '.env.local');

    // Check if .env.local already exists
    if (fs.existsSync(envPath)) {
        const overwrite = await question(
            '⚠️  .env.local already exists. Overwrite? (y/N): '
        );
        if (overwrite.toLowerCase() !== 'y') {
            console.log('\n❌ Setup cancelled. Your existing .env.local was not modified.\n');
            rl.close();
            return;
        }
    }

    console.log('\n📝 Please provide the following information:\n');
    console.log('💡 Tip: Press Enter to use the default value shown in [brackets]\n');

    // Database
    console.log('1️⃣  DATABASE SETUP');
    const databaseUrl =
        (await question(
            '   Database URL (from Neon.tech): '
        )) || 'postgresql://user:password@host:5432/database';
    const directUrl = await question(
        '   Direct URL (usually same as Database URL) [same]: '
    );

    // Clerk
    console.log('\n2️⃣  CLERK AUTHENTICATION');
    const clerkPublicKey =
        (await question('   Clerk Publishable Key (starts with pk_): ')) ||
        'pk_test_your_key_here';
    const clerkSecretKey =
        (await question('   Clerk Secret Key (starts with sk_): ')) ||
        'sk_test_your_secret_here';
    const clerkWebhook =
        (await question('   Clerk Webhook Secret (optional for now): ')) ||
        'whsec_optional_for_local_dev';

    // App URL
    console.log('\n3️⃣  APPLICATION');
    const appUrl =
        (await question('   App URL [http://localhost:3000]: ')) ||
        'http://localhost:3000';

    // Generate encryption keys
    console.log('\n4️⃣  SECURITY KEYS');
    console.log('   Generating secure encryption keys...');
    const encryptionKey = generateKey();
    const jwtSecret = generateKey();
    console.log('   ✅ Generated ENCRYPTION_KEY');
    console.log('   ✅ Generated JWT_SECRET');

    // Build .env.local content
    const envContent = `# ============================================
# HANDCRAFT RESUME - Environment Configuration
# Generated: ${new Date().toISOString()}
# ============================================

# Database Configuration
DATABASE_URL="${databaseUrl}"
DIRECT_URL="${directUrl || databaseUrl}"

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="${clerkPublicKey}"
CLERK_SECRET_KEY="${clerkSecretKey}"
CLERK_WEBHOOK_SECRET="${clerkWebhook}"

# Clerk Routes
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL="/dashboard"
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL="/dashboard"

# App Configuration
NEXT_PUBLIC_APP_URL="${appUrl}"
NODE_ENV="development"

# Security & Encryption Keys (Auto-generated)
ENCRYPTION_KEY="${encryptionKey}"
JWT_SECRET="${jwtSecret}"

# Rate Limiting Configuration
RATE_LIMIT_MAX_REQUESTS="100"
RATE_LIMIT_WINDOW_MS="900000"

# ============================================
# OPTIONAL: Phase 2 Services (Add when needed)
# ============================================

# OpenAI API
# OPENAI_API_KEY="sk-your_openai_key"

# Supabase Storage
# NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
# NEXT_PUBLIC_SUPABASE_ANON_KEY="your_anon_key"
# SUPABASE_SERVICE_ROLE_KEY="your_service_role_key"

# Upstash Redis
# UPSTASH_REDIS_REST_URL="https://your-redis.upstash.io"
# UPSTASH_REDIS_REST_TOKEN="your_token"

# Stripe
# STRIPE_SECRET_KEY="sk_test_your_stripe_secret"
# NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_your_stripe_publishable"
# STRIPE_WEBHOOK_SECRET="whsec_your_stripe_webhook_secret"

# Razorpay
# RAZORPAY_KEY_ID="rzp_test_your_key_id"
# RAZORPAY_KEY_SECRET="your_razorpay_secret"
# RAZORPAY_WEBHOOK_SECRET="your_razorpay_webhook_secret"

# ============================================
# SECURITY NOTES:
# - This file is in .gitignore and will NOT be committed
# - Never share these keys publicly
# - Use different keys for production
# - Rotate keys if ever exposed
# ============================================
`;

    // Write .env.local file
    try {
        fs.writeFileSync(envPath, envContent, 'utf8');
        console.log('\n✅ SUCCESS! .env.local file created!\n');
        console.log('📍 Location:', envPath);
        console.log('\n📋 Next steps:\n');
        console.log('   1. Run: npm run prisma:generate');
        console.log('   2. Run: npm run prisma:migrate');
        console.log('   3. Run: npm run dev');
        console.log('\n💡 To configure webhooks for local development:');
        console.log('   - Install ngrok: npm install -g ngrok');
        console.log('   - Run: ngrok http 3000');
        console.log('   - Add the ngrok URL to Clerk webhooks\n');
        console.log('📚 For detailed setup instructions, see: ENV_SETUP_GUIDE.md\n');
    } catch (error) {
        console.error('\n❌ Error creating .env.local:', error.message);
        console.log('\n💡 You can create the file manually using ENV_SETUP_GUIDE.md\n');
    }

    rl.close();
}

main().catch((error) => {
    console.error('\n❌ Setup failed:', error.message);
    rl.close();
    process.exit(1);
});

