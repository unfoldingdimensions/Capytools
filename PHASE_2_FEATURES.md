# Phase 2: AI-Powered Features Documentation

## 🚀 Overview

Phase 2 introduces AI-powered features to enhance your resume builder with intelligent job matching, ATS optimization, and interview preparation capabilities powered by GPT-4.

---

## ✨ Features

### 1. Job Description Parser & Analyzer

Automatically extracts structured data from job descriptions using AI.

**Endpoint**: `POST /api/ai/parse-job-description`

**Request Body**:
```json
{
  "title": "Senior Software Engineer",
  "company": "Google",
  "description": "Full job description text...",
  "url": "https://careers.google.com/..." // Optional
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "jd_123",
    "title": "Senior Software Engineer",
    "company": "Google",
    "description": "Clean description",
    "requirements": ["5+ years experience", "..."],
    "responsibilities": ["Lead team", "..."],
    "skills": ["JavaScript", "React", "..."],
    "keywords": ["technical", "leadership", "..."],
    "experienceLevel": "senior",
    "employmentType": "full-time",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

### 2. ATS Scoring & Optimization

Analyzes resume compatibility with Applicant Tracking Systems and provides optimization suggestions.

**Endpoint**: `POST /api/ai/ats-score`

**Request Body**:
```json
{
  "resumeId": "resume_123",
  "jobDescriptionId": "jd_456"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "score_789",
    "overallScore": 85,
    "categoryScores": {
      "keywords": 90,
      "skills": 85,
      "experience": 80,
      "formatting": 95
    },
    "suggestions": [
      "Add more job-specific keywords...",
      "Quantify your achievements..."
    ],
    "missingKeywords": ["TypeScript", "AWS", "..."],
    "matchedRequirements": 12,
    "analysisDate": "2024-01-01T00:00:00.000Z",
    "creditsRemaining": 9
  }
}
```

**Score Interpretation**:
- **80-100**: Excellent - High chance of passing ATS
- **60-79**: Good - Likely to pass with minor improvements
- **40-59**: Fair - Needs significant optimization
- **0-39**: Poor - Requires major revisions

---

### 3. AI Resume Tailoring

Automatically optimizes your resume for specific job descriptions.

**Endpoint**: `POST /api/ai/tailor-resume`

**Request Body**:
```json
{
  "resumeId": "resume_123",
  "jobDescriptionId": "jd_456"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "tailoredSummary": "Results-driven senior software engineer with 8+ years...",
    "optimizedExperience": [
      {
        "position": "Senior Developer",
        "company": "Tech Corp",
        "optimizedAchievements": [
          "Led team of 5 engineers to deliver...",
          "Improved system performance by 40%..."
        ]
      }
    ],
    "suggestedSkills": [
      "JavaScript",
      "React",
      "Node.js",
      "..."
    ],
    "customizations": [
      "Emphasize leadership experience in summary",
      "Add metrics to all achievements",
      "..."
    ],
    "creditsRemaining": 8
  }
}
```

---

### 4. Interview Questions Generator

Generates personalized interview questions based on your resume and target job.

**Endpoint**: `POST /api/ai/interview-questions`

**Request Body**:
```json
{
  "resumeId": "resume_123",
  "jobDescriptionId": "jd_456",
  "count": 10 // Optional, default: 10, max: 30
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "sessionId": "session_789",
    "questions": [
      {
        "category": "behavioral",
        "difficulty": "medium",
        "question": "Tell me about a time when you had to lead a team through a difficult project.",
        "suggestedAnswer": "Using the STAR method: In my role at...",
        "keyPoints": [
          "Demonstrate leadership skills",
          "Show problem-solving ability",
          "Include measurable outcomes"
        ]
      }
    ],
    "creditsRemaining": 7
  }
}
```

**Question Categories**:
- `behavioral`: Behavioral interview questions (STAR method)
- `technical`: Technical skills assessment
- `situational`: Hypothetical scenario questions
- `experience-based`: Questions about specific experiences

**Difficulty Levels**:
- `easy`: Entry-level or straightforward questions
- `medium`: Mid-level complexity
- `hard`: Senior-level or complex scenarios

---

## 🔒 Feature Access Control

### Subscription Tiers & Features

| Feature | FREE | BASIC | PREMIUM | ENTERPRISE |
|---------|------|-------|---------|------------|
| Job Description Parser | ❌ | ✅ | ✅ | ✅ |
| ATS Scoring | ❌ | ✅ | ✅ | ✅ |
| AI Resume Tailoring | ❌ | ✅ | ✅ | ✅ |
| Interview Questions | ❌ | ✅ | ✅ | ✅ |
| Unlimited Exports | ❌ | ❌ | ✅ | ✅ |
| Custom Templates | ❌ | ❌ | ✅ | ✅ |

### Credits System

AI features require credits:
- **ATS Scoring**: 1 credit
- **Resume Tailoring**: 1 credit
- **Interview Questions**: 1 credit
- **Job Description Parser**: Free (no credits required)

**Default Credits by Tier**:
- FREE: 3 credits (for testing)
- BASIC: 10 credits/month
- PREMIUM: 50 credits/month
- ENTERPRISE: Unlimited

---

## 🛠️ Integration Guide

### Frontend Integration

#### Using Job Description Input Component

```tsx
import JobDescriptionInput from '@/components/ai/JobDescriptionInput';

