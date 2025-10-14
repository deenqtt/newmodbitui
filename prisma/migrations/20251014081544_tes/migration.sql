/*
  Warnings:

  - You are about to drop the `DeviceInternal` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Layout2D` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Layout2DDataPoint` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Layout2DFlowIndicator` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `MenuGroup` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `MenuItem` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Permission` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Rack` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Role` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RoleMenuPermission` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RolePermission` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ThermalData` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ZigbeeDevice` table. If the table is not empty, all the data it contains will be lost.
  - You are about to alter the column `layout` on the `DashboardLayout` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.
  - You are about to alter the column `data` on the `DeviceData` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.
  - You are about to alter the column `lastPayload` on the `DeviceExternal` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.
  - You are about to alter the column `monthlyTargets` on the `EnergyTarget` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.
  - You are about to alter the column `mainPower` on the `PowerAnalyzerConfiguration` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.
  - You are about to alter the column `pduList` on the `PowerAnalyzerConfiguration` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.
  - You are about to alter the column `mainPower` on the `PueConfiguration` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.
  - You are about to alter the column `pduList` on the `PueConfiguration` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.
  - You are about to alter the column `fingerprints` on the `ZkTecoUser` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.
  - Made the column `roleId` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "DeviceInternal_rackId_positionU_key";

-- DropIndex
DROP INDEX "Layout2D_name_key";

-- DropIndex
DROP INDEX "Layout2DDataPoint_layoutId_deviceUniqId_customName_key";

-- DropIndex
DROP INDEX "Layout2DFlowIndicator_layoutId_deviceUniqId_selectedKey_positionX_positionY_key";

-- DropIndex
DROP INDEX "MenuGroup_name_key";

-- DropIndex
DROP INDEX "MenuItem_name_key";

-- DropIndex
DROP INDEX "Permission_name_key";

-- DropIndex
DROP INDEX "Rack_name_key";

-- DropIndex
DROP INDEX "Role_name_key";

-- DropIndex
DROP INDEX "RoleMenuPermission_roleId_menuItemId_key";

-- DropIndex
DROP INDEX "RolePermission_roleId_permissionId_key";

-- DropIndex
DROP INDEX "ThermalData_deviceId_timestamp_idx";

-- DropIndex
DROP INDEX "ZigbeeDevice_deviceId_key";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "DeviceInternal";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Layout2D";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Layout2DDataPoint";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Layout2DFlowIndicator";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "MenuGroup";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "MenuItem";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Permission";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Rack";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Role";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "RoleMenuPermission";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "RolePermission";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "ThermalData";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "ZigbeeDevice";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "resource" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "menu_groups" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "icon" TEXT,
    "order" INTEGER NOT NULL,
    "isDeveloper" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "menu_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "menuGroupId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "icon" TEXT,
    "order" INTEGER NOT NULL,
    "isDeveloper" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "menu_items_menuGroupId_fkey" FOREIGN KEY ("menuGroupId") REFERENCES "menu_groups" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "role_menu_permissions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roleId" TEXT NOT NULL,
    "menuItemId" TEXT NOT NULL,
    "canView" BOOLEAN NOT NULL DEFAULT true,
    "canCreate" BOOLEAN NOT NULL DEFAULT false,
    "canUpdate" BOOLEAN NOT NULL DEFAULT false,
    "canDelete" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "role_menu_permissions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "role_menu_permissions_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "menu_items" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "role_permissions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "role_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "permissions" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MenuConfiguration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "structure" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ec25_modems" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "imei" TEXT NOT NULL,
    "manufacturer" TEXT,
    "model" TEXT,
    "revision" TEXT,
    "connected" BOOLEAN NOT NULL DEFAULT false,
    "lastSeen" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currentOperator" TEXT,
    "currentRegistrationStatus" TEXT,
    "currentNetworkType" TEXT,
    "currentSignalStrength" INTEGER,
    "currentSignalQuality" INTEGER,
    "currentRsrp" REAL,
    "currentRsrq" REAL,
    "currentSinr" REAL,
    "currentCellId" TEXT,
    "currentLatitude" REAL,
    "currentLongitude" REAL,
    "currentAltitude" REAL,
    "currentSpeed" REAL,
    "currentSatellites" INTEGER,
    "currentGpsFixStatus" TEXT,
    "configApn" TEXT,
    "configUsername" TEXT,
    "configPin" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ec25_network_data" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "modemId" TEXT NOT NULL,
    "operator" TEXT,
    "registrationStatus" TEXT,
    "networkType" TEXT,
    "signalStrength" INTEGER,
    "signalQuality" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ec25_network_data_modemId_fkey" FOREIGN KEY ("modemId") REFERENCES "ec25_modems" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ec25_gps_data" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "modemId" TEXT NOT NULL,
    "fixStatus" TEXT,
    "latitude" REAL,
    "longitude" REAL,
    "altitude" REAL,
    "speed" REAL,
    "satellites" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ec25_gps_data_modemId_fkey" FOREIGN KEY ("modemId") REFERENCES "ec25_modems" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ec25_service_health" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serviceId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "lastSeen" DATETIME NOT NULL,
    "lastHeartbeat" DATETIME,
    "uptime" REAL,
    "memoryUsage" TEXT,
    "data" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ec25_service_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serviceId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "uptime" REAL,
    "data" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ec25_alerts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "requiresAction" BOOLEAN NOT NULL DEFAULT false,
    "details" TEXT,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" DATETIME,
    "resolvedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ec25_command_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "command" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "message" TEXT,
    "data" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "_RolePermissions" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_RolePermissions_A_fkey" FOREIGN KEY ("A") REFERENCES "permissions" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_RolePermissions_B_fkey" FOREIGN KEY ("B") REFERENCES "roles" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_DashboardLayout" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "layout" JSONB NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "inUse" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN DEFAULT true,
    CONSTRAINT "DashboardLayout_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_DashboardLayout" ("createdAt", "id", "inUse", "isActive", "layout", "name", "updatedAt", "userId") SELECT "createdAt", "id", "inUse", "isActive", "layout", "name", "updatedAt", "userId" FROM "DashboardLayout";
DROP TABLE "DashboardLayout";
ALTER TABLE "new_DashboardLayout" RENAME TO "DashboardLayout";
CREATE UNIQUE INDEX "DashboardLayout_userId_name_key" ON "DashboardLayout"("userId", "name");
CREATE TABLE "new_DeviceData" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deviceId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    CONSTRAINT "DeviceData_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "LoraDevice" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_DeviceData" ("data", "deviceId", "id", "timestamp") SELECT "data", "deviceId", "id", "timestamp" FROM "DeviceData";
DROP TABLE "DeviceData";
ALTER TABLE "new_DeviceData" RENAME TO "DeviceData";
CREATE TABLE "new_DeviceExternal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "uniqId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "address" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "lastPayload" JSONB,
    "lastUpdatedByMqtt" DATETIME
);
INSERT INTO "new_DeviceExternal" ("address", "createdAt", "id", "lastPayload", "lastUpdatedByMqtt", "name", "topic", "uniqId", "updatedAt") SELECT "address", "createdAt", "id", "lastPayload", "lastUpdatedByMqtt", "name", "topic", "uniqId", "updatedAt" FROM "DeviceExternal";
DROP TABLE "DeviceExternal";
ALTER TABLE "new_DeviceExternal" RENAME TO "DeviceExternal";
CREATE UNIQUE INDEX "DeviceExternal_uniqId_key" ON "DeviceExternal"("uniqId");
CREATE UNIQUE INDEX "DeviceExternal_topic_key" ON "DeviceExternal"("topic");
CREATE TABLE "new_EnergyTarget" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "loggingConfigId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "monthlyTargets" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_EnergyTarget" ("createdAt", "id", "loggingConfigId", "monthlyTargets", "updatedAt", "year") SELECT "createdAt", "id", "loggingConfigId", "monthlyTargets", "updatedAt", "year" FROM "EnergyTarget";
DROP TABLE "EnergyTarget";
ALTER TABLE "new_EnergyTarget" RENAME TO "EnergyTarget";
CREATE UNIQUE INDEX "EnergyTarget_loggingConfigId_key" ON "EnergyTarget"("loggingConfigId");
CREATE UNIQUE INDEX "EnergyTarget_loggingConfigId_year_key" ON "EnergyTarget"("loggingConfigId", "year");
CREATE TABLE "new_PowerAnalyzerConfiguration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customName" TEXT NOT NULL,
    "apiTopicUniqId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "mainPower" JSONB,
    "pduList" JSONB,
    CONSTRAINT "PowerAnalyzerConfiguration_apiTopicUniqId_fkey" FOREIGN KEY ("apiTopicUniqId") REFERENCES "DeviceExternal" ("uniqId") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_PowerAnalyzerConfiguration" ("apiTopicUniqId", "createdAt", "customName", "id", "mainPower", "pduList", "updatedAt") SELECT "apiTopicUniqId", "createdAt", "customName", "id", "mainPower", "pduList", "updatedAt" FROM "PowerAnalyzerConfiguration";
DROP TABLE "PowerAnalyzerConfiguration";
ALTER TABLE "new_PowerAnalyzerConfiguration" RENAME TO "PowerAnalyzerConfiguration";
CREATE UNIQUE INDEX "PowerAnalyzerConfiguration_customName_key" ON "PowerAnalyzerConfiguration"("customName");
CREATE UNIQUE INDEX "PowerAnalyzerConfiguration_apiTopicUniqId_key" ON "PowerAnalyzerConfiguration"("apiTopicUniqId");
CREATE TABLE "new_PueConfiguration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customName" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'pue',
    "apiTopicUniqId" TEXT,
    "pduList" JSONB,
    "mainPower" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PueConfiguration_apiTopicUniqId_fkey" FOREIGN KEY ("apiTopicUniqId") REFERENCES "DeviceExternal" ("uniqId") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_PueConfiguration" ("apiTopicUniqId", "createdAt", "customName", "id", "mainPower", "pduList", "type", "updatedAt") SELECT "apiTopicUniqId", "createdAt", "customName", "id", "mainPower", "pduList", "type", "updatedAt" FROM "PueConfiguration";
DROP TABLE "PueConfiguration";
ALTER TABLE "new_PueConfiguration" RENAME TO "PueConfiguration";
CREATE UNIQUE INDEX "PueConfiguration_customName_key" ON "PueConfiguration"("customName");
CREATE UNIQUE INDEX "PueConfiguration_apiTopicUniqId_key" ON "PueConfiguration"("apiTopicUniqId");
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "fingerprintId" TEXT,
    "cardUid" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "phoneNumber" TEXT,
    CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_User" ("cardUid", "createdAt", "email", "fingerprintId", "id", "password", "phoneNumber", "roleId", "updatedAt") SELECT "cardUid", "createdAt", "email", "fingerprintId", "id", "password", "phoneNumber", "roleId", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_fingerprintId_key" ON "User"("fingerprintId");
CREATE UNIQUE INDEX "User_cardUid_key" ON "User"("cardUid");
CREATE TABLE "new_ZkTecoUser" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "uid" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT,
    "card" TEXT,
    "fingerprints" JSONB,
    "zkTecoDeviceId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ZkTecoUser_zkTecoDeviceId_fkey" FOREIGN KEY ("zkTecoDeviceId") REFERENCES "ZkTecoDevice" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ZkTecoUser" ("card", "createdAt", "fingerprints", "id", "name", "password", "uid", "updatedAt", "zkTecoDeviceId") SELECT "card", "createdAt", "fingerprints", "id", "name", "password", "uid", "updatedAt", "zkTecoDeviceId" FROM "ZkTecoUser";
DROP TABLE "ZkTecoUser";
ALTER TABLE "new_ZkTecoUser" RENAME TO "ZkTecoUser";
CREATE UNIQUE INDEX "ZkTecoUser_zkTecoDeviceId_uid_key" ON "ZkTecoUser"("zkTecoDeviceId", "uid");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_name_key" ON "permissions"("name");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_resource_action_key" ON "permissions"("resource", "action");

-- CreateIndex
CREATE UNIQUE INDEX "menu_groups_name_key" ON "menu_groups"("name");

-- CreateIndex
CREATE UNIQUE INDEX "menu_items_name_key" ON "menu_items"("name");

-- CreateIndex
CREATE UNIQUE INDEX "role_menu_permissions_roleId_menuItemId_key" ON "role_menu_permissions"("roleId", "menuItemId");

-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_roleId_permissionId_key" ON "role_permissions"("roleId", "permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "ec25_modems_imei_key" ON "ec25_modems"("imei");

-- CreateIndex
CREATE INDEX "ec25_network_data_modemId_createdAt_idx" ON "ec25_network_data"("modemId", "createdAt");

-- CreateIndex
CREATE INDEX "ec25_gps_data_modemId_createdAt_idx" ON "ec25_gps_data"("modemId", "createdAt");

-- CreateIndex
CREATE INDEX "ec25_gps_data_latitude_longitude_idx" ON "ec25_gps_data"("latitude", "longitude");

-- CreateIndex
CREATE UNIQUE INDEX "ec25_service_health_serviceId_key" ON "ec25_service_health"("serviceId");

-- CreateIndex
CREATE INDEX "ec25_service_logs_serviceId_createdAt_idx" ON "ec25_service_logs"("serviceId", "createdAt");

-- CreateIndex
CREATE INDEX "ec25_alerts_resolved_createdAt_idx" ON "ec25_alerts"("resolved", "createdAt");

-- CreateIndex
CREATE INDEX "ec25_alerts_severity_createdAt_idx" ON "ec25_alerts"("severity", "createdAt");

-- CreateIndex
CREATE INDEX "ec25_command_logs_command_createdAt_idx" ON "ec25_command_logs"("command", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "_RolePermissions_AB_unique" ON "_RolePermissions"("A", "B");

-- CreateIndex
CREATE INDEX "_RolePermissions_B_index" ON "_RolePermissions"("B");
