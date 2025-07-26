-- CreateTable
CREATE TABLE "PowerAnalyzerConfiguration" (
    "id" TEXT NOT NULL,
    "customName" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'powerAnalyzer',
    "apiTopicUniqId" TEXT,
    "listSensors" JSONB,
    "chartConfig" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PowerAnalyzerConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PowerAnalyzerLog" (
    "id" TEXT NOT NULL,
    "configId" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PowerAnalyzerLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PowerAnalyzerConfiguration_customName_key" ON "PowerAnalyzerConfiguration"("customName");

-- CreateIndex
CREATE UNIQUE INDEX "PowerAnalyzerConfiguration_apiTopicUniqId_key" ON "PowerAnalyzerConfiguration"("apiTopicUniqId");

-- AddForeignKey
ALTER TABLE "PowerAnalyzerConfiguration" ADD CONSTRAINT "PowerAnalyzerConfiguration_apiTopicUniqId_fkey" FOREIGN KEY ("apiTopicUniqId") REFERENCES "DeviceExternal"("uniqId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PowerAnalyzerLog" ADD CONSTRAINT "PowerAnalyzerLog_configId_fkey" FOREIGN KEY ("configId") REFERENCES "PowerAnalyzerConfiguration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