function MyPage() {
  const handleSubmit = async (data) => {
    const response = await fetch('/api/ai/parse-job-description', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    const result = await response.json();
    if (result.success) {
      console.log('Parsed job:', result.data);
    }
  };

  return <JobDescriptionInput onSubmit={handleSubmit} />;
}
```

#### Using ATS Scoring Report Component

```tsx
import ATSScoringReport from '@/components/ai/ATSScoringReport';

function MyPage({ score }) {
  return <ATSScoringReport score={score} />;
}
```

#### Using Interview Questions List Component

```tsx
import InterviewQuestionsList from '@/components/ai/InterviewQuestionsList';

function MyPage({ questions }) {
  return <InterviewQuestionsList questions={questions} />;
}
```

---

## 📊 Service Layer Usage

### Using AI Services Directly

```typescript
import { parseJobDescription } from '@/lib/services/jobDescriptionParser.service';
import { scoreResumeAgainstJob } from '@/lib/services/atsScoring.service';
import { tailorResumeToJob } from '@/lib/services/resumeTailoring.service';
import { generateInterviewQuestions } from '@/lib/services/interviewQuestions.service';

// Parse job description
const parsed = await parseJobDescription({
  title: 'Senior Developer',
  company: 'Tech Corp',
  description: 'Full description...',
});

// Score resume
const score = await scoreResumeAgainstJob(resumeData, parsedJob);

// Tailor resume
const tailored = await tailorResumeToJob(resumeData, parsedJob);

// Generate interview questions
const questions = await generateInterviewQuestions(resumeData, parsedJob, 10);
```

---

## 🔐 Feature Gate Middleware

### Checking Feature Access

```typescript
import { checkFeatureAccess } from '@/middleware/featureGate';

const access = await checkFeatureAccess(userId, 'ats_scoring');

if (access.hasAccess) {
  // User can access feature
} else {
  // Show upgrade prompt
  console.log(access.reason);
  console.log('Required tier:', access.requiredTier);
}
```

### Deducting Credits

```typescript
import { deductCredits, refundCredits } from '@/middleware/featureGate';

// Deduct credits
const result = await deductCredits(userId, 'ats_scoring');

if (result.success) {
  try {
    // Perform AI operation
    const score = await scoreResumeAgainstJob(resume, job);
  } catch (error) {
    // Refund credits if operation failed
    await refundCredits(userId, 1);
    throw error;
  }
}
```

---

## ⚙️ Configuration

### Environment Variables

Add to your `.env.local`:

```env
# OpenAI API Key (Required for AI features)
OPENAI_API_KEY=sk-your_openai_key_here
```

### Getting an OpenAI API Key

1. Visit [OpenAI Platform](https://platform.openai.com/api-keys)
2. Sign up or log in
3. Go to **API Keys** section
4. Click **Create new secret key**
5. Copy the key and add to `.env.local`

**Pricing**: 
- GPT-4 Turbo: ~$0.01 per 1K tokens
- Average cost per operation: $0.02-$0.05
- Recommended budget: $50-100/month for moderate usage

---

## 🧪 Testing

### Manual Testing

1. **Parse Job Description**:
```bash
curl -X POST http://localhost:3000/api/ai/parse-job-description \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Software Engineer",
    "company": "Test Corp",
    "description": "We are looking for an experienced software engineer with 5+ years of experience in JavaScript, React, and Node.js. The ideal candidate will lead technical initiatives and mentor junior developers."
  }'
