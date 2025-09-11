-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "fingerprintId" TEXT,
    "cardUid" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "phoneNumber" TEXT
);

-- CreateTable
CREATE TABLE "ZigbeeDevice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "deviceId" TEXT NOT NULL,
    "friendlyName" TEXT NOT NULL,
    "deviceType" TEXT NOT NULL,
    "manufacturer" TEXT,
    "modelId" TEXT,
    "capabilities" JSONB NOT NULL,
    "lastSeen" DATETIME,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "currentState" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Maintenance" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "startTask" DATETIME NOT NULL,
    "endTask" DATETIME NOT NULL,
    "assignTo" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Scheduled',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "Maintenance_assignTo_fkey" FOREIGN KEY ("assignTo") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Maintenance_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "DeviceExternal" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DeviceExternal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "uniqId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "address" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "lastPayload" TEXT,
    "lastUpdatedByMqtt" DATETIME
);

-- CreateTable
CREATE TABLE "LoggingConfiguration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customName" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "units" TEXT,
    "multiply" REAL DEFAULT 1,
    "deviceUniqId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LoggingConfiguration_deviceUniqId_fkey" FOREIGN KEY ("deviceUniqId") REFERENCES "DeviceExternal" ("uniqId") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LoggedData" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "configId" TEXT NOT NULL,
    "value" REAL NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LoggedData_configId_fkey" FOREIGN KEY ("configId") REFERENCES "LoggingConfiguration" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BillConfiguration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customName" TEXT NOT NULL,
    "sourceDeviceKey" TEXT NOT NULL,
    "rupiahRatePerKwh" REAL NOT NULL DEFAULT 1467,
    "dollarRatePerKwh" REAL NOT NULL DEFAULT 0.1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "publishTargetDeviceUniqId" TEXT NOT NULL,
    "sourceDeviceUniqId" TEXT NOT NULL,
    CONSTRAINT "BillConfiguration_publishTargetDeviceUniqId_fkey" FOREIGN KEY ("publishTargetDeviceUniqId") REFERENCES "DeviceExternal" ("uniqId") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "BillConfiguration_sourceDeviceUniqId_fkey" FOREIGN KEY ("sourceDeviceUniqId") REFERENCES "DeviceExternal" ("uniqId") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BillLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "configId" TEXT NOT NULL,
    "rawValue" REAL NOT NULL,
    "rupiahCost" REAL NOT NULL,
    "dollarCost" REAL NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BillLog_configId_fkey" FOREIGN KEY ("configId") REFERENCES "BillConfiguration" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PueConfiguration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customName" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'pue',
    "apiTopicUniqId" TEXT,
    "pduList" TEXT,
    "mainPower" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PueConfiguration_apiTopicUniqId_fkey" FOREIGN KEY ("apiTopicUniqId") REFERENCES "DeviceExternal" ("uniqId") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PowerAnalyzerConfiguration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customName" TEXT NOT NULL,
    "apiTopicUniqId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "mainPower" TEXT,
    "pduList" TEXT,
    CONSTRAINT "PowerAnalyzerConfiguration_apiTopicUniqId_fkey" FOREIGN KEY ("apiTopicUniqId") REFERENCES "DeviceExternal" ("uniqId") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MenuConfiguration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "structure" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AlarmConfiguration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customName" TEXT NOT NULL,
    "alarmType" TEXT NOT NULL,
    "keyType" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "deviceUniqId" TEXT NOT NULL,
    "minValue" REAL,
    "maxValue" REAL,
    "maxOnly" BOOLEAN DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AlarmConfiguration_deviceUniqId_fkey" FOREIGN KEY ("deviceUniqId") REFERENCES "DeviceExternal" ("uniqId") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AlarmBitConfiguration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "alarmConfigId" TEXT NOT NULL,
    "bitPosition" INTEGER NOT NULL,
    "customName" TEXT NOT NULL,
    "alertToWhatsApp" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "AlarmBitConfiguration_alarmConfigId_fkey" FOREIGN KEY ("alarmConfigId") REFERENCES "AlarmConfiguration" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AlarmLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL,
    "triggeringValue" TEXT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clearedAt" DATETIME,
    "alarmConfigId" TEXT NOT NULL,
    CONSTRAINT "AlarmLog_alarmConfigId_fkey" FOREIGN KEY ("alarmConfigId") REFERENCES "AlarmConfiguration" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ZkTecoDevice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "port" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DISCONNECTED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "topicIdentifier" TEXT
);

-- CreateTable
CREATE TABLE "ZkTecoUser" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "uid" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT,
    "card" TEXT,
    "fingerprints" TEXT,
    "zkTecoDeviceId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ZkTecoUser_zkTecoDeviceId_fkey" FOREIGN KEY ("zkTecoDeviceId") REFERENCES "ZkTecoDevice" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Cctv" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "port" INTEGER NOT NULL,
    "channel" TEXT,
    "username" TEXT,
    "password" TEXT,
    "resolution" TEXT DEFAULT '640x480',
    "framerate" INTEGER DEFAULT 15,
    "bitrate" INTEGER DEFAULT 1024,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "group" TEXT,
    "apiKey" TEXT
);

-- CreateTable
CREATE TABLE "DashboardLayout" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "layout" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "inUse" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN DEFAULT true,
    CONSTRAINT "DashboardLayout_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EnergyTarget" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "loggingConfigId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "monthlyTargets" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AccessController" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'offline',
    "lockCount" INTEGER NOT NULL DEFAULT 0,
    "firmware" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "doorStatus" TEXT,
    "lockAddresses" TEXT,
    "lastSeen" DATETIME,
    "macAddress" TEXT,
    "freeHeap" INTEGER,
    "logFileSize" INTEGER,
    "spiffsTotal" INTEGER,
    "spiffsUsed" INTEGER,
    "totalHeap" INTEGER,
    "uptime" TEXT
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "controllerId" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL,
    "message" TEXT NOT NULL,
    "details" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ActivityLog_controllerId_fkey" FOREIGN KEY ("controllerId") REFERENCES "AccessController" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LoraDevice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "devEui" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lastSeen" DATETIME
);

