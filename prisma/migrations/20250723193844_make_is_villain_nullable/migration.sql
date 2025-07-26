/*
  Warnings:

  - You are about to drop the column `isVillain` on the `Character` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Character" DROP COLUMN "isVillain",
ADD COLUMN     "paper" BOOLEAN DEFAULT false;
