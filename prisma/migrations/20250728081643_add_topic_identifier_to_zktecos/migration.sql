/*
  Warnings:

  - A unique constraint covering the columns `[topicIdentifier]` on the table `ZkTecoDevice` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "ZkTecoDevice" ADD COLUMN     "topicIdentifier" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "ZkTecoDevice_topicIdentifier_key" ON "ZkTecoDevice"("topicIdentifier");
