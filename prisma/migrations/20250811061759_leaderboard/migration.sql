-- CreateEnum
CREATE TYPE "LeaderboardPeriod" AS ENUM ('DAILY', 'WEEKLY', 'ALL_TIME');

-- CreateTable
CREATE TABLE "LeaderboardEntry" (
    "id" SERIAL NOT NULL,
    "period" "LeaderboardPeriod" NOT NULL,
    "date" TIMESTAMP(3),
    "weekStart" TIMESTAMP(3),
    "modeConfigId" INTEGER,
    "userId" INTEGER NOT NULL,
    "score" INTEGER NOT NULL,
    "games" INTEGER NOT NULL,
    "rank" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeaderboardEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LeaderboardEntry_period_date_modeConfigId_idx" ON "LeaderboardEntry"("period", "date", "modeConfigId");

-- CreateIndex
CREATE INDEX "LeaderboardEntry_period_weekStart_modeConfigId_idx" ON "LeaderboardEntry"("period", "weekStart", "modeConfigId");

-- CreateIndex
CREATE UNIQUE INDEX "LeaderboardEntry_period_date_weekStart_modeConfigId_userId_key" ON "LeaderboardEntry"("period", "date", "weekStart", "modeConfigId", "userId");
