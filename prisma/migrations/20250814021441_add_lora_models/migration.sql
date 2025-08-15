-- CreateTable
CREATE TABLE "public"."LoraDevice" (
    "id" TEXT NOT NULL,
    "devEui" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lastSeen" TIMESTAMP(3),

    CONSTRAINT "LoraDevice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DeviceData" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deviceId" TEXT NOT NULL,
    "data" JSONB NOT NULL,

    CONSTRAINT "DeviceData_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LoraDevice_devEui_key" ON "public"."LoraDevice"("devEui");

-- AddForeignKey
ALTER TABLE "public"."DeviceData" ADD CONSTRAINT "DeviceData_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "public"."LoraDevice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
