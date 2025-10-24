const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Pre-configured alarm configurations menggunakan device external yang baru
const ALARM_CONFIGS_DATA = [
  // pH Sensor Alarms - PH Sensor 1
  {
    id: "ph-sensor-1-critical-high",
    customName: "PH Critical High [PH Sensor 1]",
    alarmType: "CRITICAL",
    keyType: "THRESHOLD",
    key: "ph",
    deviceUniqId: "limbah-ph1",
    minValue: null,
    maxValue: 12.0,
    maxOnly: true
  },
  {
    id: "ph-sensor-1-critical-low",
    customName: "PH Critical Low [PH Sensor 1]",
    alarmType: "CRITICAL",
    keyType: "THRESHOLD",
    key: "ph",
    deviceUniqId: "limbah-ph1",
    minValue: 2.0,
    maxValue: null,
    maxOnly: false
  },
  {
    id: "ph-sensor-1-major-high",
    customName: "PH Major High [PH Sensor 1]",
    alarmType: "MAJOR",
    keyType: "THRESHOLD",
    key: "ph",
    deviceUniqId: "limbah-ph1",
    minValue: null,
    maxValue: 10.5,
    maxOnly: true
  },

  // pH Sensor Alarms - PH Sensor 2
  {
    id: "ph-sensor-2-critical-high",
    customName: "PH Critical High [PH Sensor 2]",
    alarmType: "CRITICAL",
    keyType: "THRESHOLD",
    key: "ph",
    deviceUniqId: "limbah-ph2",
    minValue: null,
    maxValue: 12.0,
    maxOnly: true
  },
  {
    id: "ph-sensor-2-major-low",
    customName: "PH Major Low [PH Sensor 2]",
    alarmType: "MAJOR",
    keyType: "THRESHOLD",
    key: "ph",
    deviceUniqId: "limbah-ph2",
    minValue: 3.0,
    maxValue: null,
    maxOnly: false
  },

  // pH Sensor Alarms - PH Sensor 3
  {
    id: "ph-sensor-3-critical-high",
    customName: "PH Critical High [PH Sensor 3]",
    alarmType: "CRITICAL",
    keyType: "THRESHOLD",
    key: "ph",
    deviceUniqId: "limbah-ph3",
    minValue: null,
    maxValue: 12.0,
    maxOnly: true
  },
  {
    id: "ph-sensor-3-minor-low",
    customName: "PH Minor Low [PH Sensor 3]",
    alarmType: "MINOR",
    keyType: "THRESHOLD",
    key: "ph",
    deviceUniqId: "limbah-ph3",
    minValue: 4.0,
    maxValue: null,
    maxOnly: false
  },

  // Temperature Alarms - PH Sensor 1
  {
    id: "temp-sensor-1-critical-high",
    customName: "Temperature Critical High [PH Sensor 1]",
    alarmType: "CRITICAL",
    keyType: "THRESHOLD",
    key: "temp",
    deviceUniqId: "limbah-ph1",
    minValue: null,
    maxValue: 60.0,
    maxOnly: true
  },
  {
    id: "temp-sensor-1-major-high",
    customName: "Temperature Major High [PH Sensor 1]",
    alarmType: "MAJOR",
    keyType: "THRESHOLD",
    key: "temp",
    deviceUniqId: "limbah-ph1",
    minValue: null,
    maxValue: 50.0,
    maxOnly: true
  },

  // Temperature Alarms - PH Sensor 2
  {
    id: "temp-sensor-2-critical-low",
    customName: "Temperature Critical Low [PH Sensor 2]",
    alarmType: "CRITICAL",
    keyType: "THRESHOLD",
    key: "temp",
    deviceUniqId: "limbah-ph2",
    minValue: 5.0,
    maxValue: null,
    maxOnly: false
  },
  {
    id: "temp-sensor-2-major-high",
    customName: "Temperature Major High [PH Sensor 2]",
    alarmType: "MAJOR",
    keyType: "THRESHOLD",
    key: "temp",
    deviceUniqId: "limbah-ph2",
    minValue: null,
    maxValue: 55.0,
    maxOnly: true
  },

  // Temperature Alarms - PH Sensor 3
  {
    id: "temp-sensor-3-major-high",
    customName: "Temperature Major High [PH Sensor 3]",
    alarmType: "MAJOR",
    keyType: "THRESHOLD",
    key: "temp",
    deviceUniqId: "limbah-ph3",
    minValue: null,
    maxValue: 55.0,
    maxOnly: true
  },

  // Flow Rate Alarms - Water Flow 1
  {
    id: "flow-rate-1-critical-low",
    customName: "Flow Rate Critical Low [Water Flow Meter 1]",
    alarmType: "CRITICAL",
    keyType: "THRESHOLD",
    key: "flow_rate",
    deviceUniqId: "limbah-flow1",
    minValue: null,
    maxValue: 0.5,
    maxOnly: true
  },
  {
    id: "flow-rate-1-major-high",
    customName: "Flow Rate Major High [Water Flow Meter 1]",
    alarmType: "MAJOR",
    keyType: "THRESHOLD",
    key: "flow_rate",
    deviceUniqId: "limbah-flow1",
    minValue: null,
    maxValue: 25.0,
    maxOnly: true
  },

  // Flow Rate Alarms - Water Flow 2
  {
    id: "flow-rate-2-critical-no-flow",
    customName: "Flow Rate Critical No Flow [Water Flow Meter 2]",
    alarmType: "CRITICAL",
    keyType: "THRESHOLD",
    key: "flow_rate",
    deviceUniqId: "limbah-flow2",
    minValue: null,
    maxValue: 0.5,
    maxOnly: true
  },
  {
    id: "flow-rate-2-major-low",
    customName: "Flow Rate Major Low [Water Flow Meter 2]",
    alarmType: "MAJOR",
    keyType: "THRESHOLD",
    key: "flow_rate",
    deviceUniqId: "limbah-flow2",
    minValue: 2.0,
    maxValue: null,
    maxOnly: false
  },
  {
    id: "flow-rate-2-minor-high",
    customName: "Flow Rate Minor High [Water Flow Meter 2]",
    alarmType: "MINOR",
    keyType: "THRESHOLD",
    key: "flow_rate",
    deviceUniqId: "limbah-flow2",
    minValue: null,
    maxValue: 18.0,
    maxOnly: true
  },

  // Air Quality Alarms - SPS30 Sensor 1
  {
    id: "air-quality-1-pm25-critical",
    customName: "PM2.5 Critical High [Air Quality 1]",
    alarmType: "CRITICAL",
    keyType: "THRESHOLD",
    key: "pm2_5",
    deviceUniqId: "limbah-airquality1-sps30",
    minValue: null,
    maxValue: 100.0,
    maxOnly: true
  },
  {
    id: "air-quality-1-pm10-major",
    customName: "PM10 Major High [Air Quality 1]",
    alarmType: "MAJOR",
    keyType: "THRESHOLD",
    key: "pm10_0",
    deviceUniqId: "limbah-airquality1-sps30",
    minValue: null,
    maxValue: 150.0,
    maxOnly: true
  },

  // Air Quality Alarms - SPS30 Sensor 2
  {
    id: "air-quality-2-pm25-major",
    customName: "PM2.5 Major High [Air Quality 2]",
    alarmType: "MAJOR",
    keyType: "THRESHOLD",
    key: "pm2_5",
    deviceUniqId: "limbah-airquality2-sps30",
    minValue: null,
    maxValue: 75.0,
    maxOnly: true
  },
  {
    id: "air-quality-2-pm10-critical",
    customName: "PM10 Critical High [Air Quality 2]",
    alarmType: "CRITICAL",
    keyType: "THRESHOLD",
    key: "pm10_0",
    deviceUniqId: "limbah-airquality2-sps30",
    minValue: null,
    maxValue: 200.0,
    maxOnly: true
  }
];

