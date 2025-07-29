/*
  Warnings:

  - You are about to drop the column `mode` on the `AccessLog` table. All the data in the column will be lost.
  - You are about to drop the column `mode` on the `Attempt` table. All the data in the column will be lost.
  - You are about to drop the column `mode` on the `DailySelection` table. All the data in the column will be lost.
  - You are about to drop the column `mode` on the `ModeConfig` table. All the data in the column will be lost.
  - You are about to drop the column `mode` on the `Play` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[date,modeConfigId]` on the table `DailySelection` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name]` on the table `ModeConfig` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `modeConfigId` to the `Attempt` table without a default value. This is not possible if the table is not empty.
  - Added the required column `modeConfigId` to the `DailySelection` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `ModeConfig` table without a default value. This is not possible if the table is not empty.
  - Added the required column `modeConfigId` to the `Play` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "DailySelection_date_mode_key";

-- DropIndex
DROP INDEX "ModeConfig_mode_key";

-- AlterTable
ALTER TABLE "AccessLog" DROP COLUMN "mode",
ADD COLUMN     "modeConfigId" INTEGER;

-- AlterTable
ALTER TABLE "Attempt" DROP COLUMN "mode",
ADD COLUMN     "modeConfigId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "DailySelection" DROP COLUMN "mode",
ADD COLUMN     "modeConfigId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "ModeConfig" DROP COLUMN "mode",
ADD COLUMN     "name" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Play" DROP COLUMN "mode",
ADD COLUMN     "modeConfigId" INTEGER NOT NULL;

-- DropEnum
DROP TYPE "GameMode";

-- CreateIndex
CREATE UNIQUE INDEX "DailySelection_date_modeConfigId_key" ON "DailySelection"("date", "modeConfigId");

-- CreateIndex
CREATE UNIQUE INDEX "ModeConfig_name_key" ON "ModeConfig"("name");

-- AddForeignKey
ALTER TABLE "Play" ADD CONSTRAINT "Play_modeConfigId_fkey" FOREIGN KEY ("modeConfigId") REFERENCES "ModeConfig"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attempt" ADD CONSTRAINT "Attempt_modeConfigId_fkey" FOREIGN KEY ("modeConfigId") REFERENCES "ModeConfig"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailySelection" ADD CONSTRAINT "DailySelection_modeConfigId_fkey" FOREIGN KEY ("modeConfigId") REFERENCES "ModeConfig"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessLog" ADD CONSTRAINT "AccessLog_modeConfigId_fkey" FOREIGN KEY ("modeConfigId") REFERENCES "ModeConfig"("id") ON DELETE SET NULL ON UPDATE CASCADE;
