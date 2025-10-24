const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Data points untuk IoT-Based Wastewater Treatment Monitoring System
const DATAPOINTS_DATA = [
  {
    // Water Flow Meter 1 - Connected to limbah-flow1 device
    deviceUniqId: "limbah-flow1",
    customName: "Water Flow Meter 1",
    positionX: 31.59340659340659,
    positionY: 35.3349523404772,
    fontSize: 18,
    color: "#fafafa",
    iconName: "TrendingUp",
    iconColor: "#00ff1e",
    showIcon: true,
    displayLayout: "vertical",
    selectedKeys: [
      {
        key: "flow_rate",
        units: "L/s",
        multiply: 1,
        customName: "flow_rate"
      },
      {
        key: "total_flow_this_month",
        units: "L",
        multiply: 1,
        customName: "total_flow_this_month"
      }
    ]
  },
  {
    // PH Sensor 1 - Connected to limbah-ph1 device
    deviceUniqId: "limbah-ph1",
    customName: "PH Sensor 1",
    positionX: 36.81318681318682,
    positionY: 49.66474409568332,
    fontSize: 18,
    color: "#ffffff",
    iconName: "Droplets",
    iconColor: "#006eff",
    showIcon: true,
    displayLayout: "vertical",
    selectedKeys: [
      {
        key: "temp",
        units: "C",
        multiply: 1,
        customName: "temp"
      },
      {
        key: "ph",
        units: "%",
        multiply: 1,
        customName: "ph"
      }
    ]
  },
  {
    // PH Sensor 2 - Connected to limbah-ph2 device
    deviceUniqId: "limbah-ph2",
    customName: "PH Sensor 2",
    positionX: 52.30769230769231,
    positionY: 50.82180802622791,
    fontSize: 18,
    color: "#ededed",
    iconName: "Thermometer",
    iconColor: "#00ff91",
    showIcon: true,
    displayLayout: "vertical",
    selectedKeys: [
      {
        key: "temp",
        units: "C",
        multiply: 1,
        customName: "temp"
      },
      {
        key: "ph",
        units: "%",
        multiply: 1,
        customName: "ph"
      }
    ]
  },
  {
    // Water Flow Meter 2 - Connected to limbah-flow2 device
    deviceUniqId: "limbah-flow2",
    customName: "Water Flow Meter 2",
    positionX: 62.91208791208791,
    positionY: 62.21443749620544,
    fontSize: 18,
    color: "#ffffff",
    iconName: "TrendingDown",
    iconColor: "#f50000",
    showIcon: true,
    displayLayout: "vertical",
    selectedKeys: [
      {
        key: "flow_rate",
        units: "L/s",
        multiply: 1,
        customName: "flow_rate"
      },
      {
        key: "total_flow_this_month",
        units: "L",
        multiply: 1,
        customName: "total_flow_this_month"
      }
    ]
  }
];

/**
 * Seed data points untuk layout Wastewater Treatment System
 */