// Dummy alarm logs data menggunakan alarm config yang baru
const ALARM_LOGS_DATA = [
  {
    id: "ph-sensor-1-high-001",
    status: "CLEARED",
    triggeringValue: "13.2",
    timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    clearedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    alarmConfigId: "ph-sensor-1-critical-high"
  },
  {
    id: "temp-sensor-2-high-001",
    status: "ACTIVE",
    triggeringValue: "58.7",
    timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
    clearedAt: null,
    alarmConfigId: "temp-sensor-2-major-high"
  },
  {
    id: "flow-rate-1-low-001",
    status: "CLEARED",
    triggeringValue: "0.3",
    timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
    clearedAt: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
    alarmConfigId: "flow-rate-1-critical-low"
  },
  {
    id: "ph-sensor-2-high-002",
    status: "CLEARED",
    triggeringValue: "11.8",
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    clearedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    alarmConfigId: "ph-sensor-2-critical-high"
  },
  {
    id: "flow-rate-2-no-flow-001",
    status: "ACKNOWLEDGED",
    triggeringValue: "0.1",
    timestamp: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
    clearedAt: null,
    alarmConfigId: "flow-rate-2-critical-no-flow"
  },
  {
    id: "temp-sensor-1-low-001",
    status: "CLEARED",
    triggeringValue: "25.3",
    timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
    clearedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), // 4 days ago
    alarmConfigId: "temp-sensor-2-critical-low"
  },
  {
    id: "air-quality-1-pm25-001",
    status: "ACTIVE",
    triggeringValue: "85.6",
    timestamp: new Date(Date.now() - 45 * 60 * 1000), // 45 minutes ago
    clearedAt: null,
    alarmConfigId: "air-quality-1-pm25-critical"
  },
  {
    id: "ph-sensor-3-low-001",
    status: "CLEARED",
    triggeringValue: "3.8",
    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    clearedAt: new Date(Date.now() - 18 * 60 * 60 * 1000), // 18 hours ago
    alarmConfigId: "ph-sensor-3-minor-low"
  },
  {
    id: "flow-rate-2-high-001",
    status: "ACTIVE",
    triggeringValue: "19.2",
    timestamp: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
    clearedAt: null,
    alarmConfigId: "flow-rate-2-minor-high"
  },
  {
    id: "air-quality-2-pm25-001",
    status: "CLEARED",
    triggeringValue: "65.4",
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    clearedAt: new Date(Date.now() - 1.5 * 60 * 60 * 1000), // 1.5 hours ago
    alarmConfigId: "air-quality-2-pm25-major"
  }
];

