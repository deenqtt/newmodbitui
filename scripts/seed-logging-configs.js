const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Pre-configured logging configurations dengan predictable IDs
const LOGGING_CONFIGS_DATA = [
  {
    id: "flow-rate-1",
    customName: "Flow Rate [Water Flow Meter 1]",
    key: "flow_rate",
    units: "L/s",
    multiply: 1,
    deviceUniqId: "limbah-flow1",
    createdAt: "2025-10-17T04:23:16.559Z",
    updatedAt: "2025-10-17T04:23:16.559Z"
  },
  {
    id: "flow-rate-2",
    customName: "Flow Rate [Water Flow Meter 2]",
    key: "flow_rate",
    units: "L/s",
    multiply: 1,
    deviceUniqId: "limbah-flow2",
    createdAt: "2025-10-17T04:24:09.002Z",
    updatedAt: "2025-10-17T04:24:09.002Z"
  },
  {
    id: "ph-sensor-1",
    customName: "PH [PH Sensor 1]",
    key: "ph",
    units: "%",
    multiply: 1,
    deviceUniqId: "limbah-ph1",
    createdAt: "2025-10-17T04:25:45.483Z",
    updatedAt: "2025-10-17T04:25:45.483Z"
  },
  {
    id: "ph-sensor-2",
    customName: "PH [PH Sensor 2]",
    key: "ph",
    units: "C",
    multiply: 1,
    deviceUniqId: "limbah-ph2",
    createdAt: "2025-10-17T04:26:04.788Z",
    updatedAt: "2025-10-17T04:26:04.788Z"
  },
  {
    id: "temp-sensor-1",
    customName: "Temperature [PH Sensor 1]",
    key: "temp",
    units: "C",
    multiply: 1,
    deviceUniqId: "limbah-ph1",
    createdAt: "2025-10-17T04:25:07.173Z",
    updatedAt: "2025-10-17T04:25:07.173Z"
  },
  {
    id: "temp-sensor-2",
    customName: "Temperature [PH Sensor 2]",
    key: "temp",
    units: "C",
    multiply: 1,
    deviceUniqId: "limbah-ph2",
    createdAt: "2025-10-17T04:26:24.709Z",
    updatedAt: "2025-10-17T04:26:24.709Z"
  },
  {
    id: "total-flow-1",
    customName: "Total Flow [Water Flow Meter 1]",
    key: "total_flow",
    units: "L",
    multiply: 1,
    deviceUniqId: "limbah-flow1",
    createdAt: "2025-10-17T04:23:49.875Z",
    updatedAt: "2025-10-17T04:23:49.875Z"
  },
  {
    id: "total-flow-2",
    customName: "Total Flow [Water Flow Meter 2]",
    key: "total_flow",
    units: "L",
    multiply: 1,
    deviceUniqId: "limbah-flow2",
    createdAt: "2025-10-17T04:24:35.002Z",
    updatedAt: "2025-10-17T04:24:35.002Z"
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
    console.log(`   📝 Updated: ${updatedCount} configurations`);
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
