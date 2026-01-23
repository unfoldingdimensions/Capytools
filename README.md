# Handcraft Resume - AI-Powered Resume Builder SaaS

A modern, secure, and feature-rich resume builder application built with Next.js 15, React 19, TypeScript, and Prisma ORM.

## 🚀 Features

### Phase 1 (Current)

- ✅ **Free Resume Builder**: Create professional resumes with intuitive forms
  - Personal information
  - Work experience
  - Education
  - Projects
  - Skills
  - Certifications
  - Custom sections

- ✅ **Resume Export**: Download resumes in multiple formats
  - PDF export
  - DOCX export

- ✅ **Resume Upload & Parsing**: Upload existing resumes (PDF/DOCX) and auto-fill forms

- ✅ **Authentication**: Secure user authentication with Clerk
  - Sign up/Sign in
  - Session management
  - User profile management

- ✅ **Security Features**:
  - AES-256 encryption for sensitive data at rest
  - JWT tokens with httpOnly cookies
  - Input validation with Zod schemas
  - Rate limiting on API routes
  - Comprehensive error logging and audit trails
  - Fail-loud error handling philosophy

## 🛠️ Tech Stack

### Frontend
- **Next.js 15** - React framework with App Router
- **React 18** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Redux Toolkit** - State management
- **React Hook Form + Zod** - Form validation
- **Radix UI** - Accessible UI components

### Backend
- **Next.js API Routes** - RESTful API
- **Prisma ORM** - Database ORM
- **PostgreSQL** - Database (Neon)
- **Clerk** - Authentication
- **Express.js** - Middleware support

### Security & Infrastructure
- **AES-256-GCM** - Data encryption
- **JWT** - Token-based authentication
- **Zod** - Input validation
- **Rate Limiting** - API protection
- **Audit Logging** - Security monitoring

### File Processing
- **pdf-parse** - PDF parsing
- **mammoth** - DOCX parsing
- **docx** - DOCX generation
- **jsPDF** - PDF generation

## 📋 Prerequisites

- Node.js >= 18.0.0
- npm >= 8.0.0
- PostgreSQL database (or Neon account)
- Clerk account for authentication

## 🔧 Installation

### 1. Clone the repository

```bash
git clone <repository-url>
cd handcraft-resume
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Copy `.env.example` to `.env.local` and fill in the required values:

```bash
cp .env.example .env.local
```

### Required Environment Variables

```env
# Database (Get from Neon.tech or your PostgreSQL instance)
DATABASE_URL="postgresql://user:password@host:5432/database?schema=public"
DIRECT_URL="postgresql://user:password@host:5432/database?schema=public"

# Clerk Authentication (Get from clerk.com)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_xxxxx"
CLERK_SECRET_KEY="sk_test_xxxxx"
CLERK_WEBHOOK_SECRET="whsec_xxxxx"

# App Configuration
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"

