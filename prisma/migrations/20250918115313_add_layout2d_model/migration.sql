-- CreateTable
CREATE TABLE "Layout2D" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "isUse" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Maintenance" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "startTask" DATETIME NOT NULL,
    "endTask" DATETIME NOT NULL,
    "assignTo" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Scheduled',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deviceTargetId" TEXT,
    CONSTRAINT "Maintenance_assignTo_fkey" FOREIGN KEY ("assignTo") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Maintenance_deviceTargetId_fkey" FOREIGN KEY ("deviceTargetId") REFERENCES "DeviceExternal" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Maintenance" ("assignTo", "createdAt", "description", "endTask", "id", "isActive", "name", "startTask", "status", "targetId", "targetType", "updatedAt") SELECT "assignTo", "createdAt", "description", "endTask", "id", "isActive", "name", "startTask", "status", "targetId", "targetType", "updatedAt" FROM "Maintenance";
DROP TABLE "Maintenance";
ALTER TABLE "new_Maintenance" RENAME TO "Maintenance";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Layout2D_name_key" ON "Layout2D"("name");
