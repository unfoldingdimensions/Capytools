# 🚀 NVIDIA NIM Setup Guide

## What is NVIDIA NIM?

NVIDIA NIM (NVIDIA Inference Microservices) provides **FREE** AI API access that's 100% compatible with OpenAI's SDK. Perfect for testing Phase 2 AI features without paying for OpenAI!

---

## ✅ Why Use NVIDIA NIM?

| Feature | NVIDIA NIM | OpenAI |
|---------|------------|--------|
| **Cost** | 🆓 FREE | 💰 $0.02-$0.05 per request |
| **Credit Card** | ❌ Not required | ✅ Required |
| **Setup Time** | ⚡ 2 minutes | ⏱️ 5+ minutes |
| **Quality** | 📊 Good for testing | 🏆 Best quality |
| **Use Case** | Development/Testing | Production |

---

## 🎯 Quick Setup (2 Minutes)

### Step 1: Get Your API Key

Your API key is already ready:
```
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
```

### Step 2: Add to `.env.local`

Open your `.env.local` file and add these three lines:

```env
# NVIDIA NIM API (Free)
NVIDIA_API_KEY="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"
OPENAI_BASE_URL="https://integrate.api.nvidia.com/v1"
AI_MODEL="meta/llama-3.2-1b-instruct"
```

**Important**: If you have `OPENAI_API_KEY` in your `.env.local`, comment it out:
```env
# OPENAI_API_KEY="sk-..." # Commented out - using NVIDIA instead
```

### Step 3: Test the Integration

Run this command to verify everything works:

```powershell
npx tsx scripts/test-nvidia-api.ts
```

You should see:
```
🚀 Testing NVIDIA NIM API Integration...
✅ Client initialized successfully
📦 Using model: meta/llama-3.2-1b-instruct
...
🎉 All tests PASSED!
```

### Step 4: Start Your App

```powershell
npm run dev
```

Visit http://localhost:3000 and test Phase 2 AI features!

---

## 🎨 Available Models

You can change the `AI_MODEL` in `.env.local` to use different models:

| Model | Size | Speed | Quality | Best For |
|-------|------|-------|---------|----------|
| `meta/llama-3.2-1b-instruct` | 1B | ⚡⚡⚡ Fast | ⭐⭐ Good | Quick testing |
| `meta/llama-3.2-3b-instruct` | 3B | ⚡⚡ Moderate | ⭐⭐⭐ Better | Balanced |
| `meta/llama-3.1-8b-instruct` | 8B | ⚡ Slower | ⭐⭐⭐⭐ Best | High quality |
| `nvidia/nemotron-mini-4b-instruct` | 4B | ⚡⚡ Moderate | ⭐⭐⭐ Better | NVIDIA optimized |

**To change model**, update `.env.local`:
```env
AI_MODEL="meta/llama-3.1-8b-instruct"  # Change to your preferred model
```

---

## 🧪 Testing Phase 2 Features

Once set up, you can test all Phase 2 AI features:

### 1. Parse Job Description

```bash
curl -X POST http://localhost:3000/api/ai/parse-job-description \
  -H "Content-Type: application/json" \
  -H "Cookie: your-clerk-session-cookie" \
  -d '{
    "title": "Senior Software Engineer",
    "company": "Tech Corp",
    "description": "We are looking for an experienced software engineer with 5+ years in JavaScript, React, Node.js, and TypeScript..."
  }'
```

### 2. ATS Score (Requires Resume ID and Job Description ID)

```bash
curl -X POST http://localhost:3000/api/ai/ats-score \
  -H "Content-Type: application/json" \
  -H "Cookie: your-clerk-session-cookie" \
  -d '{
    "resumeId": "your_resume_id",
    "jobDescriptionId": "your_job_description_id"
  }'
```

### 3. Tailor Resume

```bash
curl -X POST http://localhost:3000/api/ai/tailor-resume \
  -H "Content-Type: application/json" \
  -H "Cookie: your-clerk-session-cookie" \
  -d '{
    "resumeId": "your_resume_id",
    "jobDescriptionId": "your_job_description_id"
  }'
```

### 4. Generate Interview Questions

```bash
curl -X POST http://localhost:3000/api/ai/interview-questions \
  -H "Content-Type: application/json" \
  -H "Cookie: your-clerk-session-cookie" \
  -d '{
    "resumeId": "your_resume_id",
    "jobDescriptionId": "your_job_description_id",
    "count": 10
  }'
```

