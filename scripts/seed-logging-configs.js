// Pre-configured logging configurations dengan predictable IDs dari TASK.md
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const LOGGING_CONFIGS_DATA = [
  {
    "id": "cmh4blztz004dgvwy2dozhc3n",
    "customName": "Flow Rate [Water Flow Meter 1]",
    "key": "flow_rate",
    "units": "L/s",
    "multiply": 1,
    "deviceUniqId": "limbah-flow1",
    "createdAt": "2025-10-24T03:57:56.520Z",
    "updatedAt": "2025-10-24T09:44:57.139Z",
    "lastLoggedAt": null,
    "loggingIntervalMinutes": 15,
    "device": {
      "uniqId": "limbah-flow1",
      "name": "WATER FLOW 1",
      "topic": "limbah/flow1"
    }
  },
  {
    "id": "cmh4bmnjo004qgvwyrfk8dihb",
    "customName": "Flow Rate [Water Flow Meter 2]",
    "key": "flow_rate",
    "units": "L/s",
    "multiply": 1,
    "deviceUniqId": "limbah-flow2",
    "createdAt": "2025-10-24T03:58:27.252Z",
    "updatedAt": "2025-10-24T09:45:04.853Z",
    "lastLoggedAt": null,
    "loggingIntervalMinutes": 15,
    "device": {
      "uniqId": "limbah-flow2",
      "name": "WATER FLOW 2",
      "topic": "limbah/flow2"
    }
  },
  {
    "id": "cmh4bfm2t0010gvwyliv32hpz",
    "customName": "PH Index [Sensor PH 1]",
    "key": "ph",
    "units": "pH",
    "multiply": 1,
    "deviceUniqId": "limbah-ph1",
    "createdAt": "2025-10-24T03:52:58.758Z",
    "updatedAt": "2025-10-24T09:45:19.890Z",
    "lastLoggedAt": null,
    "loggingIntervalMinutes": 15,
    "device": {
      "uniqId": "limbah-ph1",
      "name": "SENSOR PH 1",
      "topic": "limbah/ph1"
    }
  },
  {
    "id": "cmh4bge40001ngvwynz4dpibh",
    "customName": "PH Index [Sensor PH 2]",
    "key": "ph",
    "units": "pH",
    "multiply": 1,
    "deviceUniqId": "limbah-ph2",
    "createdAt": "2025-10-24T03:53:35.089Z",
    "updatedAt": "2025-10-24T09:45:25.233Z",
    "lastLoggedAt": null,
    "loggingIntervalMinutes": 15,
    "device": {
      "uniqId": "limbah-ph2",
      "name": "SENSOR PH 2",
      "topic": "limbah/ph2"
    }
  },
  {
    "id": "cmh4bho1z0022gvwych9aaobh",
    "customName": "PH Index [Sensor PH 3]",
    "key": "ph",
    "units": "pH",
    "multiply": 1,
    "deviceUniqId": "limbah-ph3",
    "createdAt": "2025-10-24T03:54:34.632Z",
    "updatedAt": "2025-10-24T09:45:32.278Z",
    "lastLoggedAt": null,
    "loggingIntervalMinutes": 15,
    "device": {
      "uniqId": "limbah-ph3",
      "name": "SENSOR PH 3",
      "topic": "limbah/ph3"
    }
  },
  {
    "id": "cmh4be12j000lgvwyihnbf2px",
    "customName": "PM 2.5 [Air Quality 1]",
    "key": "pm2_5",
    "units": "µg/m³",
    "multiply": 1,
    "deviceUniqId": "limbah-airquality1-sps30",
    "createdAt": "2025-10-24T03:51:44.876Z",
    "updatedAt": "2025-10-24T09:45:51.669Z",
    "lastLoggedAt": null,
    "loggingIntervalMinutes": 15,
    "device": {
      "uniqId": "limbah-airquality1-sps30",
      "name": "AIR QUALITY 1",
      "topic": "limbah/airquality1/sps30"
    }
  },
  {
    "id": "cmh4beove000ngvwyo4oet7zt",
    "customName": "PM 2.5 [Air Quality 2]",
    "key": "pm2_5",
    "units": "µg/m³",
    "multiply": 1,
    "deviceUniqId": "limbah-airquality2-sps30",
    "createdAt": "2025-10-24T03:52:15.722Z",
    "updatedAt": "2025-10-24T09:46:15.045Z",
    "lastLoggedAt": null,
    "loggingIntervalMinutes": 15,
    "device": {
      "uniqId": "limbah-airquality2-sps30",
      "name": "AIR QUALITY 2",
      "topic": "limbah/airquality2/sps30"
    }
  },
  {
    "id": "cmh4bjm2n002vgvwygcwonvb7",
    "customName": "Temp Index [Sensor PH 1]",
    "key": "temp",
    "units": "C",
    "multiply": 1,
    "deviceUniqId": "limbah-ph1",
    "createdAt": "2025-10-24T03:56:05.375Z",
    "updatedAt": "2025-10-24T09:46:26.975Z",
    "lastLoggedAt": null,
    "loggingIntervalMinutes": 15,
    "device": {
      "uniqId": "limbah-ph1",
      "name": "SENSOR PH 1",
      "topic": "limbah/ph1"
    }
  },
  {
    "id": "cmh4bk0nb0038gvwy0y7j85cs",
    "customName": "Temp Index [Sensor PH 2]",
    "key": "temp",
    "units": "C",
    "multiply": 1,
    "deviceUniqId": "limbah-ph2",
    "createdAt": "2025-10-24T03:56:24.263Z",
    "updatedAt": "2025-10-24T09:46:35.177Z",
    "lastLoggedAt": null,
    "loggingIntervalMinutes": 15,
    "device": {
      "uniqId": "limbah-ph2",
      "name": "SENSOR PH 2",
      "topic": "limbah/ph2"
    }
  },
  {
    "id": "cmh4bkikq003ngvwyqt3i89tx",
    "customName": "Temp Index [Sensor PH 3]",
    "key": "temp",
    "units": "C",
    "multiply": 1,
    "deviceUniqId": "limbah-ph3",
    "createdAt": "2025-10-24T03:56:47.498Z",
    "updatedAt": "2025-10-24T09:46:42.864Z",
    "lastLoggedAt": null,
    "loggingIntervalMinutes": 15,
    "device": {
      "uniqId": "limbah-ph3",
      "name": "SENSOR PH 3",
      "topic": "limbah/ph3"
    }
  },
  {
    "id": "cmh4bno8v0052gvwyopg08t7u",
    "customName": "Total Flow/Month [Water Flow Sensor 1]",
    "key": "total_flow_this_month",
    "units": "L",
    "multiply": 1,
    "deviceUniqId": "limbah-flow1",
    "createdAt": "2025-10-24T03:59:14.816Z",
    "updatedAt": "2025-10-24T03:59:14.816Z",
    "lastLoggedAt": null,
    "loggingIntervalMinutes": 15,
    "device": {
      "uniqId": "limbah-flow1",
      "name": "WATER FLOW 1",
      "topic": "limbah/flow1"
    }
  },
  {
    "id": "cmh4bo8an005fgvwy6cbzno7x",
    "customName": "Total Flow/Month [Water Flow Sensor 2]",
    "key": "total_flow_this_month",
    "units": "L",
    "multiply": 1,
    "deviceUniqId": "limbah-flow2",
    "createdAt": "2025-10-24T03:59:40.799Z",
    "updatedAt": "2025-10-24T09:47:03.257Z",
    "lastLoggedAt": null,
    "loggingIntervalMinutes": 15,
    "device": {
      "uniqId": "limbah-flow2",
      "name": "WATER FLOW 2",
      "topic": "limbah/flow2"
    }
  }
];


