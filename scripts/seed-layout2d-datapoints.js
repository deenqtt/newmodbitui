const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Data points untuk IoT-Based Wastewater Treatment Monitoring System dari TASK.md
const DATAPOINTS_DATA = [
  {
    "id": "cmh4hp3m000apgvn5q5wns7ij",
    "layoutId": "cmh46o30200glgvd19lxhgvkv",
    "deviceUniqId": "limbah-flow1",
    "selectedKey": null,
    "selectedKeys": [
      {
        "key": "flow_rate",
        "units": "L/s",
        "multiply": 1,
        "customName": "flow_rate"
      },
      {
        "key": "total_flow_this_month",
        "units": "L",
        "multiply": 1,
        "customName": "total_flow_this_month"
      }
    ],
    "units": null,
    "multiply": 1,
    "customName": "Water Flow Meter 1",
    "positionX": 31.59340659340659,
    "positionY": 35.3349523404772,
    "fontSize": 18,
    "color": "#fafafa",
    "iconName": "TrendingUp",
    "iconColor": "#00ff1e",
    "showIcon": true,
    "displayLayout": "vertical",
    "createdAt": "2025-10-24T06:48:19.080Z",
    "updatedAt": "2025-10-24T06:48:32.305Z",
    "device": {
      "uniqId": "limbah-flow1",
      "name": "WATER FLOW 1",
      "topic": "limbah/flow1",
      "lastPayload": {
        "device_name": "flowMeter1",
        "protocol_type": "MODBUS RTU",
        "comport": "/dev/ttyUSB0",
        "modbus_address": 3,
        "value": "{\"flow_rate\": 0.0, \"velocity\": 0.0, \"flow_direction\": \"No Flow\", \"total_flow\": 0.0, \"total_flow_today\": 0.0, \"total_flow_this_month\": 21.0, \"error_status\": \"Low Signal\", \"error_code\": 2, \"error_details\": {\"no_signal\": 0, \"low_signal\": 1, \"poor_signal\": 0, \"pipe_empty\": 0, \"hardware_failure\": 0, \"status\": \"Low Signal\"}, \"signal_quality\": 0, \"working_step\": 3, \"upstream_strength\": 3258, \"downstream_strength\": 3357, \"signal_strength_status\": \"Excellent\", \"temperature_inlet\": -0.0, \"temperature_outlet\": -0.0, \"temperature_difference\": -0.0, \"working_hours\": 14925, \"meter_health\": \"Poor\", \"polling_duration\": 2.68637752532959}"
      },
      "lastUpdatedByMqtt": "2025-10-24T10:12:14.825Z"
    }
  },
  {
    "id": "cmh4hryck00bpgvn5klscf41t",
    "layoutId": "cmh46o30200glgvd19lxhgvkv",
    "deviceUniqId": "limbah-ph1",
    "selectedKey": null,
    "selectedKeys": [
      {
        "key": "temp",
        "units": "C",
        "multiply": 1,
        "customName": "temp"
      },
      {
        "key": "ph",
        "units": "pH",
        "multiply": 1,
        "customName": "ph"
      }
    ],
    "units": null,
    "multiply": 1,
    "customName": "PH Sensor 1",
    "positionX": 36.81318681318682,
    "positionY": 49.66474409568332,
    "fontSize": 18,
    "color": "#ffffff",
    "iconName": "Droplets",
    "iconColor": "#006eff",
    "showIcon": true,
    "displayLayout": "vertical",
    "createdAt": "2025-10-24T06:50:32.228Z",
    "updatedAt": "2025-10-24T08:00:14.103Z",
    "device": {
      "uniqId": "limbah-ph1",
      "name": "SENSOR PH 1",
      "topic": "limbah/ph1",
      "lastPayload": {
        "device_name": "sensorPh1",
        "protocol_type": "MODBUS RTU",
        "comport": "/dev/ttyUSB0",
        "modbus_address": 1,
        "value": "{\"temp\": 31.65, \"ph\": 2.83, \"PollingDuration\": 1.0475738048553467}"
      },
      "lastUpdatedByMqtt": "2025-10-24T10:12:18.103Z"
    }
  },
  {
    "id": "cmh4ht2n000c0gvn5fooytvjc",
    "layoutId": "cmh46o30200glgvd19lxhgvkv",
    "deviceUniqId": "limbah-ph2",
    "selectedKey": null,
    "selectedKeys": [
      {
        "key": "temp",
        "units": "C",
        "multiply": 1,
        "customName": "temp"
      },
      {
        "key": "ph",
        "units": "pH",
        "multiply": 1,
        "customName": "ph"
      }
    ],
    "units": null,
    "multiply": 1,
    "customName": "PH Sensor 2",
    "positionX": 52.30769230769231,
    "positionY": 50.82180802622791,
    "fontSize": 18,
    "color": "#ededed",
    "iconName": "Thermometer",
    "iconColor": "#00ff91",
    "showIcon": true,
    "displayLayout": "vertical",
    "createdAt": "2025-10-24T06:51:24.444Z",
    "updatedAt": "2025-10-24T08:00:14.400Z",
    "device": {
      "uniqId": "limbah-ph2",
      "name": "SENSOR PH 2",
      "topic": "limbah/ph2",
      "lastPayload": {
        "device_name": "sensorPh2",
        "protocol_type": "MODBUS RTU",
        "comport": "/dev/ttyUSB0",
        "modbus_address": 2,
        "value": "{\"temp\": 31.48, \"ph\": 9.22, \"PollingDuration\": 1.0494210720062256}"
      },
      "lastUpdatedByMqtt": "2025-10-24T10:12:21.286Z"
    }
  },
  {
    "id": "cmh4hu5on00cegvn5qkzd9p64",
    "layoutId": "cmh46o30200glgvd19lxhgvkv",
    "deviceUniqId": "limbah-flow2",
    "selectedKey": null,
    "selectedKeys": [
      {
        "key": "flow_rate",
        "units": "L/s",
        "multiply": 1,
        "customName": "flow_rate"
      },
      {
        "key": "total_flow_this_month",
        "units": "L",
        "multiply": 1,
        "customName": "total_flow_this_month"
      }
    ],
    "units": null,
    "multiply": 1,
    "customName": "Water Flow Meter 2",
    "positionX": 62.91208791208791,
    "positionY": 62.21443749620544,
    "fontSize": 18,
    "color": "#ffffff",
    "iconName": "TrendingDown",
    "iconColor": "#f50000",
    "showIcon": true,
    "displayLayout": "vertical",
    "createdAt": "2025-10-24T06:52:15.047Z",
    "updatedAt": "2025-10-24T08:00:18.463Z",
    "device": {
      "uniqId": "limbah-flow2",
      "name": "WATER FLOW 2",
      "topic": "limbah/flow2",
      "lastPayload": null,
      "lastUpdatedByMqtt": null
    }
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
            selectedKeys: JSON.stringify(dataPointData.selectedKeys),
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
        let parsedKeys = [];
        try {
          parsedKeys = dp.selectedKeys ? JSON.parse(dp.selectedKeys) : [];
        } catch (e) {
          // ignore
        }
        console.log(`      Keys: ${parsedKeys.length} key(s)`);
        if (parsedKeys.length > 0) {
          parsedKeys.forEach(key => {
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
