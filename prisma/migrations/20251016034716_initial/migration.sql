-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "fingerprintId" TEXT,
    "cardUid" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "phoneNumber" TEXT,
    CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "resource" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "MenuGroup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "icon" TEXT,
    "order" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDeveloper" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "MenuItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "menuGroupId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "icon" TEXT,
    "order" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDeveloper" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MenuItem_menuGroupId_fkey" FOREIGN KEY ("menuGroupId") REFERENCES "MenuGroup" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RoleMenuPermission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roleId" TEXT NOT NULL,
    "menuItemId" TEXT NOT NULL,
    "canView" BOOLEAN NOT NULL DEFAULT true,
    "canCreate" BOOLEAN NOT NULL DEFAULT false,
    "canUpdate" BOOLEAN NOT NULL DEFAULT false,
    "canDelete" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RoleMenuPermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RoleMenuPermission_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
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
    "deviceTargetId" TEXT,
    CONSTRAINT "Maintenance_assignTo_fkey" FOREIGN KEY ("assignTo") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Maintenance_deviceTargetId_fkey" FOREIGN KEY ("deviceTargetId") REFERENCES "DeviceExternal" ("id") ON DELETE SET NULL ON UPDATE CASCADE
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
    "lastPayload" JSONB,
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
    "pduList" JSONB,
    "mainPower" JSONB,
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
    "mainPower" JSONB,
    "pduList" JSONB,
    CONSTRAINT "PowerAnalyzerConfiguration_apiTopicUniqId_fkey" FOREIGN KEY ("apiTopicUniqId") REFERENCES "DeviceExternal" ("uniqId") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MenuConfiguration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "structure" JSONB NOT NULL,
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
CREATE TABLE "zigbee_devices" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "zigbee_device_id" TEXT NOT NULL,
    "friendlyName" TEXT,
    "description" TEXT,
    "deviceType" TEXT,
    "manufacturer" TEXT,
    "model" TEXT,
    "status" TEXT NOT NULL DEFAULT 'unknown',
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "lastSeen" DATETIME,
    "capabilities" JSONB,
    "currentState" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
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
    "fingerprints" JSONB,
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
    "layout" JSONB NOT NULL,
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
    "monthlyTargets" JSONB NOT NULL,
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
    "data" JSONB NOT NULL,
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

-- CreateTable
CREATE TABLE "ec25_modems" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "imei" TEXT NOT NULL,
    "manufacturer" TEXT,
    "model" TEXT,
    "revision" TEXT,
    "connected" BOOLEAN NOT NULL DEFAULT false,
    "lastSeen" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currentOperator" TEXT,
    "currentRegistrationStatus" TEXT,
    "currentNetworkType" TEXT,
    "currentSignalStrength" INTEGER,
    "currentSignalQuality" INTEGER,
    "currentRsrp" REAL,
    "currentRsrq" REAL,
    "currentSinr" REAL,
    "currentCellId" TEXT,
    "currentLatitude" REAL,
    "currentLongitude" REAL,
    "currentAltitude" REAL,
    "currentSpeed" REAL,
    "currentSatellites" INTEGER,
    "currentGpsFixStatus" TEXT,
    "configApn" TEXT,
    "configUsername" TEXT,
    "configPin" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ec25_network_data" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "modemId" TEXT NOT NULL,
    "operator" TEXT,
    "registrationStatus" TEXT,
    "networkType" TEXT,
    "signalStrength" INTEGER,
    "signalQuality" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ec25_network_data_modemId_fkey" FOREIGN KEY ("modemId") REFERENCES "ec25_modems" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ec25_gps_data" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "modemId" TEXT NOT NULL,
    "fixStatus" TEXT,
    "latitude" REAL,
    "longitude" REAL,
    "altitude" REAL,
    "speed" REAL,
    "satellites" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ec25_gps_data_modemId_fkey" FOREIGN KEY ("modemId") REFERENCES "ec25_modems" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ec25_service_health" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serviceId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "lastSeen" DATETIME NOT NULL,
    "lastHeartbeat" DATETIME,
    "uptime" REAL,
    "memoryUsage" TEXT,
    "data" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ec25_service_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serviceId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "uptime" REAL,
    "data" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ec25_alerts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "requiresAction" BOOLEAN NOT NULL DEFAULT false,
    "details" TEXT,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" DATETIME,
    "resolvedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ec25_command_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "command" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "message" TEXT,
    "data" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Layout2D" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "isUse" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Layout2DDataPoint" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "layoutId" TEXT NOT NULL,
    "deviceUniqId" TEXT NOT NULL,
    "selectedKey" TEXT,
    "selectedKeys" TEXT,
    "units" TEXT,
    "multiply" REAL DEFAULT 1,
    "customName" TEXT NOT NULL,
    "positionX" REAL NOT NULL,
    "positionY" REAL NOT NULL,
    "fontSize" INTEGER DEFAULT 14,
    "color" TEXT DEFAULT '#000000',
    "iconName" TEXT,
    "iconColor" TEXT DEFAULT '#666666',
    "showIcon" BOOLEAN DEFAULT false,
    "displayLayout" TEXT DEFAULT 'vertical',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Layout2DDataPoint_layoutId_fkey" FOREIGN KEY ("layoutId") REFERENCES "Layout2D" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Layout2DDataPoint_deviceUniqId_fkey" FOREIGN KEY ("deviceUniqId") REFERENCES "DeviceExternal" ("uniqId") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Layout2DFlowIndicator" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "layoutId" TEXT NOT NULL,
    "deviceUniqId" TEXT NOT NULL,
    "selectedKey" TEXT NOT NULL,
    "customName" TEXT NOT NULL,
    "positionX" REAL NOT NULL,
    "positionY" REAL NOT NULL,
    "arrowDirection" TEXT NOT NULL DEFAULT 'right',
    "logicOperator" TEXT NOT NULL,
    "compareValue" TEXT NOT NULL,
    "valueType" TEXT NOT NULL DEFAULT 'number',
    "trueColor" TEXT NOT NULL DEFAULT '#22c55e',
    "trueAnimation" BOOLEAN NOT NULL DEFAULT true,
    "falseColor" TEXT NOT NULL DEFAULT '#ef4444',
    "falseAnimation" BOOLEAN NOT NULL DEFAULT false,
    "warningColor" TEXT NOT NULL DEFAULT '#f59e0b',
    "warningAnimation" BOOLEAN NOT NULL DEFAULT true,
    "warningEnabled" BOOLEAN NOT NULL DEFAULT false,
    "warningOperator" TEXT,
    "warningValue" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Layout2DFlowIndicator_layoutId_fkey" FOREIGN KEY ("layoutId") REFERENCES "Layout2D" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Layout2DFlowIndicator_deviceUniqId_fkey" FOREIGN KEY ("deviceUniqId") REFERENCES "DeviceExternal" ("uniqId") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_RolePermissions" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_RolePermissions_A_fkey" FOREIGN KEY ("A") REFERENCES "Permission" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_RolePermissions_B_fkey" FOREIGN KEY ("B") REFERENCES "Role" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_fingerprintId_key" ON "User"("fingerprintId");