/**
 * Seed alarm configurations menggunakan transactional approach
 */
async function seedAlarmConfigs() {
  console.log('🚨 Seeding alarm configurations...');
  console.log(`📦 Processing ${ALARM_CONFIGS_DATA.length} alarm configurations...\n`);

  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  const errors = [];

  try {
    // Gunakan transaksi untuk memastikan semua atau tidak sama sekali
    await prisma.$transaction(async (tx) => {
      for (const configData of ALARM_CONFIGS_DATA) {
        try {
          console.log(`🔍 Processing: ${configData.customName}`);

          // Verify device exists before creating alarm config
          const device = await tx.deviceExternal.findUnique({
            where: { uniqId: configData.deviceUniqId }
          });

          if (!device) {
            console.log(`   ⚠️  Device not found: ${configData.deviceUniqId}, skipping...`);
            skippedCount++;
            continue;
          }

          // Cek apakah alarm config sudah ada berdasarkan id atau deviceUniqId + key + alarmType
          const existingById = await tx.alarmConfiguration.findUnique({
            where: { id: configData.id }
          });

          const existingByDeviceKey = await tx.alarmConfiguration.findFirst({
            where: {
              deviceUniqId: configData.deviceUniqId,
              key: configData.key,
              alarmType: configData.alarmType
            }
          });

          if (existingById) {
            // Update alarm config yang sudah ada
            await tx.alarmConfiguration.update({
              where: { id: configData.id },
              data: {
                customName: configData.customName,
                keyType: configData.keyType,
                minValue: configData.minValue,
                maxValue: configData.maxValue,
                maxOnly: configData.maxOnly,
                updatedAt: new Date()
              }
            });
            updatedCount++;
            console.log(`   📝 Updated: ${configData.customName}`);

          } else if (existingByDeviceKey) {
            // Update jika ada yang sama tapi id berbeda
            await tx.alarmConfiguration.update({
              where: { id: existingByDeviceKey.id },
              data: {
                customName: configData.customName,
                keyType: configData.keyType,
                minValue: configData.minValue,
                maxValue: configData.maxValue,
                maxOnly: configData.maxOnly,
                updatedAt: new Date()
              }
            });
            updatedCount++;
            console.log(`   📝 Updated existing: ${configData.customName}`);

          } else {
            // Buat alarm config baru
            await tx.alarmConfiguration.create({
              data: {
                id: configData.id,
                customName: configData.customName,
                alarmType: configData.alarmType,
                keyType: configData.keyType,
                key: configData.key,
                deviceUniqId: configData.deviceUniqId,
                minValue: configData.minValue,
                maxValue: configData.maxValue,
                maxOnly: configData.maxOnly
              }
            });
            createdCount++;
            console.log(`   ➕ Created: ${configData.customName}`);
          }

        } catch (configError) {
          console.error(`   ❌ Error processing ${configData.customName}:`, configError.message);
          errors.push(`${configData.customName}: ${configError.message}`);
          skippedCount++;
        }
      }
    });

    console.log('\n📊 Alarm configurations seeding summary:');
    console.log(`   ✅ Created: ${createdCount} configurations`);
    console.log(`   📝 Updated: ${updatedCount} configurations`);
    console.log(`   ❌ Skipped: ${skippedCount} configurations`);

    if (errors.length > 0) {
      console.log('\n⚠️  Errors encountered:');
      errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }

    console.log('\n🎯 Alarm configurations summary:');
    const criticalCount = ALARM_CONFIGS_DATA.filter(c => c.alarmType === 'CRITICAL').length;
    const majorCount = ALARM_CONFIGS_DATA.filter(c => c.alarmType === 'MAJOR').length;
    const minorCount = ALARM_CONFIGS_DATA.filter(c => c.alarmType === 'MINOR').length;
    const thresholdCount = ALARM_CONFIGS_DATA.filter(c => c.keyType === 'THRESHOLD').length;
    const bitValueCount = ALARM_CONFIGS_DATA.filter(c => c.keyType === 'BIT_VALUE').length;

    console.log(`   🚨 Critical Alarms: ${criticalCount} configurations`);
    console.log(`   ⚠️  Major Alarms: ${majorCount} configurations`);
    console.log(`   ℹ️  Minor Alarms: ${minorCount} configurations`);
    console.log(`   📏 Threshold-based: ${thresholdCount} configurations`);
    console.log(`   🔢 Bit Value-based: ${bitValueCount} configurations`);

    console.log('\n📋 Device associations:');
    const devices = [...new Set(ALARM_CONFIGS_DATA.map(c => c.deviceUniqId))];
    for (const deviceId of devices) {
      const configs = ALARM_CONFIGS_DATA.filter(c => c.deviceUniqId === deviceId);
      const deviceData = ALARM_CONFIGS_DATA.find(c => c.deviceUniqId === deviceId);
      console.log(`   • ${deviceData.customName.split('[')[1]?.replace(']', '') || deviceId}: ${configs.length} alarm configs`);
    }

  } catch (error) {
    console.error('❌ Alarm configurations seeding failed:', error);
    throw error;
  }
}

