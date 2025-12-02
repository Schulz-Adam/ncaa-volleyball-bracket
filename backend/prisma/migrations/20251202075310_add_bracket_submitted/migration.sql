-- AlterTable
ALTER TABLE "users" ADD COLUMN     "bracketSubmitted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "bracketSubmittedAt" TIMESTAMP(3);
