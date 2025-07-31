-- CreateTable
CREATE TABLE "EnergyTarget" (
    "id" TEXT NOT NULL,
    "loggingConfigId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "monthlyTargets" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnergyTarget_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EnergyTarget_loggingConfigId_key" ON "EnergyTarget"("loggingConfigId");

-- CreateIndex
CREATE UNIQUE INDEX "EnergyTarget_loggingConfigId_year_key" ON "EnergyTarget"("loggingConfigId", "year");
