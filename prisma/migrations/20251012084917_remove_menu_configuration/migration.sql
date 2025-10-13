/*
  Warnings:

  - You are about to drop the `MenuConfiguration` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "MenuConfiguration";
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
CREATE TABLE "Layout2DDataPoint" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "layoutId" TEXT NOT NULL,
    "deviceUniqId" TEXT NOT NULL,
    "selectedKey" TEXT,
    "selectedKeys" TEXT,
    "units" TEXT,
    "multiply" REAL DEFAULT 1,
    "customName" TEXT NOT NULL,
    "positionX" REAL NOT NULL,
    "positionY" REAL NOT NULL,
    "fontSize" INTEGER DEFAULT 14,
    "color" TEXT DEFAULT '#000000',
    "iconName" TEXT,
    "iconColor" TEXT DEFAULT '#666666',
    "showIcon" BOOLEAN DEFAULT false,
    "displayLayout" TEXT DEFAULT 'vertical',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Layout2DDataPoint_layoutId_fkey" FOREIGN KEY ("layoutId") REFERENCES "Layout2D" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Layout2DDataPoint_deviceUniqId_fkey" FOREIGN KEY ("deviceUniqId") REFERENCES "DeviceExternal" ("uniqId") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Layout2DFlowIndicator" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "layoutId" TEXT NOT NULL,
    "deviceUniqId" TEXT NOT NULL,
    "selectedKey" TEXT NOT NULL,
    "customName" TEXT NOT NULL,
    "positionX" REAL NOT NULL,
    "positionY" REAL NOT NULL,
    "arrowDirection" TEXT NOT NULL DEFAULT 'right',
    "logicOperator" TEXT NOT NULL,
    "compareValue" TEXT NOT NULL,
    "valueType" TEXT NOT NULL DEFAULT 'number',
    "trueColor" TEXT NOT NULL DEFAULT '#22c55e',
    "trueAnimation" BOOLEAN NOT NULL DEFAULT true,
    "falseColor" TEXT NOT NULL DEFAULT '#ef4444',
    "falseAnimation" BOOLEAN NOT NULL DEFAULT false,
    "warningColor" TEXT NOT NULL DEFAULT '#f59e0b',
    "warningAnimation" BOOLEAN NOT NULL DEFAULT true,
    "warningEnabled" BOOLEAN NOT NULL DEFAULT false,
    "warningOperator" TEXT,
    "warningValue" TEXT,
    "multiLogicConfig" TEXT,
    "useMultiLogic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Layout2DFlowIndicator_layoutId_fkey" FOREIGN KEY ("layoutId") REFERENCES "Layout2D" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Layout2DFlowIndicator_deviceUniqId_fkey" FOREIGN KEY ("deviceUniqId") REFERENCES "DeviceExternal" ("uniqId") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ThermalData_deviceId_timestamp_idx" ON "ThermalData"("deviceId", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "Layout2DDataPoint_layoutId_deviceUniqId_customName_key" ON "Layout2DDataPoint"("layoutId", "deviceUniqId", "customName");

-- CreateIndex
CREATE UNIQUE INDEX "Layout2DFlowIndicator_layoutId_deviceUniqId_selectedKey_positionX_positionY_key" ON "Layout2DFlowIndicator"("layoutId", "deviceUniqId", "selectedKey", "positionX", "positionY");