/**
 * Seed alarm logs menggunakan transactional approach
 */
async function seedAlarmLogs() {
  console.log('📋 Seeding alarm logs...');
  console.log(`📦 Processing ${ALARM_LOGS_DATA.length} alarm logs...\n`);

  let createdCount = 0;
  let skippedCount = 0;
  const errors = [];

  try {
    // Gunakan transaksi untuk memastikan semua atau tidak sama sekali
    await prisma.$transaction(async (tx) => {
      for (const logData of ALARM_LOGS_DATA) {
        try {
          // Verify alarm config exists before creating alarm log
          const alarmConfig = await tx.alarmConfiguration.findUnique({
            where: { id: logData.alarmConfigId }
          });

          if (!alarmConfig) {
            console.log(`   ⚠️  Alarm config not found: ${logData.alarmConfigId}, skipping log...`);
            skippedCount++;
            continue;
          }

          // Cek apakah alarm log sudah ada berdasarkan id
          const existingLog = await tx.alarmLog.findUnique({
            where: { id: logData.id }
          });

          if (!existingLog) {
            // Buat alarm log baru
            await tx.alarmLog.create({
              data: logData
            });
            createdCount++;
            console.log(`   ➕ Created log: ${logData.id} (${logData.status})`);
          } else {
            console.log(`   ⏭️  Log already exists: ${logData.id}`);
            skippedCount++;
          }

        } catch (logError) {
          console.error(`   ❌ Error processing log ${logData.id}:`, logError.message);
          errors.push(`${logData.id}: ${logError.message}`);
          skippedCount++;
        }
      }
    });

    console.log('\n📊 Alarm logs seeding summary:');
    console.log(`   ✅ Created: ${createdCount} logs`);
    console.log(`   ⏭️  Skipped: ${skippedCount} logs`);

    if (errors.length > 0) {
      console.log('\n⚠️  Errors encountered:');
      errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }

    console.log('\n📋 Alarm log status distribution:');
    const activeCount = ALARM_LOGS_DATA.filter(l => l.status === 'ACTIVE').length;
    const acknowledgedCount = ALARM_LOGS_DATA.filter(l => l.status === 'ACKNOWLEDGED').length;
    const clearedCount = ALARM_LOGS_DATA.filter(l => l.status === 'CLEARED').length;

    console.log(`   🔴 Active: ${activeCount} alarms`);
    console.log(`   🟡 Acknowledged: ${acknowledgedCount} alarms`);
    console.log(`   🟢 Cleared: ${clearedCount} alarms`);

  } catch (error) {
    console.error('❌ Alarm logs seeding failed:', error);
    throw error;
  }
}