```

2. **ATS Score**:
```bash
curl -X POST http://localhost:3000/api/ai/ats-score \
  -H "Content-Type: application/json" \
  -d '{
    "resumeId": "your_resume_id",
    "jobDescriptionId": "your_job_description_id"
  }'
```

---

## 🐛 Troubleshooting

### Common Issues

#### 1. "OpenAI API Error"

**Problem**: OpenAI API key is invalid or missing.

**Solution**:
- Verify `OPENAI_API_KEY` is set in `.env.local`
- Check that the key starts with `sk-`
- Ensure you have credits in your OpenAI account

#### 2. "Insufficient Credits"

**Problem**: User has run out of AI credits.

**Solution**:
- Check user's `creditsRemaining` in database
- Offer upgrade to higher tier
- Manually add credits via admin panel

#### 3. "Feature Locked"

**Problem**: User's subscription tier doesn't include this feature.

**Solution**:
- Check `FEATURE_REQUIREMENTS` in `middleware/featureGate.ts`
- Upgrade user's subscription tier
- Offer free trial credits

#### 4. "AI Service Temporarily Unavailable"

**Problem**: OpenAI API is down or rate-limited.

**Solution**:
- Implement retry logic with exponential backoff
- Check OpenAI status page
- Consider caching results for common queries

---

## 📈 Performance & Optimization

### Response Times

- **Job Description Parsing**: 3-8 seconds
- **ATS Scoring**: 5-15 seconds
- **Resume Tailoring**: 10-30 seconds
- **Interview Questions**: 8-20 seconds

### Optimization Tips

1. **Use GPT-4 Turbo**: Faster and cheaper than standard GPT-4
2. **Implement Caching**: Cache parsed job descriptions and common queries
3. **Async Processing**: Use job queues for operations > 10 seconds
4. **Batch Requests**: Combine multiple AI calls when possible
5. **Set Timeout Limits**: Prevent hanging requests (60 seconds max)

---

## 🔮 Future Enhancements

### Planned for Phase 3

- [ ] **Cover Letter Generator**: AI-generated cover letters based on resume and job
- [ ] **Skill Gap Analysis**: Identify missing skills for career advancement
- [ ] **Salary Recommendations**: AI-powered salary insights based on market data
- [ ] **Resume A/B Testing**: Compare multiple resume versions
- [ ] **LinkedIn Profile Optimizer**: Sync and optimize LinkedIn profile
- [ ] **Video Interview Prep**: AI-powered mock video interviews

---

## 📚 API Reference Summary

| Endpoint | Method | Auth | Credits | Description |
|----------|--------|------|---------|-------------|
| `/api/ai/parse-job-description` | POST | ✅ | 0 | Parse job description |
| `/api/ai/ats-score` | POST | ✅ | 1 | Score resume for ATS |
| `/api/ai/tailor-resume` | POST | ✅ | 1 | Tailor resume to job |
| `/api/ai/interview-questions` | POST | ✅ | 1 | Generate interview questions |

---

## 🤝 Support

For questions or issues with Phase 2 features:

1. Check this documentation first
2. Review error logs in console/terminal
3. Verify environment variables are set correctly
4. Check OpenAI API status and credits
5. Contact support with detailed error information

---

## 📝 License

This feature is part of the Resume Builder SaaS Platform.
All AI features require proper licensing and API keys.