/**
 * Seed logging configurations menggunakan transactional approach
 */
async function seedLoggingConfigs() {
  console.log('📊 Seeding device logging configurations...');
  console.log(`📦 Processing ${LOGGING_CONFIGS_DATA.length} logging configurations...\n`);

  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  const errors = [];

  try {
    // Gunakan transaksi untuk memastikan semua atau tidak sama sekali
    await prisma.$transaction(async (tx) => {
      for (const configData of LOGGING_CONFIGS_DATA) {
        try {
          console.log(`🔍 Processing: ${configData.customName}`);

          // Verify device exists before creating logging config
          const device = await tx.deviceExternal.findUnique({
            where: { uniqId: configData.deviceUniqId }
          });

          if (!device) {
            console.log(`   ⚠️  Device not found: ${configData.deviceUniqId}, skipping...`);
            skippedCount++;
            continue;
          }

          // Cek apakah logging config sudah ada berdasarkan id atau deviceUniqId + key
          const existingById = await tx.loggingConfiguration.findUnique({
            where: { id: configData.id }
          });

          const existingByDeviceKey = await tx.loggingConfiguration.findFirst({
            where: {
              deviceUniqId: configData.deviceUniqId,
              key: configData.key
            }
          });

          if (existingById) {
            // Update logging config yang sudah ada
            await tx.loggingConfiguration.update({
              where: { id: configData.id },
              data: {
                customName: configData.customName,
                units: configData.units,
                multiply: configData.multiply,
                loggingIntervalMinutes: configData.loggingIntervalMinutes,
                deviceUniqId: configData.deviceUniqId,
                updatedAt: new Date()
              }
            });
            updatedCount++;
            console.log(`   📝 Updated: ${configData.customName}`);

          } else if (existingByDeviceKey) {
            // Update jika ada yang sama tapi id berbeda
            await tx.loggingConfiguration.update({
              where: { id: existingByDeviceKey.id },
              data: {
                customName: configData.customName,
                units: configData.units,
                multiply: configData.multiply,
                loggingIntervalMinutes: configData.loggingIntervalMinutes,
                updatedAt: new Date()
              }
            });
            updatedCount++;
            console.log(`   📝 Updated existing: ${configData.customName}`);

          } else {
            // Buat logging config baru
            await tx.loggingConfiguration.create({
              data: {
                id: configData.id,
                customName: configData.customName,
                key: configData.key,
                units: configData.units,
                multiply: configData.multiply,
                loggingIntervalMinutes: configData.loggingIntervalMinutes,
                deviceUniqId: configData.deviceUniqId,
                createdAt: new Date(configData.createdAt),
                updatedAt: new Date(configData.updatedAt)
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

    console.log('\n📊 Logging configurations seeding summary:');
    console.log(`   ✅ Created: ${createdCount} configurations`);
    console.log(`   � Updated: ${updatedCount} configurations`);
    console.log(`   ❌ Skipped: ${skippedCount} configurations`);

    if (errors.length > 0) {
      console.log('\n⚠️  Errors encountered:');
      errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }

    console.log('\n🎯 Logging configurations summary:');
    const flowConfigs = LOGGING_CONFIGS_DATA.filter(c => c.customName.toLowerCase().includes('flow')).length;
    const phConfigs = LOGGING_CONFIGS_DATA.filter(c => c.customName.toLowerCase().includes('ph')).length;
    const tempConfigs = LOGGING_CONFIGS_DATA.filter(c => c.customName.toLowerCase().includes('temperature')).length;

    console.log(`   🌊 Flow Monitoring: ${flowConfigs} configurations (rates and totals)`);
    console.log(`   🧪 Chemical Sensors: ${phConfigs} configurations (pH levels)`);
    console.log(`   🌡️  Temperature: ${tempConfigs} configurations (environmental)`);

    console.log('\n📋 Device associations:');
    const devices = [...new Set(LOGGING_CONFIGS_DATA.map(c => c.deviceUniqId))];
    for (const deviceId of devices) {
      const configs = LOGGING_CONFIGS_DATA.filter(c => c.deviceUniqId === deviceId);
      const deviceData = LOGGING_CONFIGS_DATA.find(c => c.deviceUniqId === deviceId);
      console.log(`   • ${deviceData.customName.replace(/\[.*\]/, '').trim()}: ${configs.length} parameters`);
    }

  } catch (error) {
    console.error('❌ Logging configurations seeding failed:', error);
    throw error;
  }
}

/**
 * Verify logging configurations setelah seeding
 */
async function verifyLoggingConfigs() {
  console.log('\n🔍 Verifying seeded logging configurations...');

  try {
    const configs = await prisma.loggingConfiguration.findMany({
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
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    console.log(`📋 Total logging configurations in database: ${configs.length}`);
    console.log('\n📋 Configurations:');

    configs.forEach((config, index) => {
      console.log(`   ${index + 1}. ${config.customName}`);
      console.log(`      Device: ${config.device?.name || 'Unknown'}`);
      console.log(`      Key: ${config.key}`);
      console.log(`      Units: ${config.units || 'N/A'}`);
      console.log(`      Logs Count: ${config._count.logs}`);
      console.log(`      Multiplier: ${config.multiply}`);
      console.log(`      Created: ${config.createdAt.toISOString().split('T')[0]}`);
    });

    if (configs.length > 8) {
      console.log(`   ... and ${configs.length - 8} more configurations`);
    }

  } catch (error) {
    console.error('❌ Logging configurations verification failed:', error);
  }
}

module.exports = {
  seedLoggingConfigs,
  default: seedLoggingConfigs,
  LOGGING_CONFIGS_DATA
};

// Export for compatibility with seed-init.js
async function seedLoggingConfigsExport() {
  return seedLoggingConfigs();
}

if (require.main === module) {
  seedLoggingConfigs()
    .then(async () => {
      await verifyLoggingConfigs();
      console.log('\n✅ Logging configurations seeding completed successfully!');
      console.log('🚀 Configurations are ready for data logging and chart visualization.');
    })
    .catch((error) => {
      console.error('\n❌ Logging configurations seeding failed:', error);
      process.exit(1);
    })
    .finally(() => {
      prisma.$disconnect();
    });
}
