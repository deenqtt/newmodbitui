/*
  Warnings:

  - A unique constraint covering the columns `[macAddress]` on the table `AccessController` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "AccessController_ipAddress_key";

-- AlterTable
ALTER TABLE "AccessController" ADD COLUMN     "lastSeen" TIMESTAMP(3),
ADD COLUMN     "macAddress" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "AccessController_macAddress_key" ON "AccessController"("macAddress");
