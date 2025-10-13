-- CreateTable
CREATE TABLE "Rack" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "capacityU" INTEGER NOT NULL DEFAULT 42,
    "location" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "DeviceInternal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "deviceType" TEXT NOT NULL,
    "manufacturer" TEXT,
    "modelId" TEXT,
    "firmware" TEXT,
    "rackId" TEXT,
    "positionU" INTEGER,
    "sizeU" INTEGER NOT NULL DEFAULT 1,
    "powerWatt" INTEGER,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'offline',
    "ipAddress" TEXT,
    "lastSeen" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DeviceInternal_rackId_fkey" FOREIGN KEY ("rackId") REFERENCES "Rack" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Rack_name_key" ON "Rack"("name");

-- CreateIndex
CREATE UNIQUE INDEX "DeviceInternal_rackId_positionU_key" ON "DeviceInternal"("rackId", "positionU");
