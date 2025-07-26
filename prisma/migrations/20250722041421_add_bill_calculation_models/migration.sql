-- CreateTable
CREATE TABLE "BillConfiguration" (
    "id" TEXT NOT NULL,
    "customName" TEXT NOT NULL,
    "sourceDeviceId" TEXT NOT NULL,
    "sourceDeviceKey" TEXT NOT NULL,
    "publishTargetDeviceId" TEXT NOT NULL,
    "rupiahRatePerKwh" DOUBLE PRECISION NOT NULL DEFAULT 1467,
    "dollarRatePerKwh" DOUBLE PRECISION NOT NULL DEFAULT 0.1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillLog" (
    "id" TEXT NOT NULL,
    "configId" TEXT NOT NULL,
    "rawValue" DOUBLE PRECISION NOT NULL,
    "rupiahCost" DOUBLE PRECISION NOT NULL,
    "dollarCost" DOUBLE PRECISION NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BillLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BillConfiguration_customName_key" ON "BillConfiguration"("customName");

-- CreateIndex
CREATE UNIQUE INDEX "BillConfiguration_publishTargetDeviceId_key" ON "BillConfiguration"("publishTargetDeviceId");

-- AddForeignKey
ALTER TABLE "BillConfiguration" ADD CONSTRAINT "BillConfiguration_sourceDeviceId_fkey" FOREIGN KEY ("sourceDeviceId") REFERENCES "DeviceExternal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillConfiguration" ADD CONSTRAINT "BillConfiguration_publishTargetDeviceId_fkey" FOREIGN KEY ("publishTargetDeviceId") REFERENCES "DeviceExternal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillLog" ADD CONSTRAINT "BillLog_configId_fkey" FOREIGN KEY ("configId") REFERENCES "BillConfiguration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
