const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Data devices untuk seeding
const DEVICES_DATA = [
  {
    name: "SENSOR PH 1",
    address: "1", // String format sesuai schema
    topic: "limbah/ph1"
  },
  {
    name: "SENSOR PH 2",
    address: "2", // String format sesuai schema
    topic: "limbah/ph2"
  },
  {
    name: "SENSOR PH 3",
    address: "5", // String format sesuai schema
    topic: "limbah/ph3"
  },
  {
    name: "WATER FLOW 1",
    address: "3", // String format sesuai schema
    topic: "limbah/flow1"
  },
  {
    name: "WATER FLOW 2",
    address: "4", // String format sesuai schema
    topic: "limbah/flow2"
  },
  {
    name: "AIR QUALITY 1",
    address: null,
    topic: "limbah/airquality1/lpss30"
  },
  {
    name: "TEMP HUM 1",
    address: null,
    topic: "limbah/airquality1/sht4x"
  },
  {
    name: "VIBRATION 1",
    address: null,
    topic: "limbah/airquality1/lis3dhtr"
  },
  {
    name: "AIR QUALITY 2",
    address: null,
    topic: "limbah/airquality2/lpss30"
  },
  {
    name: "TEMP HUM 2",
    address: null,
    topic: "limbah/airquality2/sht4x"
  },
  {
    name: "VIBRATION 2",
    address: null,
    topic: "limbah/airquality2/lis3dhtr"
  }
];

/**
 * Seed devices menggunakan transactional approach
 */
async function seedDevices() {
  console.log('🔄 Starting device seeding...');
  console.log(`📦 Processing ${DEVICES_DATA.length} devices...\n`);

  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  const errors = [];

  try {
    // Gunakan transaksi untuk memastikan semua atau tidak sama sekali
    await prisma.$transaction(async (tx) => {
      for (const deviceData of DEVICES_DATA) {
        try {
          console.log(`🔍 Processing: ${deviceData.name}`);

          // Cek apakah device sudah ada berdasarkan topic atau uniqId
          const existingByTopic = await tx.deviceExternal.findUnique({
            where: { topic: deviceData.topic }
          });

          if (existingByTopic) {
            // Update device yang sudah ada
            await tx.deviceExternal.update({
              where: { topic: deviceData.topic },
              data: {
                name: deviceData.name,
                address: deviceData.address,
                updatedAt: new Date()
              }
            });
            updatedCount++;
            console.log(`   📝 Updated: ${deviceData.name}`);

          } else {
            // Buat device baru
            await tx.deviceExternal.create({
              data: {
                name: deviceData.name,
                topic: deviceData.topic,
                address: deviceData.address
              }
            });
            createdCount++;
            console.log(`   ➕ Created: ${deviceData.name}`);
          }

        } catch (deviceError) {
          console.error(`   ❌ Error processing ${deviceData.name}:`, deviceError.message);
          errors.push(`${deviceData.name}: ${deviceError.message}`);
          skippedCount++;
        }
      }
    });

    console.log('\n📊 Device seeding summary:');
    console.log(`   ✅ Created: ${createdCount} devices`);
    console.log(`   📝 Updated: ${updatedCount} devices`);
    console.log(`   ❌ Skipped: ${skippedCount} devices`);

    if (errors.length > 0) {
      console.log('\n⚠️  Errors encountered:');
      errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }

    console.log('\n🎯 Device categories seeded:');
    console.log('   🔬 PH Sensors: 3 devices (PH 1, 2, 3)');
    console.log('   💧 Water Flow: 2 devices (Flow 1, 2)');
    console.log('   🌪️  Air Quality: 2 devices (LPS S30 sensors)');
    console.log('   🌡️  Temperature: 2 devices (SHT4X sensors)');
    console.log('   📳 Vibration: 2 devices (LIS3DHTR sensors)');

  } catch (error) {
    console.error('❌ Device seeding failed:', error);
    throw error;
  }
}

/**
 * Verify devices setelah seeding
 */
async function verifyDevices() {
  console.log('\n🔍 Verifying seeded devices...');

  try {
    const devices = await prisma.deviceExternal.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    console.log(`📋 Total devices in database: ${devices.length}`);
    console.log('\n📋 Recent devices:');

    devices.slice(0, 5).forEach((device, index) => {
      const topicParts = device.topic.split('/');
      const category = topicParts.length > 1 ? topicParts[1] : 'unknown';

      console.log(`   ${index + 1}. ${device.name}`);
      console.log(`      Topic: ${device.topic}`);
      console.log(`      Address: ${device.address || 'N/A'}`);
      console.log(`      Category: ${category}`);
      console.log(`      Created: ${device.createdAt.toISOString().split('T')[0]}`);
    });

    if (devices.length > 5) {
      console.log(`   ... and ${devices.length - 5} more devices`);
    }

  } catch (error) {
    console.error('❌ Device verification failed:', error);
  }
}

module.exports = {
  seedDevices,
  default: seedDevices,
  DEVICES_DATA
};

// Export for compatibility with seed-init.js
async function seedDevicesExport() {
  return seedDevices();
}

if (require.main === module) {
  seedDevices()
    .then(async () => {
      await verifyDevices();
      console.log('\n✅ Device seeding completed successfully!');
      console.log('🚀 Devices are ready for MQTT integration and monitoring.');
    })
    .catch((error) => {
      console.error('\n❌ Device seeding failed:', error);
      process.exit(1);
    })
    .finally(() => {
      prisma.$disconnect();
    });
}
