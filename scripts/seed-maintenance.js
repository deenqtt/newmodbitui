const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Pre-configured maintenance data untuk maintenance bulanan
const MAINTENANCE_DATA = [
  {
    id: 1,
    name: "Monthly Maintenance - PH Sensor 1",
    description: "Scheduled monthly maintenance for PH Sensor 1: calibration, probe cleaning, buffer solution replacement",
    startTask: "2025-11-01T08:00:00.000Z",
    endTask: "2025-11-01T10:00:00.000Z",
    assignToEmail: "user@gmail.com",
    targetType: "Device",
    targetId: "limbah-ph1",
    status: "Scheduled",
    createdAt: "2025-10-24T08:00:00.000Z",
    updatedAt: "2025-10-24T08:00:00.000Z",
    isActive: true,
  },
  {
    id: 2,
    name: "Monthly Maintenance - PH Sensor 2",
    description: "Scheduled monthly maintenance for PH Sensor 2: calibration, probe cleaning, buffer solution replacement",
    startTask: "2025-11-01T10:30:00.000Z",
    endTask: "2025-11-01T12:30:00.000Z",
    assignToEmail: "user@gmail.com",
    targetType: "Device",
    targetId: "limbah-ph2",
    status: "Scheduled",
    createdAt: "2025-10-24T08:05:00.000Z",
    updatedAt: "2025-10-24T08:05:00.000Z",
    isActive: true,
  },
  {
    id: 3,
    name: "Monthly Maintenance - PH Sensor 3",
    description: "Scheduled monthly maintenance for PH Sensor 3: calibration, probe cleaning, buffer solution replacement",
    startTask: "2025-11-02T08:00:00.000Z",
    endTask: "2025-11-02T10:00:00.000Z",
    assignToEmail: "user@gmail.com",
    targetType: "Device",
    targetId: "limbah-ph3",
    status: "Scheduled",
    createdAt: "2025-10-24T08:10:00.000Z",
    updatedAt: "2025-10-24T08:10:00.000Z",
    isActive: true,
  },
  {
    id: 4,
    name: "Monthly Maintenance - Water Flow Meter 1",
    description: "Scheduled monthly maintenance for Flow Meter 1: sensor inspection, pipe cleaning, flow verification",
    startTask: "2025-11-02T13:00:00.000Z",
    endTask: "2025-11-02T15:00:00.000Z",
    assignToEmail: "user@gmail.com",
    targetType: "Device",
    targetId: "limbah-flow1",
    status: "Scheduled",
    createdAt: "2025-10-24T08:15:00.000Z",
    updatedAt: "2025-10-24T08:15:00.000Z",
    isActive: true,
  },
  {
    id: 5,
    name: "Monthly Maintenance - Water Flow Meter 2",
    description: "Scheduled monthly maintenance for Flow Meter 2: sensor inspection, pipe cleaning, flow verification",
    startTask: "2025-11-03T08:00:00.000Z",
    endTask: "2025-11-03T10:00:00.000Z",
    assignToEmail: "user@gmail.com",
    targetType: "Device",
    targetId: "limbah-flow2",
    status: "Scheduled",
    createdAt: "2025-10-24T08:20:00.000Z",
    updatedAt: "2025-10-24T08:20:00.000Z",
    isActive: true,
  },
  {
    id: 6,
    name: "Monthly Maintenance - Air Quality Sensor 1",
    description: "Scheduled monthly maintenance for Air Quality 1: sensor cleaning, calibration, filter replacement",
    startTask: "2025-11-03T13:00:00.000Z",
    endTask: "2025-11-03T15:00:00.000Z",
    assignToEmail: "user@gmail.com",
    targetType: "Device",
    targetId: "limbah-airquality1-sps30",
    status: "Scheduled",
    createdAt: "2025-10-24T08:25:00.000Z",
    updatedAt: "2025-10-24T08:25:00.000Z",
    isActive: true,
  },
  {
    id: 7,
    name: "Monthly Maintenance - Air Quality Sensor 2",
    description: "Scheduled monthly maintenance for Air Quality 2: sensor cleaning, calibration, filter replacement",
    startTask: "2025-11-04T08:00:00.000Z",
    endTask: "2025-11-04T10:00:00.000Z",
    assignToEmail: "user@gmail.com",
    targetType: "Device",
    targetId: "limbah-airquality2-sps30",
    status: "Scheduled",
    createdAt: "2025-10-24T08:30:00.000Z",
    updatedAt: "2025-10-24T08:30:00.000Z",
    isActive: true,
  },
];

/**
 * Seed maintenance data menggunakan transactional approach
 */
