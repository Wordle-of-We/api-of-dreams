/*
  Warnings:

  - You are about to drop the column `characterId` on the `Attempt` table. All the data in the column will be lost.
  - Added the required column `targetCharacterId` to the `Attempt` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Attempt" DROP CONSTRAINT "Attempt_characterId_fkey";

-- AlterTable
ALTER TABLE "Attempt" DROP COLUMN "characterId",
ADD COLUMN     "guessedCharacterId" INTEGER,
ADD COLUMN     "targetCharacterId" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "Attempt" ADD CONSTRAINT "Attempt_targetCharacterId_fkey" FOREIGN KEY ("targetCharacterId") REFERENCES "Character"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attempt" ADD CONSTRAINT "Attempt_guessedCharacterId_fkey" FOREIGN KEY ("guessedCharacterId") REFERENCES "Character"("id") ON DELETE SET NULL ON UPDATE CASCADE;
