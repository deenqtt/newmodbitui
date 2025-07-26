/*
  Warnings:

  - You are about to drop the column `publishTargetDeviceId` on the `BillConfiguration` table. All the data in the column will be lost.
  - You are about to drop the column `sourceDeviceId` on the `BillConfiguration` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[publishTargetDeviceUniqId]` on the table `BillConfiguration` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `publishTargetDeviceUniqId` to the `BillConfiguration` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sourceDeviceUniqId` to the `BillConfiguration` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "BillConfiguration" DROP CONSTRAINT "BillConfiguration_publishTargetDeviceId_fkey";

-- DropForeignKey
ALTER TABLE "BillConfiguration" DROP CONSTRAINT "BillConfiguration_sourceDeviceId_fkey";

-- DropIndex
DROP INDEX "BillConfiguration_publishTargetDeviceId_key";

-- AlterTable
ALTER TABLE "BillConfiguration" DROP COLUMN "publishTargetDeviceId",
DROP COLUMN "sourceDeviceId",
ADD COLUMN     "publishTargetDeviceUniqId" TEXT NOT NULL,
ADD COLUMN     "sourceDeviceUniqId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "BillConfiguration_publishTargetDeviceUniqId_key" ON "BillConfiguration"("publishTargetDeviceUniqId");

-- AddForeignKey
ALTER TABLE "BillConfiguration" ADD CONSTRAINT "BillConfiguration_sourceDeviceUniqId_fkey" FOREIGN KEY ("sourceDeviceUniqId") REFERENCES "DeviceExternal"("uniqId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillConfiguration" ADD CONSTRAINT "BillConfiguration_publishTargetDeviceUniqId_fkey" FOREIGN KEY ("publishTargetDeviceUniqId") REFERENCES "DeviceExternal"("uniqId") ON DELETE RESTRICT ON UPDATE CASCADE;