# Encryption Keys (Generate with: openssl rand -base64 32)
ENCRYPTION_KEY="your-256-bit-encryption-key-here"
JWT_SECRET="your-jwt-secret-key-here"
```

### 4. Set up the database

```bash
# Generate Prisma Client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# (Optional) Seed the database
npm run prisma:seed
```

### 5. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## 📁 Project Structure

```
handcraft-resume/
├── app/                      # Next.js App Router
│   ├── layout.tsx           # Root layout
│   ├── page.tsx             # Home page
│   ├── providers.tsx        # Redux Provider
│   └── dashboard/           # Dashboard pages
├── pages/
│   └── api/                 # API routes
│       ├── resumes/         # Resume CRUD endpoints
│       ├── upload.ts        # File upload endpoint
│       └── webhooks/        # Webhook handlers
├── components/              # React components
│   ├── ui/                  # Reusable UI components
│   ├── dashboard/           # Dashboard components
│   └── resume/              # Resume builder components
├── lib/
│   ├── db/                  # Database utilities
│   ├── security/            # Encryption & JWT
│   ├── services/            # Business logic
│   ├── validations/         # Zod schemas
│   └── utils/               # Utility functions
├── middleware/              # API middleware
│   ├── auth.ts             # Authentication middleware
│   ├── rateLimit.ts        # Rate limiting
│   └── errorHandler.ts     # Error handling
├── store/                   # Redux store
│   └── slices/             # Redux slices
├── types/                   # TypeScript types
├── prisma/                  # Database schema
│   └── schema.prisma       # Prisma schema
└── __tests__/              # Unit tests
```

## 🧪 Testing

Run unit tests:

```bash
npm test
```

Run tests in watch mode:

```bash
npm run test:watch
```

Generate coverage report:

```bash
npm run test:coverage
```

## 🔒 Security Features

### Data Encryption
All sensitive user data is encrypted at rest using AES-256-GCM encryption:
- Personal information
- Work experience
- Education details
- All resume data

### Authentication
- Clerk handles user authentication
- JWT tokens stored in httpOnly cookies
- Session management with automatic refresh

### Rate Limiting
API endpoints are protected with rate limiting:
- 100 requests per 15 minutes (default)
- Configurable per endpoint
- IP-based and user-based tracking

### Input Validation
All inputs are validated using Zod schemas:
- Type-safe validation
- Detailed error messages
- Prevents injection attacks

### Fail-Loud Error Handling
Following the `.cursorrules` philosophy:
- All errors are logged with full context
- No silent fallbacks
- Detailed error messages for debugging
- Production-safe error responses

## 📚 API Documentation

### Resumes

#### Get all resumes
```
GET /api/resumes
Authorization: Required
```

#### Get single resume
```
GET /api/resumes/[id]
Authorization: Required
```

#### Create resume
```
POST /api/resumes
Authorization: Required
Body: { title, data, templateId?, customStyles?, isPublic? }
```

#### Update resume
```
PUT /api/resumes/[id]
Authorization: Required
Body: Partial resume data
```

#### Delete resume
```
DELETE /api/resumes/[id]
Authorization: Required
```

#### Export resume
```
POST /api/resumes/export
Authorization: Required
Body: { resumeId, format: 'PDF' | 'DOCX' }
Credits: Requires 1 credit
```

### Upload

#### Upload resume file
```
POST /api/upload
Authorization: Required
Content-Type: multipart/form-data
Body: file (PDF or DOCX, max 10MB)
```

## 🚀 Deployment

### Vercel Deployment (Recommended)

1. Push your code to GitHub

2. Import project in Vercel:
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your repository

3. Configure environment variables in Vercel:
   - Add all variables from `.env.example`
   - Use production values for DATABASE_URL, Clerk keys, etc.

4. Deploy:
   ```bash
   vercel --prod
   ```

### Environment Setup for Production

Ensure these are set in Vercel:
- All Clerk keys (production keys)
- Database URLs (production database)
- Strong encryption keys (never reuse development keys)
- Set `NODE_ENV=production`

### Post-Deployment

1. Set up Clerk webhook:
   - Go to Clerk Dashboard → Webhooks
   - Add endpoint: `https://your-domain.com/api/webhooks/clerk`
   - Select events: `user.created`, `user.updated`, `user.deleted`

2. Run database migrations:
   ```bash
   npx prisma migrate deploy
   ```

## 🔐 Security Checklist

- [ ] All environment variables are set correctly
- [ ] ENCRYPTION_KEY is strong and unique (32+ characters)
- [ ] JWT_SECRET is strong and unique (32+ characters)
- [ ] Database credentials are secure
- [ ] Clerk webhook secret is configured
- [ ] HTTPS is enabled in production
- [ ] Rate limiting is configured appropriately
- [ ] Error logging is set up

## 📖 Development Guidelines

### Code Style
- Follow TypeScript strict mode
- No `any` types allowed
- Use ESLint and Prettier
- Write meaningful comments for complex logic

### Error Handling
- Always throw detailed errors
- Never use fallback data that masks errors
- Log errors with full context
- Return structured error responses

### Testing
- Write tests for all critical modules
- Test error cases thoroughly
- Maintain test coverage above 80%

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is private and proprietary.

## 🐛 Known Issues

None currently. Please report issues on GitHub.

## 📞 Support

For support, please contact the development team or create an issue on GitHub.

## 🗺️ Roadmap

### Phase 2 (Planned)
- AI-powered resume improvement suggestions (OpenAI GPT-4)
- Multiple resume templates
- Advanced styling customization
- Resume preview in real-time
- Supabase storage integration for file uploads

### Phase 3 (Planned)
- Stripe payment integration
- Razorpay integration (for Indian market)
- Subscription tiers (Basic, Premium, Enterprise)
- Credit system for exports
- Analytics dashboard

### Phase 4 (Planned)
- AI cover letter generator
- LinkedIn import
- Job application tracking
- Interview preparation tools
- Team collaboration features

---

Built with ❤️ using Next.js 15, React 18, and TypeScript

