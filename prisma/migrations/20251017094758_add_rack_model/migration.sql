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

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_DeviceExternal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "uniqId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "address" TEXT,
    "rackId" TEXT,
    "positionU" INTEGER DEFAULT 0,
    "sizeU" INTEGER DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "lastPayload" JSONB,
    "lastUpdatedByMqtt" DATETIME,
    CONSTRAINT "DeviceExternal_rackId_fkey" FOREIGN KEY ("rackId") REFERENCES "Rack" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_DeviceExternal" ("address", "createdAt", "id", "lastPayload", "lastUpdatedByMqtt", "name", "topic", "uniqId", "updatedAt") SELECT "address", "createdAt", "id", "lastPayload", "lastUpdatedByMqtt", "name", "topic", "uniqId", "updatedAt" FROM "DeviceExternal";
DROP TABLE "DeviceExternal";
ALTER TABLE "new_DeviceExternal" RENAME TO "DeviceExternal";
CREATE UNIQUE INDEX "DeviceExternal_uniqId_key" ON "DeviceExternal"("uniqId");
CREATE UNIQUE INDEX "DeviceExternal_topic_key" ON "DeviceExternal"("topic");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Rack_name_key" ON "Rack"("name");
