const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');
const { seedUsers } = require('./seed-users');
const { seedMenu } = require('./seed-menu');
const { seedMenuPresets } = require('./seed-menu-presets');
const { seedDashboard } = require('./seed-dashboard');
const { seedDevices } = require('./seed-devices');
const { seedLayout2D } = require('./seed-layout2d');
const { seedLoggingConfigs } = require('./seed-logging-configs');
const { seedMaintenance } = require('./seed-maintenance');
const { seedAlarmConfigsAndLogs } = require('./seed-alarm-configs');

const prisma = new PrismaClient();

// Configuration - dapat di-enable/disable per module
const SEED_CONFIG = {
  ENABLE_USERS: process.env.SEED_USERS !== 'false', // Default: true
  ENABLE_MENU: process.env.SEED_MENU !== 'false',  // Default: true
  ENABLE_MENU_PRESETS: process.env.SEED_MENU_PRESETS !== 'false', // Default: true
  ENABLE_DASHBOARD: process.env.SEED_DASHBOARD !== 'false', // Default: true
  ENABLE_DEVICES: process.env.SEED_DEVICES !== 'false', // Default: true
  ENABLE_LAYOUT2D: process.env.SEED_LAYOUT2D !== 'false', // Default: true
  ENABLE_LOGGING_CONFIGS: process.env.SEED_LOGGING_CONFIGS !== 'false', // Default: true
  ENABLE_MAINTENANCE: process.env.SEED_MAINTENANCE !== 'false', // Default: true
  ENABLE_ALARM_CONFIGS: process.env.SEED_ALARM_CONFIGS !== 'false', // Default: true
  RESET_DATABASE: process.env.RESET_DB !== 'false', // Default: true
  FORCE_PRISMA_GENERATE: process.env.FORCE_GENERATE !== 'false', // Default: true
};

function runCommand(command, description) {
  try {
    console.log(`🔧 ${description}...`);
    execSync(command, { stdio: 'inherit' });
    console.log(`✅ ${description} completed`);
    return true;
  } catch (error) {
    console.error(`❌ ${description} failed:`, error.message);
    return false;
  }
}

