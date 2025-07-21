/*
  Warnings:

  - The `race` column on the `Character` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `ethnicity` column on the `Character` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Character" DROP COLUMN "race",
ADD COLUMN     "race" TEXT[] DEFAULT ARRAY[]::TEXT[],
DROP COLUMN "ethnicity",
ADD COLUMN     "ethnicity" TEXT[] DEFAULT ARRAY[]::TEXT[];
