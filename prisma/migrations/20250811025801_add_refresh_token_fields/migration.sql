-- AlterTable
ALTER TABLE "User" ADD COLUMN     "refreshTokenExpires" TIMESTAMP(3),
ADD COLUMN     "refreshTokenHash" TEXT;
