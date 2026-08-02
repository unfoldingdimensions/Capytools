-- Drop the write-only "data" JSON column on resumes.
-- It was only ever written by create-from-upload and never read anywhere.
ALTER TABLE "resumes" DROP COLUMN "data";
