#!/usr/bin/env node

/**
 * Device Seeder Script
 *
 * Seeds default external devices based on MQTT topics for IoT monitoring.
 * This script creates devices for water leak detection, temperature/humidity monitoring,
 * and air quality measurement in industrial waste management systems.
 *
 * Usage: npm run seed:devices
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const DEFAULT_DEVICES = [
  {
    uniqId: 'WL_SENSOR_001',
    name: 'Water Leak Detector #1',
    topic: 'limbah/water_leak/1',
    address: 'Zone A - Building 1',
    lastPayload: JSON.stringify({
      water_leak: false,
      sensor_status: "normal",
      battery_level: 85,
      signal_strength: -45,
      timestamp: new Date().toISOString()
    }),
    lastUpdatedByMqtt: new Date()
  },
  {
    uniqId: 'TH_SENSOR_002',
    name: 'Temperature & Humidity Monitor #2',
    topic: 'limbah/temperature_humidity/2',
    address: 'Zone B - Processing Area',
    lastPayload: JSON.stringify({
      temperature: 28.5,
      humidity: 65.2,
      heat_index: 30.1,
      dew_point: 21.3,
      sensor_status: "normal",
      battery_level: 92,
      signal_strength: -38,
      timestamp: new Date().toISOString()
    }),
    lastUpdatedByMqtt: new Date()
  },
  {
    uniqId: 'AQ_SENSOR_003',
    name: 'Air Quality Monitor #3',
    topic: 'limbah/air_quality/3',
    address: 'Zone C - Waste Treatment',
    lastPayload: JSON.stringify({
      pm25: 15.2,
      pm10: 22.8,
      co2: 420,
      voc: 0.8,
      no2: 12.5,
      so2: 8.1,
      o3: 45.3,
      aqi: 58,
      air_quality_status: "moderate",
      sensor_status: "normal",
      battery_level: 78,
      signal_strength: -52,
      timestamp: new Date().toISOString()
    }),
    lastUpdatedByMqtt: new Date()
  },
  {
    uniqId: 'WL_SENSOR_004',
    name: 'Water Leak Detector #4',
    topic: 'limbah/water_leak/4',
    address: 'Zone D - Critical Storage',
    lastPayload: JSON.stringify({
      water_leak: false,
      leak_probability: 5,
      sensor_status: "normal",
      maintenance_due: false,
      battery_level: 71,
      signal_strength: -48,
      timestamp: new Date().toISOString()
    }),
    lastUpdatedByMqtt: new Date()
  },
  {
    uniqId: 'TH_SENSOR_005',
    name: 'Temperature & Humidity Monitor #5',
    topic: 'limbah/temperature_humidity/5',
    address: 'Zone E - Storage Area',
    lastPayload: JSON.stringify({
      temperature: 24.8,
      humidity: 58.7,
      heat_index: 26.2,
      comfort_level: "comfortable",
      sensor_status: "normal",
      battery_level: 89,
      signal_strength: -41,
      timestamp: new Date().toISOString()
    }),
    lastUpdatedByMqtt: new Date()
  },
  {
    uniqId: 'AQ_SENSOR_006',
    name: 'Air Quality Monitor #6',
    topic: 'limbah/air_quality/6',
    address: 'Zone F - Outdoor Station',
    lastPayload: JSON.stringify({
      pm25: 8.5,
      pm10: 14.2,
      co2: 385,
      voc: 0.3,
      aqi: 42,
      air_quality_status: "good",
      sensor_status: "maintenance",
      maintenance_note: "Scheduled calibration",
      battery_level: 25,
      signal_strength: -65,
      timestamp: new Date().toISOString()
    }),
    lastUpdatedByMqtt: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
  }
];

async function checkExistingDevices() {
  try {
    const deviceCount = await prisma.deviceExternal.count();
    return deviceCount;
  } catch (error) {
    console.error('Error checking existing devices:', error);
    throw error;
  }
}

async function createDevice(deviceData) {
  try {
    const device = await prisma.deviceExternal.create({
      data: deviceData,
      select: {
        id: true,
        uniqId: true,
        name: true,
        topic: true,
        address: true,
        createdAt: true
      }
    });

    return device;
  } catch (error) {
    console.error(`Error creating device ${deviceData.uniqId}:`, error);
    throw error;
  }
}

async function seedDevices() {
  console.log('🌱 Starting device seeding process...\n');

  try {
    // Check if devices already exist
    const existingDeviceCount = await checkExistingDevices();

    console.log(`📊 Found ${existingDeviceCount} existing devices in the table.`);
    console.log('✅ Proceeding with seeding new devices (duplicates will be skipped by unique constraints)...\n');

    // Create default devices
    const createdDevices = [];

    for (const deviceData of DEFAULT_DEVICES) {
      console.log(`Creating device: ${deviceData.name}`);
      console.log(`  Topic: ${deviceData.topic}`);
      console.log(`  Address: ${deviceData.address}`);

      try {
        const device = await createDevice(deviceData);
        createdDevices.push(device);

        console.log(`✅ Device created successfully!`);
        console.log(`   ID: ${device.id}`);
        console.log(`   Unique ID: ${device.uniqId}`);
        console.log(`   Created: ${device.createdAt.toLocaleString()}\n`);
      } catch (error) {
        if (error.code === 'P2002') {
          console.log(`⚠️  Device ${deviceData.uniqId} already exists, skipping...\n`);
        } else {
          throw error;
        }
      }
    }

    // Summary
    console.log('🎉 Device seeding completed successfully!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 SUMMARY:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ ${createdDevices.length} devices created successfully`);
    console.log(`📊 Water Leak Detectors: 2`);
    console.log(`📊 Temperature & Humidity Monitors: 2`);
    console.log(`📊 Air Quality Monitors: 2`);

    console.log('\n📝 CREATED DEVICES:');
    console.log('┌─────────────────────────────────────────────────────────────────┐');
    console.log('│ WATER LEAK DETECTORS                                           │');
    console.log('├─────────────────────────────────────────────────────────────────┤');
    console.log('│ • WL_SENSOR_001 → limbah/water_leak/1                          │');
    console.log('│ • WL_SENSOR_004 → limbah/water_leak/4                          │');
    console.log('└─────────────────────────────────────────────────────────────────┘');
    console.log('┌─────────────────────────────────────────────────────────────────┐');
    console.log('│ TEMPERATURE & HUMIDITY MONITORS                                │');
    console.log('├─────────────────────────────────────────────────────────────────┤');
    console.log('│ • TH_SENSOR_002 → limbah/temperature_humidity/2                │');
    console.log('│ • TH_SENSOR_005 → limbah/temperature_humidity/5                │');
    console.log('└─────────────────────────────────────────────────────────────────┘');
    console.log('┌─────────────────────────────────────────────────────────────────┐');
    console.log('│ AIR QUALITY MONITORS                                           │');
    console.log('├─────────────────────────────────────────────────────────────────┤');
    console.log('│ • AQ_SENSOR_003 → limbah/air_quality/3                         │');
    console.log('│ • AQ_SENSOR_006 → limbah/air_quality/6                         │');
    console.log('└─────────────────────────────────────────────────────────────────┘');

    console.log('\n⚠️  NOTES:');
    console.log('   • All devices have realistic sensor data in lastPayload');
    console.log('   • MQTT topics follow the pattern: limbah/{sensor_type}/{id}');
    console.log('   • Devices can be used in Layout 2D for process flow visualization');
    console.log('   • You can modify device data through the dashboard or MQTT publishing\n');

  } catch (error) {
    console.error('❌ Error during device seeding:', error);

    if (error.code === 'P2002') {
      console.error('   Unique constraint violation - device with this uniqId may already exist');
    } else if (error.code === 'P2025') {
      console.error('   Record not found error');
    } else if (error.code === 'P1001') {
      console.error('   Database connection error - please check your DATABASE_URL');
    }

    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n⚠️  Received SIGINT, shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n⚠️  Received SIGTERM, shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', async (error) => {
  console.error('❌ Unhandled promise rejection:', error);
  await prisma.$disconnect();
  process.exit(1);
});

// Run the seeder
if (require.main === module) {
  seedDevices();
}

module.exports = { seedDevices };