async function seedLayout2DDataPoints() {
  console.log('🔄 Starting Layout 2D Data Points seeding...');
  console.log(`📦 Processing ${DATAPOINTS_DATA.length} data points...\n`);

  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  const errors = [];

  try {
    // Cari layout Wastewater Treatment secara spesifik
    const layout2D = await prisma.layout2D.findFirst({
      where: {
        OR: [
          { name: "IoT-Based Wastewater Treatment Monitoring System" },
          { id: "cmh46o30200glgvd19lxhgvkv" } // Explicit ID backup
        ]
      }
    });

    if (!layout2D) {
      console.error('❌ Target layout not found. Please run seed-layout2d.js first.');
      console.log('\n🔍 Available layouts:');
      const layouts = await prisma.layout2D.findMany();
      layouts.forEach(layout => {
        console.log(`   • ${layout.name} (ID: ${layout.id}, Active: ${layout.isUse})`);
      });
      throw new Error('Layout not found');
    }

    console.log(`🎯 Seeding data points for layout: "${layout2D.name}"`);
    console.log(`📍 Layout ID: ${layout2D.id}\n`);

    // Gunakan transaksi untuk memastikan semua atau tidak sama sekali
    await prisma.$transaction(async (tx) => {
      for (const dataPointData of DATAPOINTS_DATA) {
        try {
          console.log(`🔍 Processing: ${dataPointData.customName}`);

          // Cari device berdasarkan uniqId
          const device = await tx.deviceExternal.findUnique({
            where: { uniqId: dataPointData.deviceUniqId }
          });

          if (!device) {
            const errorMsg = `Device with uniqId "${dataPointData.deviceUniqId}" not found`;
            console.log(`   ❌ ${errorMsg}`);
            errors.push(`${dataPointData.customName}: ${errorMsg}`);
            skippedCount++;
            continue;
          }

          console.log(`   🔗 Connected to device: ${device.name} (${device.uniqId})`);

          // Cek apakah data point sudah ada untuk kombinasi layout + device
          const existingDataPoint = await tx.layout2DDataPoint.findFirst({
            where: {
              layoutId: layout2D.id,
              deviceUniqId: dataPointData.deviceUniqId
            }
          });

          // Prepare data untuk create/update
          const dataPointPayload = {
            layoutId: layout2D.id,
            deviceUniqId: dataPointData.deviceUniqId,
            customName: dataPointData.customName,
            positionX: dataPointData.positionX,
            positionY: dataPointData.positionY,
            fontSize: dataPointData.fontSize,
            color: dataPointData.color,
            iconName: dataPointData.iconName,
            iconColor: dataPointData.iconColor,
            showIcon: dataPointData.showIcon,
            displayLayout: dataPointData.displayLayout,
            // For backward compatibility
            selectedKey: null,
            selectedKeys: dataPointData.selectedKeys,
            units: null,
            multiply: 1
          };

          if (existingDataPoint) {
            // Update data point yang sudah ada
            await tx.layout2DDataPoint.update({
              where: { id: existingDataPoint.id },
              data: {
                ...dataPointPayload,
                updatedAt: new Date()
              }
            });
            updatedCount++;
            console.log(`   📝 Updated: "${dataPointData.customName}"`);

          } else {
            // Buat data point baru
            await tx.layout2DDataPoint.create({
              data: dataPointPayload
            });
            createdCount++;
            console.log(`   ➕ Created: "${dataPointData.customName}"`);
          }

        } catch (error) {
          console.error(`   ❌ Error processing ${dataPointData.customName}:`, error.message);
          errors.push(`${dataPointData.customName}: ${error.message}`);
          skippedCount++;
        }
      }
    });

    console.log('\n📊 Data Points seeding summary:');
    console.log(`   ✅ Created: ${createdCount} data points`);
    console.log(`   📝 Updated: ${updatedCount} data points`);
    console.log(`   ❌ Skipped: ${skippedCount} data points`);

    console.log('\n🎯 Data Points configuration:');
    DATAPOINTS_DATA.forEach((dp, index) => {
      console.log(`   ${index + 1}. "${dp.customName}"`);
      console.log(`      Device: ${dp.deviceUniqId}`);
      console.log(`      Position: (${dp.positionX.toFixed(2)}, ${dp.positionY.toFixed(2)})`);
      console.log(`      Keys: ${dp.selectedKeys.map(k => `${k.customName} (${k.units})`).join(', ')}`);
    });

    if (errors.length > 0) {
      console.log('\n⚠️  Errors encountered:');
      errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }

  } catch (error) {
    console.error('❌ Data Points seeding failed:', error);
    throw error;
  }
}

/**
 * Verify data points setelah seeding
 */
async function verifyDataPoints() {
  console.log('\n🔍 Verifying seeded data points...');

  try {
    const layout2D = await prisma.layout2D.findFirst({
      where: {
        OR: [
          { name: "IoT-Based Wastewater Treatment Monitoring System" },
          { id: "cmh46o30200glgvd19lxhgvkv" }
        ]
      }
    });

    if (!layout2D) {
      console.log('⚠️  Layout not found for verification');
      return;
    }

    const dataPoints = await prisma.layout2DDataPoint.findMany({
      where: { layoutId: layout2D.id },
      include: {
        device: {
          select: {
            name: true,
            uniqId: true,
            topic: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`📋 Total data points for "${layout2D.name}": ${dataPoints.length}`);

    if (dataPoints.length > 0) {
      console.log('\n📋 Data Points:');
      dataPoints.forEach((dp, index) => {
        console.log(`   ${index + 1}. ${dp.customName}`);
        console.log(`      Device: ${dp.device?.name} (${dp.device?.uniqId})`);
        console.log(`      Topic: ${dp.device?.topic}`);
        console.log(`      Icon: ${dp.iconName || 'None'} (${dp.iconColor || 'N/A'})`);
        console.log(`      Position: (${dp.positionX.toFixed(2)}, ${dp.positionY.toFixed(2)})`);
        console.log(`      Keys: ${dp.selectedKeys?.length || 0} key(s)`);
        if (dp.selectedKeys && dp.selectedKeys.length > 0) {
          dp.selectedKeys.forEach(key => {
            console.log(`         • ${key.customName}: key="${key.key}", units="${key.units}"`);
          });
        }
        console.log(`      Created: ${dp.createdAt.toISOString().split('T')[0]}`);
      });
    } else {
      console.log('   ⚠️  No data points found!');
    }

  } catch (error) {
    console.error('❌ Data Points verification failed:', error);
  }
}

module.exports = {
  seedLayout2DDataPoints,
  default: seedLayout2DDataPoints,
  DATAPOINTS_DATA
};

// Export for compatibility with seed-init.js
async function seedLayout2DDataPointsExport() {
  return seedLayout2DDataPoints();
}

if (require.main === module) {
  seedLayout2DDataPoints()
    .then(async () => {
      await verifyDataPoints();
      console.log('\n✅ Layout 2D Data Points seeding completed successfully!');
      console.log('🚀 Wastewater treatment monitoring system is ready for real-time data visualization.');
    })
    .catch((error) => {
      console.error('\n❌ Layout 2D Data Points seeding failed:', error);
      process.exit(1);
    })
    .finally(() => {
      prisma.$disconnect();
    });
}