-- CreateIndex
CREATE UNIQUE INDEX "User_cardUid_key" ON "User"("cardUid");

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_name_key" ON "Permission"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_resource_action_key" ON "Permission"("resource", "action");

-- CreateIndex
CREATE UNIQUE INDEX "MenuGroup_name_key" ON "MenuGroup"("name");

-- CreateIndex
CREATE UNIQUE INDEX "MenuItem_name_key" ON "MenuItem"("name");

-- CreateIndex
CREATE UNIQUE INDEX "RoleMenuPermission_roleId_menuItemId_key" ON "RoleMenuPermission"("roleId", "menuItemId");

-- CreateIndex
CREATE UNIQUE INDEX "RolePermission_roleId_permissionId_key" ON "RolePermission"("roleId", "permissionId");

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
CREATE UNIQUE INDEX "zigbee_devices_zigbee_device_id_key" ON "zigbee_devices"("zigbee_device_id");

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

-- CreateIndex
CREATE UNIQUE INDEX "ec25_modems_imei_key" ON "ec25_modems"("imei");

-- CreateIndex
CREATE INDEX "ec25_network_data_modemId_createdAt_idx" ON "ec25_network_data"("modemId", "createdAt");

-- CreateIndex
CREATE INDEX "ec25_gps_data_modemId_createdAt_idx" ON "ec25_gps_data"("modemId", "createdAt");

-- CreateIndex
CREATE INDEX "ec25_gps_data_latitude_longitude_idx" ON "ec25_gps_data"("latitude", "longitude");

-- CreateIndex
CREATE UNIQUE INDEX "ec25_service_health_serviceId_key" ON "ec25_service_health"("serviceId");

-- CreateIndex
CREATE INDEX "ec25_service_logs_serviceId_createdAt_idx" ON "ec25_service_logs"("serviceId", "createdAt");

-- CreateIndex
CREATE INDEX "ec25_alerts_resolved_createdAt_idx" ON "ec25_alerts"("resolved", "createdAt");

-- CreateIndex
CREATE INDEX "ec25_alerts_severity_createdAt_idx" ON "ec25_alerts"("severity", "createdAt");

-- CreateIndex
CREATE INDEX "ec25_command_logs_command_createdAt_idx" ON "ec25_command_logs"("command", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Layout2D_name_key" ON "Layout2D"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Layout2DDataPoint_layoutId_deviceUniqId_customName_key" ON "Layout2DDataPoint"("layoutId", "deviceUniqId", "customName");

-- CreateIndex
CREATE UNIQUE INDEX "Layout2DFlowIndicator_layoutId_deviceUniqId_selectedKey_positionX_positionY_key" ON "Layout2DFlowIndicator"("layoutId", "deviceUniqId", "selectedKey", "positionX", "positionY");

-- CreateIndex
CREATE UNIQUE INDEX "_RolePermissions_AB_unique" ON "_RolePermissions"("A", "B");

-- CreateIndex
CREATE INDEX "_RolePermissions_B_index" ON "_RolePermissions"("B");
