-- CreateTable
CREATE TABLE "public"."Ec25Modem" (
    "id" TEXT NOT NULL,
    "imei" TEXT NOT NULL,
    "manufacturer" TEXT,
    "model" TEXT,
    "revision" TEXT,
    "lastSeen" TIMESTAMP(3),

    CONSTRAINT "Ec25Modem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Ec25NetworkData" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "operator" TEXT,
    "registrationStatus" TEXT,
    "networkType" TEXT,
    "signalStrength" INTEGER,
    "signalQuality" INTEGER,
    "modemId" TEXT NOT NULL,

    CONSTRAINT "Ec25NetworkData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Ec25GpsData" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fixStatus" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "altitude" DOUBLE PRECISION,
    "speed" DOUBLE PRECISION,
    "satellites" INTEGER,
    "modemId" TEXT NOT NULL,

    CONSTRAINT "Ec25GpsData_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Ec25Modem_imei_key" ON "public"."Ec25Modem"("imei");

-- AddForeignKey
ALTER TABLE "public"."Ec25NetworkData" ADD CONSTRAINT "Ec25NetworkData_modemId_fkey" FOREIGN KEY ("modemId") REFERENCES "public"."Ec25Modem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Ec25GpsData" ADD CONSTRAINT "Ec25GpsData_modemId_fkey" FOREIGN KEY ("modemId") REFERENCES "public"."Ec25Modem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
