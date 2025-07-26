-- CreateTable
CREATE TABLE "DeviceExternal" (
    "id" TEXT NOT NULL,
    "uniqId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeviceExternal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DeviceExternal_uniqId_key" ON "DeviceExternal"("uniqId");

-- CreateIndex
CREATE UNIQUE INDEX "DeviceExternal_topic_key" ON "DeviceExternal"("topic");