-- CreateTable
CREATE TABLE "DeviceData" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deviceId" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    CONSTRAINT "DeviceData_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "LoraDevice" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LoraGateway" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gatewayId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "lastSeen" DATETIME,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "GatewayStats" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gatewayId" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL,
    "rfPacketsReceived" INTEGER NOT NULL DEFAULT 0,
    "rfPacketsOk" INTEGER NOT NULL DEFAULT 0,
    "rfPacketsBad" INTEGER NOT NULL DEFAULT 0,
    "rfPacketsNocrc" INTEGER NOT NULL DEFAULT 0,
    "rfPacketsForwarded" INTEGER NOT NULL DEFAULT 0,
    "upstreamPayloadBytes" INTEGER NOT NULL DEFAULT 0,
    "upstreamDatagramsSent" INTEGER NOT NULL DEFAULT 0,
    "upstreamNetworkBytes" INTEGER NOT NULL DEFAULT 0,
    "upstreamAckRatio" REAL NOT NULL DEFAULT 0,
    "crcOkRatio" REAL NOT NULL DEFAULT 0,
    "crcFailRatio" REAL NOT NULL DEFAULT 0,
    "noCrcRatio" REAL NOT NULL DEFAULT 0,
    "pullDataSent" INTEGER NOT NULL DEFAULT 0,
    "pullAckReceived" INTEGER NOT NULL DEFAULT 0,
    "downstreamDatagramsReceived" INTEGER NOT NULL DEFAULT 0,
    "downstreamNetworkBytes" INTEGER NOT NULL DEFAULT 0,
    "downstreamPayloadBytes" INTEGER NOT NULL DEFAULT 0,
    "txOk" INTEGER NOT NULL DEFAULT 0,
    "txErrors" INTEGER NOT NULL DEFAULT 0,
    "downstreamAckRatio" REAL NOT NULL DEFAULT 0,
    "counterInst" TEXT NOT NULL DEFAULT '0',
    "counterPps" TEXT NOT NULL DEFAULT '0',
    "beaconQueued" INTEGER NOT NULL DEFAULT 0,
    "beaconSent" INTEGER NOT NULL DEFAULT 0,
    "beaconRejected" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GatewayStats_gatewayId_fkey" FOREIGN KEY ("gatewayId") REFERENCES "LoraGateway" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_fingerprintId_key" ON "User"("fingerprintId");

-- CreateIndex
CREATE UNIQUE INDEX "User_cardUid_key" ON "User"("cardUid");

-- CreateIndex
CREATE UNIQUE INDEX "ZigbeeDevice_deviceId_key" ON "ZigbeeDevice"("deviceId");

-- CreateIndex
CREATE UNIQUE INDEX "DeviceExternal_uniqId_key" ON "DeviceExternal"("uniqId");

-- CreateIndex
CREATE UNIQUE INDEX "DeviceExternal_topic_key" ON "DeviceExternal"("topic");

-- CreateIndex
CREATE UNIQUE INDEX "LoggingConfiguration_deviceUniqId_key_key" ON "LoggingConfiguration"("deviceUniqId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "BillConfiguration_customName_key" ON "BillConfiguration"("customName");

-- CreateIndex
CREATE UNIQUE INDEX "BillConfiguration_publishTargetDeviceUniqId_key" ON "BillConfiguration"("publishTargetDeviceUniqId");

-- CreateIndex
CREATE UNIQUE INDEX "PueConfiguration_customName_key" ON "PueConfiguration"("customName");

-- CreateIndex
CREATE UNIQUE INDEX "PueConfiguration_apiTopicUniqId_key" ON "PueConfiguration"("apiTopicUniqId");

-- CreateIndex
CREATE UNIQUE INDEX "PowerAnalyzerConfiguration_customName_key" ON "PowerAnalyzerConfiguration"("customName");

-- CreateIndex
CREATE UNIQUE INDEX "PowerAnalyzerConfiguration_apiTopicUniqId_key" ON "PowerAnalyzerConfiguration"("apiTopicUniqId");

-- CreateIndex
CREATE UNIQUE INDEX "ZkTecoDevice_name_key" ON "ZkTecoDevice"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ZkTecoDevice_topicIdentifier_key" ON "ZkTecoDevice"("topicIdentifier");

-- CreateIndex
CREATE UNIQUE INDEX "ZkTecoUser_zkTecoDeviceId_uid_key" ON "ZkTecoUser"("zkTecoDeviceId", "uid");

-- CreateIndex
CREATE UNIQUE INDEX "DashboardLayout_userId_name_key" ON "DashboardLayout"("userId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "EnergyTarget_loggingConfigId_key" ON "EnergyTarget"("loggingConfigId");

-- CreateIndex
CREATE UNIQUE INDEX "EnergyTarget_loggingConfigId_year_key" ON "EnergyTarget"("loggingConfigId", "year");

-- CreateIndex
CREATE UNIQUE INDEX "AccessController_ipAddress_key" ON "AccessController"("ipAddress");

-- CreateIndex
CREATE UNIQUE INDEX "AccessController_macAddress_key" ON "AccessController"("macAddress");

-- CreateIndex
CREATE UNIQUE INDEX "LoraDevice_devEui_key" ON "LoraDevice"("devEui");

-- CreateIndex
CREATE UNIQUE INDEX "LoraGateway_gatewayId_key" ON "LoraGateway"("gatewayId");