/**
 * Main seeding function
 */
async function seedAlarmConfigsAndLogs() {
  await seedAlarmConfigs();
  await seedAlarmLogs();
}

/**
 * Verify alarm configurations dan logs setelah seeding
 */
async function verifyAlarmConfigsAndLogs() {
  console.log('\n🔍 Verifying seeded alarm configurations and logs...');

  try {
    const configs = await prisma.alarmConfiguration.findMany({
      include: {
        device: {
          select: {
            name: true,
            topic: true
          }
        },
        _count: {
          select: {
            logs: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const logs = await prisma.alarmLog.findMany({
      include: {
        alarmConfig: {
          select: {
            customName: true,
            key: true,
            device: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: { timestamp: 'desc' },
      take: 10
    });

    console.log(`\n📋 Total alarm configurations: ${configs.length}`);
    console.log(`📋 Total alarm logs: ${logs.length}`);

    console.log('\n🚨 Recent alarm configurations:');
    configs.slice(0, 5).forEach((config, index) => {
      console.log(`   ${index + 1}. ${config.customName}`);
      console.log(`      Type: ${config.alarmType} (${config.keyType})`);
      console.log(`      Device: ${config.device?.name || 'Unknown'}`);
      console.log(`      Key: ${config.key}`);
      console.log(`      Threshold: ${config.minValue || '*'} - ${config.maxValue || '*'}`);
      console.log(`      Logs: ${config._count.logs}`);
    });

    console.log('\n📋 Recent alarm logs:');
    logs.forEach((log, index) => {
      const timeAgo = Math.floor((Date.now() - log.timestamp.getTime()) / (1000 * 60 * 60));
      const statusIcon = log.status === 'ACTIVE' ? '🔴' : log.status === 'ACKNOWLEDGED' ? '🟡' : '🟢';
      console.log(`   ${index + 1}. ${statusIcon} ${log.alarmConfig.customName} - ${log.triggeringValue} (${timeAgo}h ago)`);
    });

  } catch (error) {
    console.error('❌ Alarm configurations and logs verification failed:', error);
  }
}

module.exports = {
  seedAlarmConfigs,
  seedAlarmLogs,
  seedAlarmConfigsAndLogs,
  default: seedAlarmConfigsAndLogs,
  ALARM_CONFIGS_DATA,
  ALARM_LOGS_DATA
};

// Export for compatibility with seed-init.js
async function seedAlarmConfigsExport() {
  return seedAlarmConfigsAndLogs();
}

if (require.main === module) {
  seedAlarmConfigsAndLogs()
    .then(async () => {
      await verifyAlarmConfigsAndLogs();
      console.log('\n✅ Alarm configurations and logs seeding completed successfully!');
      console.log('🚀 Alarms are ready for dashboard visualization and monitoring.');
    })
    .catch((error) => {
      console.error('\n❌ Alarm seeding failed:', error);
      process.exit(1);
    })
    .finally(() => {
      prisma.$disconnect();
    });
}
