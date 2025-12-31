-- Add mobile column and make username optional
-- AlterTable
ALTER TABLE "users" ALTER COLUMN "username" DROP NOT NULL;
ALTER TABLE "users" ADD COLUMN "mobile" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_mobile_key" ON "users"("mobile");
