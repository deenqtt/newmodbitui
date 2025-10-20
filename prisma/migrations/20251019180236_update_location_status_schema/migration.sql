/*
  Warnings:

  - You are about to alter the column `status` on the `NodeTenantLocation` table. The data in that column could be lost. The data in that column will be cast from `String` to `Boolean`.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_NodeTenantLocation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "longitude" REAL NOT NULL,
    "latitude" REAL NOT NULL,
    "url" TEXT,
    "topic" TEXT,
    "description" TEXT,
    "status" BOOLEAN NOT NULL DEFAULT false,
    "nodeType" TEXT NOT NULL DEFAULT 'node',
    "tenantId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "NodeTenantLocation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_NodeTenantLocation" ("createdAt", "description", "id", "isActive", "latitude", "longitude", "name", "nodeType", "status", "tenantId", "topic", "updatedAt", "url") SELECT "createdAt", "description", "id", "isActive", "latitude", "longitude", "name", "nodeType", "status", "tenantId", "topic", "updatedAt", "url" FROM "NodeTenantLocation";
DROP TABLE "NodeTenantLocation";
ALTER TABLE "new_NodeTenantLocation" RENAME TO "NodeTenantLocation";
CREATE UNIQUE INDEX "NodeTenantLocation_name_key" ON "NodeTenantLocation"("name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