async function seedInit() {
  console.log('🚀 Starting modular database seeding...\n');

  console.log('📋 Seeding Configuration:');
  console.log(`   - Users: ${SEED_CONFIG.ENABLE_USERS ? 'ENABLED' : 'DISABLED'}`);
  console.log(`   - Menu: ${SEED_CONFIG.ENABLE_MENU ? 'ENABLED' : 'DISABLED'}`);
  console.log(`   - Menu Presets: ${SEED_CONFIG.ENABLE_MENU_PRESETS ? 'ENABLED' : 'DISABLED'}`);
  console.log(`   - Dashboard: ${SEED_CONFIG.ENABLE_DASHBOARD ? 'ENABLED' : 'DISABLED'}`);
  console.log(`   - Devices: ${SEED_CONFIG.ENABLE_DEVICES ? 'ENABLED' : 'DISABLED'}`);
  console.log(`   - Layout 2D: ${SEED_CONFIG.ENABLE_LAYOUT2D ? 'ENABLED' : 'DISABLED'}`);
  console.log(`   - Logging Configs: ${SEED_CONFIG.ENABLE_LOGGING_CONFIGS ? 'ENABLED' : 'DISABLED'}`);
  console.log(`   - Alarm Configs: ${SEED_CONFIG.ENABLE_ALARM_CONFIGS ? 'ENABLED' : 'DISABLED'}`);
  console.log(`   - Maintenance: ${SEED_CONFIG.ENABLE_MAINTENANCE ? 'ENABLED' : 'DISABLED'}`);
  console.log(`   - Reset DB: ${SEED_CONFIG.RESET_DATABASE ? 'ENABLED' : 'DISABLED'}`);
  console.log(`   - Force Generate: ${SEED_CONFIG.FORCE_PRISMA_GENERATE ? 'ENABLED' : 'DISABLED'}\n`);

  const steps = [];

  // Database Reset (optional)
  if (SEED_CONFIG.RESET_DATABASE) {
    steps.push(
      () => runCommand('npx prisma migrate reset --force --skip-generate', 'Database reset')
    );
  }

  // Prisma Generate (optional)
  if (SEED_CONFIG.FORCE_PRISMA_GENERATE) {
    steps.push(
      () => runCommand('npx prisma generate', 'Prisma client generation')
    );
  }

  // Seed Users (optional)
  if (SEED_CONFIG.ENABLE_USERS) {
    steps.push(async () => {
      console.log('👥 Starting user seeding...');
      await seedUsers();
      console.log('✅ User seeding completed');
      return true;
    });
  }

  // Seed Menu (optional)
  if (SEED_CONFIG.ENABLE_MENU) {
    steps.push(async () => {
      console.log('📋 Starting menu seeding...');
      await seedMenu();
      console.log('✅ Menu seeding completed');
      return true;
    });
  }

  // Seed Menu Presets (optional)
  if (SEED_CONFIG.ENABLE_MENU_PRESETS) {
    steps.push(async () => {
      console.log('📋 Starting menu presets seeding...');
      await seedMenuPresets();
      console.log('✅ Menu presets seeding completed');
      return true;
    });
  }

  // Seed Devices (optional)
  if (SEED_CONFIG.ENABLE_DEVICES) {
    steps.push(async () => {
      console.log('📱 Starting device seeding...');
      await seedDevices();
      console.log('✅ Device seeding completed');
      return true;
    });
  }

  // Seed Layout 2D (optional)
  if (SEED_CONFIG.ENABLE_LAYOUT2D) {
    steps.push(async () => {
      console.log('📟 Starting Layout 2D seeding...');
      await seedLayout2D();
      console.log('✅ Layout 2D seeding completed');
      return true;
    });
  }

  // Seed Dashboard (optional)
  if (SEED_CONFIG.ENABLE_DASHBOARD) {
    steps.push(async () => {
      console.log('📊 Starting dashboard seeding...');
      await seedDashboard();
      console.log('✅ Dashboard seeding completed');
      return true;
    });
  }

  // Seed Logging Configs (optional)
  if (SEED_CONFIG.ENABLE_LOGGING_CONFIGS) {
    steps.push(async () => {
      console.log('📈 Starting logging configurations seeding...');
      await seedLoggingConfigs();
      console.log('✅ Logging configurations seeding completed');
      return true;
    });
  }

  // Seed Alarm Configs (optional)
  if (SEED_CONFIG.ENABLE_ALARM_CONFIGS) {
    steps.push(async () => {
      console.log('🚨 Starting alarm configurations seeding...');
      await seedAlarmConfigsAndLogs();
      console.log('✅ Alarm configurations seeding completed');
      return true;
    });
  }

  // Seed Maintenance (optional)
  if (SEED_CONFIG.ENABLE_MAINTENANCE) {
    steps.push(async () => {
      console.log('🔧 Starting maintenance seeding...');
      await seedMaintenance();
      console.log('✅ Maintenance seeding completed');
      return true;
    });
  }

  // Execute all enabled steps
  for (const step of steps) {
    if (!await step()) {
      console.error('❌ Seeding failed');
      process.exit(1);
    }
    console.log(''); // Add spacing
  }

  console.log('🎉 Modular seeding completed successfully!');
  console.log('\n📝 Summary of seeded modules:');

  if (SEED_CONFIG.ENABLE_USERS) {
    console.log('   ✅ Users & Roles seeded');
    console.log('      - ADMIN: admin@gmail.com / admin123');
    console.log('      - USER: user@gmail.com / user123');
    console.log('      - DEVELOPER: developer@gmail.com / dev123');
  } else {
    console.log('   ⚪ Users seeding skipped (disabled)');
  }

  if (SEED_CONFIG.ENABLE_MENU) {
    console.log('   ✅ Menu System seeded (70+ menu items)');
    console.log('      - 11 Menu Groups');
    console.log('      - Role-based permissions');
    console.log('      - Admin Menu Management');
  } else {
    console.log('   ⚪ Menu seeding skipped (disabled)');
  }

  if (SEED_CONFIG.ENABLE_MENU_PRESETS) {
    console.log('   ✅ Menu Presets seeded (3 presets)');
    console.log('      - "Node" preset: 11 groups, 32 items (full access)');
    console.log('      - "Server" preset: 7 groups, 17 items (server focus)');
    console.log('      - "Water Waste" preset: 8 groups, 18 items (waste water monitoring)');
    console.log('      - Ready for menu preset management in admin panel');
  } else {
    console.log('   ⚪ Menu presets seeding skipped (disabled)');
  }

  if (SEED_CONFIG.ENABLE_DASHBOARD) {
    console.log('   ✅ Dashboard Layout seeded');
    console.log('      - Pre-configured dashboard with 11 monitoring widgets');
    console.log('      - Flow meters, PH sensors, temperature monitoring');
    console.log('      - Multi-series charts and navigation shortcuts');
    console.log('      - Ready-to-use for IoT wastewater monitoring');
  } else {
    console.log('   ⚪ Dashboard seeding skipped (disabled)');
  }

  if (SEED_CONFIG.ENABLE_DEVICES) {
    console.log('   ✅ IoT Devices seeded (11 devices)');
    console.log('      - 3 pH Sensors (addresses 1, 2, 5)');
    console.log('      - 2 Water Flow meters');
    console.log('      - 2 Air Quality stations');
    console.log('      - 2 Temp/Humidity sensors');
    console.log('      - 2 Vibration sensors');
  } else {
    console.log('   ⚪ Device seeding skipped (disabled)');
  }

  if (SEED_CONFIG.ENABLE_LAYOUT2D) {
    console.log('   ✅ Layout 2D seeded (1 layout)');
    console.log('      - "IoT-Based Wastewater Treatment Monitoring System" (isUse: true)');
    console.log('      - Background Image: /images/Diagram WTP.png');
    console.log('      - Ready for data point configuration');
  } else {
    console.log('   ⚪ Layout 2D seeding skipped (disabled)');
  }

  if (SEED_CONFIG.ENABLE_LOGGING_CONFIGS) {
    console.log('   ✅ Logging Configurations seeded (8 configurations)');
    console.log('      - 4 Flow monitoring configs (rates and totals)');
    console.log('      - 2 PH sensor configs (pH levels)');
    console.log('      - 2 Temperature monitoring configs');
    console.log('      - Ready for chart visualization and data logging');
  } else {
    console.log('   ⚪ Logging configurations seeding skipped (disabled)');
  }

  if (SEED_CONFIG.ENABLE_ALARM_CONFIGS) {
    console.log('   ✅ Alarm Configurations seeded (19 configurations + 8 demo logs)');
    console.log('      - 10 Critical alarms (threshold-based)');
    console.log('      - 6 Major alarms (mid-level alerts)');
    console.log('      - 3 Minor alarms (warning level)');
    console.log('      - 1 Bit value alarm (digital status)');
    console.log('      - Demo alarm logs for testing dashboard widgets');
  } else {
    console.log('   ⚪ Alarm configurations seeding skipped (disabled)');
  }

  if (SEED_CONFIG.ENABLE_MAINTENANCE) {
    console.log('   ✅ Maintenance seeded (2 scheduled tasks)');
    console.log('      - PH Sensor maintenance schedules');
    console.log('      - Weekly maintenance cycles');
    console.log('      - Assigned to regular users');
  } else {
    console.log('   ⚪ Maintenance seeding skipped (disabled)');
  }

  if (!SEED_CONFIG.ENABLE_USERS && !SEED_CONFIG.ENABLE_MENU && !SEED_CONFIG.ENABLE_DASHBOARD && !SEED_CONFIG.ENABLE_DEVICES && !SEED_CONFIG.ENABLE_LAYOUT2D && !SEED_CONFIG.ENABLE_LOGGING_CONFIGS && !SEED_CONFIG.ENABLE_ALARM_CONFIGS && !SEED_CONFIG.ENABLE_MAINTENANCE) {
    console.log('   ⚠️  No seeding modules were enabled');
  }

  console.log('\n💡 Control seeding with environment variables:');
  console.log('   SEED_USERS=false         # Disable user seeding');
  console.log('   SEED_MENU=false          # Disable menu seeding');
  console.log('   SEED_MENU_PRESETS=false  # Disable menu presets seeding');
  console.log('   SEED_DASHBOARD=false     # Disable dashboard seeding');
  console.log('   SEED_DEVICES=false       # Disable device seeding');
  console.log('   SEED_LAYOUT2D=false      # Disable Layout 2D seeding');
  console.log('   SEED_LOGGING_CONFIGS=false # Disable logging configs seeding');
  console.log('   SEED_ALARM_CONFIGS=false # Disable alarm configurations seeding');
  console.log('   SEED_MAINTENANCE=false   # Disable maintenance seeding');
  console.log('   RESET_DB=false           # Disable database reset');
  console.log('   FORCE_GENERATE=false     # Skip Prisma generation');
}

// Export functions for external use
module.exports = {
  seedInit,
  default: seedInit,

  // Export individual seeders
  seedUsers,
  seedMenu,
  seedMenuPresets,
  seedDashboard,
  seedDevices,
  seedLayout2D,
  seedLoggingConfigs,
  seedMaintenance,
  seedAlarmConfigsAndLogs,

  // Export config
  SEED_CONFIG
};

// Run if called directly
if (require.main === module) {
  seedInit()
    .then(() => {
      console.log('\n✅ All seeding operations completed successfully!');
    })
    .catch((error) => {
      console.error('\n❌ Seeding failed:', error);
      process.exit(1);
    })
    .finally(() => {
      prisma.$disconnect();
    });
}
