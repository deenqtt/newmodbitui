const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Data devices untuk seeding dari TASK.md
const DEVICES_DATA = [
  {
    name: "SENSOR PH 1",
    address: "1",
    topic: "limbah/ph1",
    uniqId: "limbah-ph1"
  },
  {
    name: "SENSOR PH 2",
    address: "2",
    topic: "limbah/ph2",
    uniqId: "limbah-ph2"
  },
  {
    name: "SENSOR PH 3",
    address: "5",
    topic: "limbah/ph3",
    uniqId: "limbah-ph3"
  },
  {
    name: "WATER FLOW 1",
    address: "3",
    topic: "limbah/flow1",
    uniqId: "limbah-flow1"
  },
  {
    name: "WATER FLOW 2",
    address: "4",
    topic: "limbah/flow2",
    uniqId: "limbah-flow2"
  },
  {
    name: "AIR QUALITY 1",
    address: null,
    topic: "limbah/airquality1/sps30",
    uniqId: "limbah-airquality1-sps30"
  },
  {
    name: "AIR QUALITY 2",
    address: null,
    topic: "limbah/airquality2/sps30",
    uniqId: "limbah-airquality2-sps30"
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

          // Use explicit uniqId from DEVICES_DATA (from TASK.md)
          const explicitUniqId = deviceData.uniqId;

          // Cek apakah device sudah ada berdasarkan topic atau uniqId
          const existingByTopic = await tx.deviceExternal.findUnique({
            where: { topic: deviceData.topic }
          });

          const existingByUniqId = await tx.deviceExternal.findUnique({
            where: { uniqId: explicitUniqId }
          });

          if (existingByTopic) {
            // Update device yang sudah ada - juga update uniqId untuk konsistensi
            await tx.deviceExternal.update({
              where: { topic: deviceData.topic },
              data: {
                name: deviceData.name,
                uniqId: explicitUniqId, // Use explicit uniqId dari TASK.md
                address: deviceData.address,
                updatedAt: new Date()
              }
            });
            updatedCount++;
            console.log(`   📝 Updated: ${deviceData.name} (ID: ${explicitUniqId})`);

          } else if (existingByUniqId) {
            // Update by uniqId if topic doesn't exist but uniqId does
            await tx.deviceExternal.update({
              where: { uniqId: explicitUniqId },
              data: {
                name: deviceData.name,
                topic: deviceData.topic,
                address: deviceData.address,
                updatedAt: new Date()
              }
            });
            updatedCount++;
            console.log(`   📝 Updated by ID: ${deviceData.name} (ID: ${explicitUniqId})`);

          } else {
            // Buat device baru dengan explicit uniqId
            await tx.deviceExternal.create({
              data: {
                name: deviceData.name,
                topic: deviceData.topic,
                uniqId: explicitUniqId, // Use explicit uniqId dari TASK.md
                address: deviceData.address
              }
            });
            createdCount++;
            console.log(`   ➕ Created: ${deviceData.name} (ID: ${explicitUniqId})`);
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

    console.log('\n🔗 Device IDs from TASK.md:');
    console.log('   💡 Device IDs match the logging configurations exactly:');
    DEVICES_DATA.forEach(device => {
      console.log(`   • ${device.name}: ${device.uniqId}`);
    });

    if (errors.length > 0) {
      console.log('\n⚠️  Errors encountered:');
      errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }

    console.log('\n🎯 Device categories seeded:');
    console.log('   🔬 PH Sensors: 3 devices (PH 1, 2, 3)');
    console.log('   💧 Water Flow: 2 devices (Flow 1, 2)');
    console.log('   🌪️  Air Quality: 2 devices (SPS30 sensors)');

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
