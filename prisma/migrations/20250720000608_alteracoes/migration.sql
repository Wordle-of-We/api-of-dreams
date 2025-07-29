/*
  Warnings:

  - You are about to drop the column `emoji` on the `Character` table. All the data in the column will be lost.
  - Changed the type of `race` on the `Character` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `ethnicity` on the `Character` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `hair` on the `Character` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "Character" DROP COLUMN "emoji",
ADD COLUMN     "emojis" TEXT[] DEFAULT ARRAY[]::TEXT[],
DROP COLUMN "race",
ADD COLUMN     "race" TEXT NOT NULL,
DROP COLUMN "ethnicity",
ADD COLUMN     "ethnicity" TEXT NOT NULL,
DROP COLUMN "hair",
ADD COLUMN     "hair" TEXT NOT NULL;

-- DropEnum
DROP TYPE "Ethnicity";

-- DropEnum
DROP TYPE "Hair";

-- DropEnum
DROP TYPE "Race";
