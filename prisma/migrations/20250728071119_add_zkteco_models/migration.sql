-- CreateEnum
CREATE TYPE "ZkTecoDeviceStatus" AS ENUM ('CONNECTED', 'DISCONNECTED', 'CONNECTING', 'ERROR');

-- CreateTable
CREATE TABLE "ZkTecoDevice" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "port" INTEGER NOT NULL,
    "status" "ZkTecoDeviceStatus" NOT NULL DEFAULT 'DISCONNECTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ZkTecoDevice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ZkTecoUser" (
    "id" TEXT NOT NULL,
    "uid" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT,
    "card" TEXT,
    "fingerprints" JSONB,
    "zkTecoDeviceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ZkTecoUser_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ZkTecoDevice_name_key" ON "ZkTecoDevice"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ZkTecoUser_zkTecoDeviceId_uid_key" ON "ZkTecoUser"("zkTecoDeviceId", "uid");

-- AddForeignKey
ALTER TABLE "ZkTecoUser" ADD CONSTRAINT "ZkTecoUser_zkTecoDeviceId_fkey" FOREIGN KEY ("zkTecoDeviceId") REFERENCES "ZkTecoDevice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
