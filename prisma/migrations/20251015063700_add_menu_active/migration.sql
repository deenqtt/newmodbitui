-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_menu_groups" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "icon" TEXT,
    "order" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDeveloper" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_menu_groups" ("createdAt", "icon", "id", "isDeveloper", "label", "name", "order", "updatedAt") SELECT "createdAt", "icon", "id", "isDeveloper", "label", "name", "order", "updatedAt" FROM "menu_groups";
DROP TABLE "menu_groups";
ALTER TABLE "new_menu_groups" RENAME TO "menu_groups";
CREATE UNIQUE INDEX "menu_groups_name_key" ON "menu_groups"("name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
