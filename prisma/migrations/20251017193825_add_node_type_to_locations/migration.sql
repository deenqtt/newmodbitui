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
    "status" TEXT NOT NULL DEFAULT 'active',
    "nodeType" TEXT NOT NULL DEFAULT 'node',
    "tenantId" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "NodeTenantLocation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_NodeTenantLocation" ("createdAt", "description", "id", "isActive", "latitude", "longitude", "name", "status", "tenantId", "topic", "updatedAt", "url") SELECT "createdAt", "description", "id", "isActive", "latitude", "longitude", "name", "status", "tenantId", "topic", "updatedAt", "url" FROM "NodeTenantLocation";
DROP TABLE "NodeTenantLocation";
ALTER TABLE "new_NodeTenantLocation" RENAME TO "NodeTenantLocation";
CREATE UNIQUE INDEX "NodeTenantLocation_name_key" ON "NodeTenantLocation"("name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
