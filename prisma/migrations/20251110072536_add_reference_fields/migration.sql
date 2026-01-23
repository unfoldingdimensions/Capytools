/*
  Warnings:

  - Added the required column `reference` to the `tailored_resumes` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ats_scores" ADD COLUMN     "reference" TEXT;

-- AlterTable
ALTER TABLE "interview_practice_sessions" ADD COLUMN     "reference" TEXT;

-- AlterTable
ALTER TABLE "tailored_resumes" ADD COLUMN     "reference" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "ats_scores_reference_idx" ON "ats_scores"("reference");

-- CreateIndex
CREATE INDEX "interview_practice_sessions_reference_idx" ON "interview_practice_sessions"("reference");

-- CreateIndex
CREATE INDEX "tailored_resumes_reference_idx" ON "tailored_resumes"("reference");
