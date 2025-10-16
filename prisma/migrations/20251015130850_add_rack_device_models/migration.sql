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
CREATE TABLE "DeviceInRack" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "rackId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "deviceName" TEXT NOT NULL,
    "positionU" INTEGER NOT NULL,
    "sizeU" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DeviceInRack_rackId_fkey" FOREIGN KEY ("rackId") REFERENCES "Rack" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "DeviceInRack_rackId_positionU_idx" ON "DeviceInRack"("rackId", "positionU");

-- CreateIndex
CREATE UNIQUE INDEX "DeviceInRack_rackId_positionU_key" ON "DeviceInRack"("rackId", "positionU");
