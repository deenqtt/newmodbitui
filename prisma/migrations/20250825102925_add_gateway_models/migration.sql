-- CreateTable
CREATE TABLE "public"."LoraGateway" (
    "id" TEXT NOT NULL,
    "gatewayId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "lastSeen" TIMESTAMP(3),
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoraGateway_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."GatewayStats" (
    "id" TEXT NOT NULL,
    "gatewayId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "rfPacketsReceived" INTEGER NOT NULL DEFAULT 0,
    "rfPacketsOk" INTEGER NOT NULL DEFAULT 0,
    "rfPacketsBad" INTEGER NOT NULL DEFAULT 0,
    "rfPacketsNocrc" INTEGER NOT NULL DEFAULT 0,
    "rfPacketsForwarded" INTEGER NOT NULL DEFAULT 0,
    "upstreamPayloadBytes" INTEGER NOT NULL DEFAULT 0,
    "upstreamDatagramsSent" INTEGER NOT NULL DEFAULT 0,
    "upstreamNetworkBytes" INTEGER NOT NULL DEFAULT 0,
    "upstreamAckRatio" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "crcOkRatio" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "crcFailRatio" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "noCrcRatio" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pullDataSent" INTEGER NOT NULL DEFAULT 0,
    "pullAckReceived" INTEGER NOT NULL DEFAULT 0,
    "downstreamDatagramsReceived" INTEGER NOT NULL DEFAULT 0,
    "downstreamNetworkBytes" INTEGER NOT NULL DEFAULT 0,
    "downstreamPayloadBytes" INTEGER NOT NULL DEFAULT 0,
    "txOk" INTEGER NOT NULL DEFAULT 0,
    "txErrors" INTEGER NOT NULL DEFAULT 0,
    "downstreamAckRatio" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "counterInst" BIGINT NOT NULL DEFAULT 0,
    "counterPps" BIGINT NOT NULL DEFAULT 0,
    "beaconQueued" INTEGER NOT NULL DEFAULT 0,
    "beaconSent" INTEGER NOT NULL DEFAULT 0,
    "beaconRejected" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GatewayStats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LoraGateway_gatewayId_key" ON "public"."LoraGateway"("gatewayId");

-- AddForeignKey
ALTER TABLE "public"."GatewayStats" ADD CONSTRAINT "GatewayStats_gatewayId_fkey" FOREIGN KEY ("gatewayId") REFERENCES "public"."LoraGateway"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
