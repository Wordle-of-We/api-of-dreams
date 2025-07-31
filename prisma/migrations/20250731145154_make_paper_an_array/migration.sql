/*
  Warnings:

  - The `paper` column on the `Character` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Character" DROP COLUMN "paper",
ADD COLUMN     "paper" TEXT[] DEFAULT ARRAY[]::TEXT[];