---

## ⚠️ Important Notes

### Rate Limits

NVIDIA NIM has generous rate limits for free tier:
- **~50 requests per minute** (varies by model)
- **~1000 requests per day** (varies by model)

If you hit rate limits, you'll see:
```json
{
  "error": {
    "message": "Rate limit exceeded",
    "type": "rate_limit_error"
  }
}
```

**Solution**: Wait a minute or switch to a smaller model.

### Quality vs. OpenAI

**NVIDIA NIM Models**:
- ✅ Great for testing and development
- ✅ Fast and free
- ⚠️ May produce less accurate results than GPT-4
- ⚠️ Sometimes returns non-JSON when JSON is expected

**OpenAI GPT-4**:
- ✅ Highest quality responses
- ✅ More reliable JSON extraction
- ✅ Better understanding of complex prompts
- ❌ Costs money

**Recommendation**:
- 🧪 Use NVIDIA NIM for development and testing
- 🚀 Switch to OpenAI GPT-4 for production

---

## 🔄 Switching Back to OpenAI

If you want to switch back to OpenAI later:

1. Get OpenAI API key from https://platform.openai.com/api-keys

2. Update `.env.local`:
```env
# Comment out NVIDIA
# NVIDIA_API_KEY="nvapi-..."
# OPENAI_BASE_URL="https://integrate.api.nvidia.com/v1"
# AI_MODEL="meta/llama-3.2-1b-instruct"

# Add OpenAI
OPENAI_API_KEY="sk-your_openai_key_here"
```

3. Restart your dev server:
```powershell
npm run dev
```

---

## 🐛 Troubleshooting

### Error: "API key not found"

**Solution**: Make sure you added `NVIDIA_API_KEY` to `.env.local` and restarted your dev server.

### Error: "Model not found"

**Solution**: Check that `AI_MODEL` matches one of the available models exactly:
- `meta/llama-3.2-1b-instruct`
- `meta/llama-3.2-3b-instruct`
- `meta/llama-3.1-8b-instruct`
- `nvidia/nemotron-mini-4b-instruct`

### Error: "Invalid JSON response"

**Cause**: Sometimes NVIDIA models return markdown-wrapped JSON or invalid JSON.

**Solution**: This is handled automatically in the code. If issues persist, try:
1. Use a larger model (3B or 8B)
2. Adjust temperature (lower = more consistent)
3. Add more specific instructions in prompts

### Slow Responses

**Cause**: Larger models (8B) take longer to generate responses.

**Solution**:
- Use smaller models for development (1B or 3B)
- Increase timeout if needed
- Consider caching common requests

---

## 📊 Performance Comparison

| Operation | NVIDIA (1B) | NVIDIA (8B) | OpenAI GPT-4 |
|-----------|-------------|-------------|--------------|
| Job Description Parse | 3-5s | 8-12s | 3-5s |
| ATS Scoring | 5-10s | 15-25s | 5-10s |
| Resume Tailoring | 10-20s | 30-45s | 10-20s |
| Interview Questions | 8-15s | 20-35s | 8-15s |

**Recommendation**: Use `meta/llama-3.2-3b-instruct` for balanced speed and quality during development.

---

## 🎓 Learn More

- [NVIDIA NIM Documentation](https://docs.nvidia.com/nim/)
- [Available Models](https://build.nvidia.com/explore/discover)
- [OpenAI SDK Compatibility](https://github.com/openai/openai-node)

---

## ✅ Quick Checklist

- [ ] Added `NVIDIA_API_KEY` to `.env.local`
- [ ] Added `OPENAI_BASE_URL` to `.env.local`
- [ ] Added `AI_MODEL` to `.env.local`
- [ ] Commented out `OPENAI_API_KEY` (if present)
- [ ] Ran `npx tsx scripts/test-nvidia-api.ts`
- [ ] Saw "All tests PASSED!" message
- [ ] Started dev server with `npm run dev`
- [ ] Tested Phase 2 API endpoints

---

**Status**: ✅ Ready to use NVIDIA NIM for FREE AI features!

**Need help?** Check `ENV_SETUP_GUIDE.md` or `PHASE_2_FEATURES.md`

