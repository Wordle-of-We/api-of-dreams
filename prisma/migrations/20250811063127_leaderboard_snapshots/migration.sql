/*
  Warnings:

  - A unique constraint covering the columns `[scopeKey,userId]` on the table `LeaderboardEntry` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `scopeKey` to the `LeaderboardEntry` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "LeaderboardEntry_period_date_modeConfigId_idx";

-- DropIndex
DROP INDEX "LeaderboardEntry_period_date_weekStart_modeConfigId_userId_key";

-- DropIndex
DROP INDEX "LeaderboardEntry_period_weekStart_modeConfigId_idx";

-- AlterTable
ALTER TABLE "LeaderboardEntry" ADD COLUMN     "scopeKey" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "LeaderboardEntry_period_scopeKey_idx" ON "LeaderboardEntry"("period", "scopeKey");

-- CreateIndex
CREATE UNIQUE INDEX "LeaderboardEntry_scopeKey_userId_key" ON "LeaderboardEntry"("scopeKey", "userId");
