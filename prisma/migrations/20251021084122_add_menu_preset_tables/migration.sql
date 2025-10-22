-- CreateTable
CREATE TABLE "MenuPreset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT DEFAULT 'Menu',
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "MenuPresetGroup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "presetId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    CONSTRAINT "MenuPresetGroup_presetId_fkey" FOREIGN KEY ("presetId") REFERENCES "MenuPreset" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MenuPresetItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "presetId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    CONSTRAINT "MenuPresetItem_presetId_fkey" FOREIGN KEY ("presetId") REFERENCES "MenuPreset" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "MenuPreset_name_key" ON "MenuPreset"("name");

-- CreateIndex
CREATE UNIQUE INDEX "MenuPresetGroup_presetId_groupId_key" ON "MenuPresetGroup"("presetId", "groupId");

-- CreateIndex
CREATE UNIQUE INDEX "MenuPresetItem_presetId_itemId_key" ON "MenuPresetItem"("presetId", "itemId");
