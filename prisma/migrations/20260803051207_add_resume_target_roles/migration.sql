-- AlterTable
ALTER TABLE "resumes" ADD COLUMN     "targetRoles" TEXT[] DEFAULT ARRAY[]::TEXT[];
