-- AlterTable
ALTER TABLE "Play" ADD COLUMN     "selectionDate" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "DailySelection_date_modeConfigId_latest_idx" ON "DailySelection"("date", "modeConfigId", "latest");

-- CreateIndex
CREATE INDEX "Play_modeConfigId_selectionDate_idx" ON "Play"("modeConfigId", "selectionDate");

-- CreateIndex
CREATE INDEX "Play_userId_modeConfigId_selectionDate_idx" ON "Play"("userId", "modeConfigId", "selectionDate");
