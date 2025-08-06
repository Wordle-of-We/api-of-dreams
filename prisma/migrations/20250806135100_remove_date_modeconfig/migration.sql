-- DropIndex
DROP INDEX "DailySelection_date_modeConfigId_key";

-- AlterTable
ALTER TABLE "Attempt" ALTER COLUMN "order" DROP NOT NULL;