async function seedMaintenance() {
  console.log('🔧 Starting maintenance seeding...');
  console.log(`📋 Processing ${MAINTENANCE_DATA.length} maintenance records...\n`);

  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  const errors = [];

  try {
    // Gunakan transaksi untuk memastikan semua atau tidak sama sekali
    await prisma.$transaction(async (tx) => {
      for (const maintenanceData of MAINTENANCE_DATA) {
        try {
          console.log(`🔍 Processing: ${maintenanceData.name}`);

          // Get user by email and find device by uniqId
          const assignedUser = await tx.user.findUnique({
            where: { email: maintenanceData.assignToEmail }
          });

          if (!assignedUser) {
            console.log(`   ⚠️  Assigned user not found: ${maintenanceData.assignToEmail}, skipping...`);
            skippedCount++;
            continue;
          }

          // Verify target device exists
          const targetDevice = await tx.deviceExternal.findUnique({
            where: { uniqId: maintenanceData.targetId }
          });

          if (!targetDevice) {
            console.log(`   ⚠️  Target device not found: ${maintenanceData.targetId}, skipping...`);
            skippedCount++;
            continue;
          }

          // Use device.id as deviceTargetId
          const deviceTargetId = targetDevice.id;

          // Cek apakah maintenance record sudah ada berdasarkan id
          const existingMaintenance = await tx.maintenance.findUnique({
            where: { id: maintenanceData.id }
          });

          if (existingMaintenance) {
            // Update maintenance yang sudah ada
            await tx.maintenance.update({
              where: { id: maintenanceData.id },
              data: {
                name: maintenanceData.name,
                description: maintenanceData.description,
                startTask: new Date(maintenanceData.startTask),
                endTask: new Date(maintenanceData.endTask),
                assignTo: assignedUser.id,
                targetType: maintenanceData.targetType,
                targetId: maintenanceData.targetId,
                status: maintenanceData.status,
                isActive: maintenanceData.isActive,
                deviceTargetId: deviceTargetId,
                updatedAt: new Date(maintenanceData.updatedAt)
              }
            });
            updatedCount++;
            console.log(`   📝 Updated: ${maintenanceData.name}`);

          } else {
            // Buat maintenance record baru
            await tx.maintenance.create({
              data: {
                id: maintenanceData.id,
                name: maintenanceData.name,
                description: maintenanceData.description,
                startTask: new Date(maintenanceData.startTask),
                endTask: new Date(maintenanceData.endTask),
                assignTo: assignedUser.id,
                targetType: maintenanceData.targetType,
                targetId: maintenanceData.targetId,
                status: maintenanceData.status,
                createdAt: new Date(maintenanceData.createdAt),
                updatedAt: new Date(maintenanceData.updatedAt),
                isActive: maintenanceData.isActive,
                deviceTargetId: deviceTargetId
              }
            });
            createdCount++;
            console.log(`   ➕ Created: ${maintenanceData.name}`);
          }

        } catch (maintenanceError) {
          console.error(`   ❌ Error processing ${maintenanceData.name}:`, maintenanceError.message);
          errors.push(`${maintenanceData.name}: ${maintenanceError.message}`);
          skippedCount++;
        }
      }
    });

    console.log('\n📊 Maintenance seeding summary:');
    console.log(`   ✅ Created: ${createdCount} records`);
    console.log(`   📝 Updated: ${updatedCount} records`);
    console.log(`   ❌ Skipped: ${skippedCount} records`);

    if (errors.length > 0) {
      console.log('\n⚠️  Errors encountered:');
      errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }

    console.log('\n🎯 Maintenance categories seeded:');
    console.log('   🔧 Monthly Device Maintenance: 7 scheduled maintenance tasks');
    console.log('      - PH Sensors: 3 maintenance tasks (calibration, cleaning)');
    console.log('      - Flow Meters: 2 maintenance tasks (inspection, verification)');
    console.log('      - Air Quality Sensors: 2 maintenance tasks (cleaning, filter replacement)');
    console.log('      - Schedule: November 1-4, 2025');
    console.log('      - Assigned to: user@gmail.com');
    console.log('      - All tasks: Scheduled status');

  } catch (error) {
    console.error('❌ Maintenance seeding failed:', error);
    throw error;
  }
}

/**
 * Verify maintenance records setelah seeding
 */
async function verifyMaintenance() {
  console.log('\n🔍 Verifying seeded maintenance records...');

  try {
    const maintenances = await prisma.maintenance.findMany({
      include: {
        assignedTo: {
          select: {
            email: true,
            phoneNumber: true
          }
        },
        deviceTarget: {
          select: {
            name: true,
            topic: true,
            address: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    console.log(`📋 Total maintenance records in database: ${maintenances.length}`);
    console.log('\n📋 Maintenance records:');

    maintenances.forEach((maintenance, index) => {
      console.log(`   ${index + 1}. ${maintenance.name}`);
      console.log(`      Assigned to: ${maintenance.assignedTo?.email || 'Unknown'}`);
      console.log(`      Device: ${maintenance.deviceTarget?.name || 'Unknown'} (${maintenance.targetId})`);
      console.log(`      Status: ${maintenance.status}`);
      console.log(`      Start: ${maintenance.startTask.toISOString().split('T')[0]}`);
      console.log(`      End: ${maintenance.endTask.toISOString().split('T')[0]}`);
      console.log(`      Active: ${maintenance.isActive ? '✅' : '❌'}`);
    });

    if (maintenances.length > 7) {
      console.log(`   ... and ${maintenances.length - 7} more maintenance records`);
    }

  } catch (error) {
    console.error('❌ Maintenance verification failed:', error);
  }
}

module.exports = {
  seedMaintenance,
  default: seedMaintenance,
  MAINTENANCE_DATA
};

// Export for compatibility with seed-init.js
async function seedMaintenanceExport() {
  return seedMaintenance();
}

if (require.main === module) {
  seedMaintenance()
    .then(async () => {
      await verifyMaintenance();
      console.log('\n✅ Maintenance seeding completed successfully!');
      console.log('🔧 Ready for maintenance scheduling and tracking.');
    })
    .catch((error) => {
      console.error('\n❌ Maintenance seeding failed:', error);
      process.exit(1);
    })
    .finally(() => {
      prisma.$disconnect();
    });
}
