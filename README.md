# Handcraft Resume - AI-Powered Resume Builder SaaS

A modern, secure, and feature-rich resume builder application built with Next.js 15, React 19, TypeScript, and Prisma ORM. Handcraft leverages cutting-edge AI to help you build job-winning resumes in minutes.

## 🚀 Key Features

### 🧠 AI Writing Assistant (Now Live!)
- ✅ **Bring Your Own Key (BYOK)**: Use your own API keys for OpenAI, Z.ai, or OpenRouter for maximum flexibility and cost control.
- ✅ **Professional Summary Generation**: Create impactful summaries tailored to your target roles.
- ✅ **AI Bullet Points**: Automatically generate or improve work experience achievements.
- ✅ **Grammar & Style Check**: Real-time professional tone and grammar validation.
- ✅ **Section Tailoring**: Dynamically adapt your experience, skills, and summary for specific job descriptions.
- ✅ **Smart Defaults**: Optimized for speed with high-performance models like `glm-4-flash`.

### 📄 Pro Resume Building
- ✅ **Real-Time Premium Preview**: A high-fidelity, live-rendering preview of your resume as you type.
- ✅ **Resume Export**: Download in professional PDF and DOCX formats.
- ✅ **Resume Upload & Parsing**: Import existing resumes and auto-fill your profile using AI parsing.
- ✅ **Draft Saving**: Save incomplete drafts with our permissive validation system, allowing you to return and finish anytime.

### 🔐 Security & Infrastructure
- ✅ **Authentication**: Secure user management with Clerk.
- ✅ **Data Privacy**: AES-256 encryption for all sensitive user data at rest.
- ✅ **Performance**: Lightning-fast Next.js 15 architecture with App Router and SSR.
- ✅ **Safety**: Rate limiting and strict Input validation with Zod.

## 🛠️ Tech Stack

### Frontend
- **Next.js 15** - React framework with App Router
- **React 19** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS** - Modern styling
- **Redux Toolkit** - State management
- **Standard UI** - Premium custom components for speed and aesthetics

### Backend
- **Next.js API Routes** - RESTful API
- **Prisma ORM** - Database Layer
- **PostgreSQL** - Scalable storage via Neon
- **Clerk** - Identity and Auth

### AI Engine
- **OpenAI / Z.ai / OpenRouter** - Multiple provider support
- **BYOK Architecture** - Client-side key delivery (keys stay in the browser and are never stored on our servers)

## 📋 Prerequisites

- Node.js >= 20.0.0
- npm >= 10.0.0
- PostgreSQL database
- Clerk account for authentication
- AI Provider API Key (Optional, defaults available)

## 🔧 Getting Started

### 1. Clone & Install
```bash
git clone https://github.com/unfoldingdimensions/Handcraftresume.git
cd Handcraftresume
npm install
```

### 2. Environment Setup
Copy `.env.example` to `.env` and configure your keys:
- `DATABASE_URL`: Your PostgreSQL connection string.
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: From Clerk dashboard.
- `CLERK_SECRET_KEY`: From Clerk dashboard.
- `ENCRYPTION_KEY`: 32-character string for data security.
- `NVIDIA_API_KEY` or `OPENAI_API_KEY`: For default AI features.

### 3. Database Initialization
```bash
npx prisma generate
npx prisma migrate dev
```

### 4. Run Development
```bash
npm run dev
```

## 🗺️ Roadmap & Current State

### ✅ Phase 1 & 2 (Completed)
- [x] Core Resume Builder Engine
- [x] AI Tailoring & Writing Assistant
- [x] BYOK Configuration UI
- [x] Real-time PDF/Print Preview
- [x] Saveable Drafts with Permissive Validation

### 🏗️ Phase 3 (In Progress)
- [ ] Advanced Multi-Template Engine
- [ ] Stripe Payment Integration
- [ ] Custom Color & Typography Schemes
- [ ] LinkedIn Direct Profile Import

### 🌟 Phase 4 (Future)
- [ ] AI Cover Letter Generator
- [ ] Job Application Tracker (CRM)
- [ ] Interactive Interview Preparation
- [ ] Resume Version A/B Testing

## 📝 License

This project is private and proprietary to **Unfolding Dimensions**.

---
Built with ❤️ by the Handcraft Team
