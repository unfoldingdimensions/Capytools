-- AlterTable
ALTER TABLE "resumes" ADD COLUMN     "data" JSONB;

-- CreateTable
CREATE TABLE "job_descriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "requirements" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "responsibilities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_descriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tailored_resumes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "originalResumeId" TEXT NOT NULL,
    "jobDescriptionId" TEXT NOT NULL,
    "tailoredDataEncrypted" TEXT NOT NULL,
    "changesEncrypted" TEXT NOT NULL,
    "suggestionsEncrypted" TEXT,
    "atsScore" DOUBLE PRECISION,
    "matchScore" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tailored_resumes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ats_scores" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "resumeId" TEXT NOT NULL,
    "jobDescriptionId" TEXT,
    "overallScore" INTEGER NOT NULL,
    "formattingScore" INTEGER NOT NULL,
    "keywordScore" INTEGER NOT NULL,
    "experienceScore" INTEGER NOT NULL,
    "educationScore" INTEGER NOT NULL,
    "skillsScore" INTEGER NOT NULL,
    "clarityScore" INTEGER NOT NULL,
    "suggestions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "missingKeywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "matchedRequirements" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ats_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interview_practice_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "resumeId" TEXT NOT NULL,
    "jobDescriptionId" TEXT,
    "questions" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "interview_practice_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_job_queue" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "payloadEncrypted" TEXT NOT NULL,
    "resultEncrypted" TEXT,
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ai_job_queue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_usage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "usageCount" INTEGER NOT NULL DEFAULT 1,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feature_usage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "job_descriptions_userId_idx" ON "job_descriptions"("userId");

-- CreateIndex
CREATE INDEX "job_descriptions_userId_createdAt_idx" ON "job_descriptions"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "tailored_resumes_userId_idx" ON "tailored_resumes"("userId");

-- CreateIndex
CREATE INDEX "tailored_resumes_originalResumeId_idx" ON "tailored_resumes"("originalResumeId");

-- CreateIndex
CREATE INDEX "tailored_resumes_jobDescriptionId_idx" ON "tailored_resumes"("jobDescriptionId");

-- CreateIndex
CREATE INDEX "ats_scores_userId_idx" ON "ats_scores"("userId");

-- CreateIndex
CREATE INDEX "ats_scores_resumeId_idx" ON "ats_scores"("resumeId");

-- CreateIndex
CREATE INDEX "ats_scores_resumeId_createdAt_idx" ON "ats_scores"("resumeId", "createdAt");

-- CreateIndex
CREATE INDEX "interview_practice_sessions_userId_idx" ON "interview_practice_sessions"("userId");

-- CreateIndex
CREATE INDEX "interview_practice_sessions_resumeId_idx" ON "interview_practice_sessions"("resumeId");

-- CreateIndex
CREATE INDEX "interview_practice_sessions_userId_createdAt_idx" ON "interview_practice_sessions"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ai_job_queue_userId_idx" ON "ai_job_queue"("userId");

-- CreateIndex
CREATE INDEX "ai_job_queue_status_idx" ON "ai_job_queue"("status");

-- CreateIndex
CREATE INDEX "ai_job_queue_userId_status_idx" ON "ai_job_queue"("userId", "status");

-- CreateIndex
CREATE INDEX "ai_job_queue_createdAt_idx" ON "ai_job_queue"("createdAt");

-- CreateIndex
CREATE INDEX "feature_usage_userId_idx" ON "feature_usage"("userId");

-- CreateIndex
CREATE INDEX "feature_usage_feature_idx" ON "feature_usage"("feature");

-- CreateIndex
CREATE UNIQUE INDEX "feature_usage_userId_feature_key" ON "feature_usage"("userId", "feature");

-- AddForeignKey
ALTER TABLE "job_descriptions" ADD CONSTRAINT "job_descriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tailored_resumes" ADD CONSTRAINT "tailored_resumes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tailored_resumes" ADD CONSTRAINT "tailored_resumes_originalResumeId_fkey" FOREIGN KEY ("originalResumeId") REFERENCES "resumes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tailored_resumes" ADD CONSTRAINT "tailored_resumes_jobDescriptionId_fkey" FOREIGN KEY ("jobDescriptionId") REFERENCES "job_descriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ats_scores" ADD CONSTRAINT "ats_scores_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ats_scores" ADD CONSTRAINT "ats_scores_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "resumes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ats_scores" ADD CONSTRAINT "ats_scores_jobDescriptionId_fkey" FOREIGN KEY ("jobDescriptionId") REFERENCES "job_descriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_practice_sessions" ADD CONSTRAINT "interview_practice_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_practice_sessions" ADD CONSTRAINT "interview_practice_sessions_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "resumes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_practice_sessions" ADD CONSTRAINT "interview_practice_sessions_jobDescriptionId_fkey" FOREIGN KEY ("jobDescriptionId") REFERENCES "job_descriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_job_queue" ADD CONSTRAINT "ai_job_queue_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feature_usage" ADD CONSTRAINT "feature_usage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
