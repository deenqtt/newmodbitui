const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedMqttConfigurations() {
  console.log('📡 Seeding MQTT configurations...');

  try {
    // Default MQTT configurations for development and production
    const mqttConfigurations = [
      {
        name: 'Development MQTT Broker',
        brokerUrl: 'ws://localhost:9000',
        username: null, // No auth for local development
        password: null, // No auth for local development
        isActive: false, // Not active by default
        enable: true,   // Enabled for use
      },
      {
        name: 'Production IoT Hub',
        brokerUrl: 'wss://mqttws.iotech.my.id:443/mqtt',
        username: 'iotuser',
        password: 'iotpass',
        isActive: true, // Active by default for production
        enable: true,
      },
      {
        name: 'Local Secure MQTT',
        brokerUrl: 'wss://localhost:8883',
        username: null,
        password: null,
        isActive: false,
        enable: true,
      },
    ];

    // Count created/updated configs
    let created = 0;
    let updated = 0;

    for (const config of mqttConfigurations) {
      try {
        const existing = await prisma.mQTTConfiguration.findUnique({
          where: { name: config.name },
        });

        if (existing) {
          // Update existing configuration
          await prisma.mQTTConfiguration.update({
            where: { id: existing.id },
            data: {
              brokerUrl: config.brokerUrl,
              username: config.username,
              password: config.password,
              isActive: config.isActive,
              enable: config.enable,
              updatedAt: new Date(),
            },
          });
          updated++;
          console.log(`   ↻ Updated: ${config.name}`);
        } else {
          // Create new configuration
          await prisma.mQTTConfiguration.create({
            data: config,
          });
          created++;
          console.log(`   ➕ Created: ${config.name}`);
        }
      } catch (error) {
        console.error(`❌ Failed to process ${config.name}:`, error.message);
      }
    }

    console.log('✅ MQTT configurations seeded successfully');
    console.log(`   - ${created} new configurations created`);
    console.log(`   - ${updated} existing configurations updated`);
    console.log('');
    console.log('📋 Available MQTT Broker Configurations:');
    console.log('   1. Development MQTT Broker: ws://localhost:9000 (No Auth)');
    console.log('   2. Production IoT Hub: wss://mqttws.iotech.my.id:443/mqtt (Auth: iotuser/iotpass)');
    console.log('   3. Local Secure MQTT: wss://localhost:8883 (No Auth)');

  } catch (error) {
    console.error('❌ Error seeding MQTT configurations:', error);

    // Provide troubleshooting information
    console.log('\n🔧 Troubleshooting:');
    console.log('   - Run "npm run prisma:generate" first if you get TypeScript errors');
    console.log('   - Run "npm run prisma:push" to sync database schema');
    console.log('   - Check if MQTTConfiguration table exists in database');

    throw error;
  }
}

// Export for use in other scripts
module.exports = {
  seedMqttConfigurations,
  default: seedMqttConfigurations
};

// Run if called directly
if (require.main === module) {
  seedMqttConfigurations()
    .then(() => {
      console.log('📡 MQTT configurations seeding completed successfully!');
    })
    .catch((error) => {
      console.error('❌ MQTT configurations seeding failed:', error);
      process.exit(1);
    })
    .finally(() => {
      prisma.$disconnect();
    });
}
