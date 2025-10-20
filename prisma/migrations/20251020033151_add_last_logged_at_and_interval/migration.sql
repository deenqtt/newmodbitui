/*
  Warnings:

  - You are about to drop the `ec25_alerts` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ec25_command_logs` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ec25_gps_data` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ec25_modems` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ec25_network_data` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ec25_service_health` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ec25_service_logs` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropIndex
DROP INDEX "ec25_alerts_severity_createdAt_idx";

-- DropIndex
DROP INDEX "ec25_alerts_resolved_createdAt_idx";

-- DropIndex
DROP INDEX "ec25_command_logs_command_createdAt_idx";

-- DropIndex
DROP INDEX "ec25_gps_data_latitude_longitude_idx";

-- DropIndex
DROP INDEX "ec25_gps_data_modemId_createdAt_idx";

-- DropIndex
DROP INDEX "ec25_modems_imei_key";

-- DropIndex
DROP INDEX "ec25_network_data_modemId_createdAt_idx";

-- DropIndex
DROP INDEX "ec25_service_health_serviceId_key";

-- DropIndex
DROP INDEX "ec25_service_logs_serviceId_createdAt_idx";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "ec25_alerts";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "ec25_command_logs";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "ec25_gps_data";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "ec25_modems";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "ec25_network_data";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "ec25_service_health";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "ec25_service_logs";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "ThermalData" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "deviceId" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "minTemp" REAL,
    "maxTemp" REAL,
    "avgTemp" REAL,
    "frameCount" INTEGER,
    CONSTRAINT "ThermalData_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "DeviceExternal" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "NodeLocationMqttPayload" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "locationId" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "receivedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "messageId" TEXT,
    CONSTRAINT "NodeLocationMqttPayload_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "NodeTenantLocation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_LoggingConfiguration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customName" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "units" TEXT,
    "multiply" REAL DEFAULT 1,
    "deviceUniqId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "lastLoggedAt" DATETIME,
    "loggingIntervalMinutes" INTEGER NOT NULL DEFAULT 10,
    CONSTRAINT "LoggingConfiguration_deviceUniqId_fkey" FOREIGN KEY ("deviceUniqId") REFERENCES "DeviceExternal" ("uniqId") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_LoggingConfiguration" ("createdAt", "customName", "deviceUniqId", "id", "key", "multiply", "units", "updatedAt") SELECT "createdAt", "customName", "deviceUniqId", "id", "key", "multiply", "units", "updatedAt" FROM "LoggingConfiguration";
DROP TABLE "LoggingConfiguration";
ALTER TABLE "new_LoggingConfiguration" RENAME TO "LoggingConfiguration";
CREATE UNIQUE INDEX "LoggingConfiguration_deviceUniqId_key_key" ON "LoggingConfiguration"("deviceUniqId", "key");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "ThermalData_deviceId_timestamp_idx" ON "ThermalData"("deviceId", "timestamp");

-- CreateIndex
CREATE INDEX "NodeLocationMqttPayload_locationId_receivedAt_idx" ON "NodeLocationMqttPayload"("locationId", "receivedAt");

-- CreateIndex
CREATE INDEX "NodeLocationMqttPayload_topic_idx" ON "NodeLocationMqttPayload"("topic");
