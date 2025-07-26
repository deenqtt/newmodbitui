-- CreateTable
CREATE TABLE "PueConfiguration" (
    "id" TEXT NOT NULL,
    "customName" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'pue',
    "apiTopicUniqId" TEXT,
    "pduList" JSONB,
    "mainPower" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PueConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PueConfiguration_customName_key" ON "PueConfiguration"("customName");

-- CreateIndex
CREATE UNIQUE INDEX "PueConfiguration_apiTopicUniqId_key" ON "PueConfiguration"("apiTopicUniqId");

-- AddForeignKey
ALTER TABLE "PueConfiguration" ADD CONSTRAINT "PueConfiguration_apiTopicUniqId_fkey" FOREIGN KEY ("apiTopicUniqId") REFERENCES "DeviceExternal"("uniqId") ON DELETE SET NULL ON UPDATE CASCADE;
