/*
  Warnings:

  - You are about to drop the column `chartConfig` on the `PowerAnalyzerConfiguration` table. All the data in the column will be lost.
  - You are about to drop the column `listSensors` on the `PowerAnalyzerConfiguration` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `PowerAnalyzerConfiguration` table. All the data in the column will be lost.
  - You are about to drop the `PowerAnalyzerLog` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "AlarmType" AS ENUM ('CRITICAL', 'MAJOR', 'MINOR');

-- CreateEnum
CREATE TYPE "AlarmKeyType" AS ENUM ('DIRECT', 'THRESHOLD', 'BIT_VALUE');

-- DropForeignKey
ALTER TABLE "PowerAnalyzerLog" DROP CONSTRAINT "PowerAnalyzerLog_configId_fkey";

-- AlterTable
ALTER TABLE "PowerAnalyzerConfiguration" DROP COLUMN "chartConfig",
DROP COLUMN "listSensors",
DROP COLUMN "type",
ADD COLUMN     "mainPower" JSONB,
ADD COLUMN     "pduList" JSONB;

-- DropTable
DROP TABLE "PowerAnalyzerLog";

-- CreateTable
CREATE TABLE "MenuConfiguration" (
    "id" TEXT NOT NULL,
    "structure" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MenuConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlarmConfiguration" (
    "id" TEXT NOT NULL,
    "customName" TEXT NOT NULL,
    "alarmType" "AlarmType" NOT NULL,
    "keyType" "AlarmKeyType" NOT NULL,
    "key" TEXT NOT NULL,
    "deviceUniqId" TEXT NOT NULL,
    "minValue" DOUBLE PRECISION,
    "maxValue" DOUBLE PRECISION,
    "maxOnly" BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AlarmConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlarmBitConfiguration" (
    "id" TEXT NOT NULL,
    "alarmConfigId" TEXT NOT NULL,
    "bitPosition" INTEGER NOT NULL,
    "customName" TEXT NOT NULL,
    "alertToWhatsApp" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "AlarmBitConfiguration_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "AlarmConfiguration" ADD CONSTRAINT "AlarmConfiguration_deviceUniqId_fkey" FOREIGN KEY ("deviceUniqId") REFERENCES "DeviceExternal"("uniqId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlarmBitConfiguration" ADD CONSTRAINT "AlarmBitConfiguration_alarmConfigId_fkey" FOREIGN KEY ("alarmConfigId") REFERENCES "AlarmConfiguration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
