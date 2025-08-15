-- CreateTable
CREATE TABLE "AccessController" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'offline',
    "lockCount" INTEGER NOT NULL DEFAULT 0,
    "firmware" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccessController_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AccessController_ipAddress_key" ON "AccessController"("ipAddress");
