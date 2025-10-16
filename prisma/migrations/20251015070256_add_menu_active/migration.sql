-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_menu_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "menuGroupId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "icon" TEXT,
    "order" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDeveloper" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "menu_items_menuGroupId_fkey" FOREIGN KEY ("menuGroupId") REFERENCES "menu_groups" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_menu_items" ("createdAt", "icon", "id", "isDeveloper", "label", "menuGroupId", "name", "order", "path", "updatedAt") SELECT "createdAt", "icon", "id", "isDeveloper", "label", "menuGroupId", "name", "order", "path", "updatedAt" FROM "menu_items";
DROP TABLE "menu_items";
ALTER TABLE "new_menu_items" RENAME TO "menu_items";
CREATE UNIQUE INDEX "menu_items_name_key" ON "menu_items"("name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
