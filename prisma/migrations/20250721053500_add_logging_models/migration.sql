-- CreateTable
CREATE TABLE "LoggingConfiguration" (
    "id" TEXT NOT NULL,
    "customName" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "units" TEXT,
    "multiply" DOUBLE PRECISION DEFAULT 1,
    "deviceUniqId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoggingConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoggedData" (
    "id" TEXT NOT NULL,
    "configId" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoggedData_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LoggingConfiguration_deviceUniqId_key_key" ON "LoggingConfiguration"("deviceUniqId", "key");

-- AddForeignKey
ALTER TABLE "LoggingConfiguration" ADD CONSTRAINT "LoggingConfiguration_deviceUniqId_fkey" FOREIGN KEY ("deviceUniqId") REFERENCES "DeviceExternal"("uniqId") ON DELETE RESTRICT ON UPDATE CASCADE;
