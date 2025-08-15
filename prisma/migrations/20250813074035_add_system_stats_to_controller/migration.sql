/*
  Warnings:

  - A unique constraint covering the columns `[ipAddress]` on the table `AccessController` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."AccessController" ADD COLUMN     "freeHeap" INTEGER,
ADD COLUMN     "logFileSize" INTEGER,
ADD COLUMN     "spiffsTotal" INTEGER,
ADD COLUMN     "spiffsUsed" INTEGER,
ADD COLUMN     "totalHeap" INTEGER,
ADD COLUMN     "uptime" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "AccessController_ipAddress_key" ON "public"."AccessController"("ipAddress");
