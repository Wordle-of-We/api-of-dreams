-- DropForeignKey
ALTER TABLE "Play" DROP CONSTRAINT "Play_userId_fkey";

-- AlterTable
ALTER TABLE "Attempt" ADD COLUMN     "playId" INTEGER;

-- AlterTable
ALTER TABLE "Play" ADD COLUMN     "guestId" TEXT,
ALTER COLUMN "userId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Play" ADD CONSTRAINT "Play_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attempt" ADD CONSTRAINT "Attempt_playId_fkey" FOREIGN KEY ("playId") REFERENCES "Play"("id") ON DELETE SET NULL ON UPDATE CASCADE;
