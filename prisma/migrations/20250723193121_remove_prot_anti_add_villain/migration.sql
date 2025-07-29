/*
  Warnings:

  - You are about to drop the column `isAntagonist` on the `Character` table. All the data in the column will be lost.
  - You are about to drop the column `isProtagonist` on the `Character` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Character" DROP COLUMN "isAntagonist",
DROP COLUMN "isProtagonist",
ADD COLUMN     "isVillain" BOOLEAN NOT NULL DEFAULT false;
