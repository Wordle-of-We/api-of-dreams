-- CreateTable
CREATE TABLE "DailyOverview" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "totalUsersEver" INTEGER NOT NULL,
    "totalNewUsers" INTEGER NOT NULL,
    "totalInitiatedPlays" INTEGER NOT NULL,
    "totalCompletedPlays" INTEGER NOT NULL,
    "totalUncompletedPlays" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyOverview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModeDailyStats" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "modeConfigId" INTEGER NOT NULL,
    "initiatedPlays" INTEGER NOT NULL,
    "completedPlays" INTEGER NOT NULL,
    "uncompletedPlays" INTEGER NOT NULL,
    "averageAttempts" DOUBLE PRECISION NOT NULL,
    "uniqueUsers" INTEGER NOT NULL,
    "overviewId" INTEGER NOT NULL,

    CONSTRAINT "ModeDailyStats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DailyOverview_date_key" ON "DailyOverview"("date");

-- CreateIndex
CREATE UNIQUE INDEX "ModeDailyStats_date_modeConfigId_key" ON "ModeDailyStats"("date", "modeConfigId");

-- AddForeignKey
ALTER TABLE "ModeDailyStats" ADD CONSTRAINT "ModeDailyStats_modeConfigId_fkey" FOREIGN KEY ("modeConfigId") REFERENCES "ModeConfig"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModeDailyStats" ADD CONSTRAINT "ModeDailyStats_overviewId_fkey" FOREIGN KEY ("overviewId") REFERENCES "DailyOverview"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
