/*
  Warnings:

  - You are about to drop the `Ec25GpsData` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Ec25Modem` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Ec25NetworkData` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."Ec25GpsData" DROP CONSTRAINT "Ec25GpsData_modemId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Ec25NetworkData" DROP CONSTRAINT "Ec25NetworkData_modemId_fkey";

-- DropTable
DROP TABLE "public"."Ec25GpsData";

-- DropTable
DROP TABLE "public"."Ec25Modem";

-- DropTable
DROP TABLE "public"."Ec25NetworkData";

-- CreateTable
CREATE TABLE "public"."ec25_modems" (
    "id" TEXT NOT NULL,
    "imei" TEXT NOT NULL,
    "manufacturer" TEXT,
    "model" TEXT,
    "revision" TEXT,
    "connected" BOOLEAN NOT NULL DEFAULT false,
    "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currentOperator" TEXT,
    "currentRegistrationStatus" TEXT,
    "currentNetworkType" TEXT,
    "currentSignalStrength" INTEGER,
    "currentSignalQuality" INTEGER,
    "currentRsrp" DOUBLE PRECISION,
    "currentRsrq" DOUBLE PRECISION,
    "currentSinr" DOUBLE PRECISION,
    "currentCellId" TEXT,
    "currentLatitude" DOUBLE PRECISION,
    "currentLongitude" DOUBLE PRECISION,
    "currentAltitude" DOUBLE PRECISION,
    "currentSpeed" DOUBLE PRECISION,
    "currentSatellites" INTEGER,
    "currentGpsFixStatus" TEXT,
    "configApn" TEXT,
    "configUsername" TEXT,
    "configPin" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ec25_modems_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ec25_network_data" (
    "id" TEXT NOT NULL,
    "modemId" TEXT NOT NULL,
    "operator" TEXT,
    "registrationStatus" TEXT,
    "networkType" TEXT,
    "signalStrength" INTEGER,
    "signalQuality" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ec25_network_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ec25_gps_data" (
    "id" TEXT NOT NULL,
    "modemId" TEXT NOT NULL,
    "fixStatus" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "altitude" DOUBLE PRECISION,
    "speed" DOUBLE PRECISION,
    "satellites" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ec25_gps_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ec25_service_health" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "lastSeen" TIMESTAMP(3) NOT NULL,
    "lastHeartbeat" TIMESTAMP(3),
    "uptime" DOUBLE PRECISION,
    "memoryUsage" TEXT,
    "data" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ec25_service_health_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ec25_service_logs" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "uptime" DOUBLE PRECISION,
    "data" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ec25_service_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ec25_alerts" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "requiresAction" BOOLEAN NOT NULL DEFAULT false,
    "details" TEXT,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ec25_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ec25_command_logs" (
    "id" TEXT NOT NULL,
    "command" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "message" TEXT,
    "data" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ec25_command_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ec25_modems_imei_key" ON "public"."ec25_modems"("imei");

-- CreateIndex
CREATE INDEX "ec25_network_data_modemId_createdAt_idx" ON "public"."ec25_network_data"("modemId", "createdAt");

-- CreateIndex
CREATE INDEX "ec25_gps_data_modemId_createdAt_idx" ON "public"."ec25_gps_data"("modemId", "createdAt");

-- CreateIndex
CREATE INDEX "ec25_gps_data_latitude_longitude_idx" ON "public"."ec25_gps_data"("latitude", "longitude");

-- CreateIndex
CREATE UNIQUE INDEX "ec25_service_health_serviceId_key" ON "public"."ec25_service_health"("serviceId");

-- CreateIndex
CREATE INDEX "ec25_service_logs_serviceId_createdAt_idx" ON "public"."ec25_service_logs"("serviceId", "createdAt");

-- CreateIndex
CREATE INDEX "ec25_alerts_resolved_createdAt_idx" ON "public"."ec25_alerts"("resolved", "createdAt");

-- CreateIndex
CREATE INDEX "ec25_alerts_severity_createdAt_idx" ON "public"."ec25_alerts"("severity", "createdAt");

-- CreateIndex
CREATE INDEX "ec25_command_logs_command_createdAt_idx" ON "public"."ec25_command_logs"("command", "createdAt");

-- AddForeignKey
ALTER TABLE "public"."ec25_network_data" ADD CONSTRAINT "ec25_network_data_modemId_fkey" FOREIGN KEY ("modemId") REFERENCES "public"."ec25_modems"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ec25_gps_data" ADD CONSTRAINT "ec25_gps_data_modemId_fkey" FOREIGN KEY ("modemId") REFERENCES "public"."ec25_modems"("id") ON DELETE CASCADE ON UPDATE CASCADE;
