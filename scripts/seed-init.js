const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');
const { seedUsers } = require('./seed-users');
const { seedMenu } = require('./seed-menu');
const { seedDashboard } = require('./seed-dashboard');

const prisma = new PrismaClient();

// Configuration - dapat di-enable/disable per module
const SEED_CONFIG = {
  ENABLE_USERS: process.env.SEED_USERS !== 'false', // Default: true
  ENABLE_MENU: process.env.SEED_MENU !== 'false',  // Default: true
  ENABLE_DASHBOARD: process.env.SEED_DASHBOARD !== 'false', // Default: true
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
  console.log(`   - Dashboard: ${SEED_CONFIG.ENABLE_DASHBOARD ? 'ENABLED' : 'DISABLED'}`);
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

  // Seed Dashboard (optional)
  if (SEED_CONFIG.ENABLE_DASHBOARD) {
    steps.push(async () => {
      console.log('📊 Starting dashboard seeding...');
      await seedDashboard();
      console.log('✅ Dashboard seeding completed');
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

  if (SEED_CONFIG.ENABLE_DASHBOARD) {
    console.log('   ✅ Dashboard Layout seeded');
    console.log('      - Default dashboard for user ID 1');
    console.log('      - Basic widget layout');
  } else {
    console.log('   ⚪ Dashboard seeding skipped (disabled)');
  }

  if (!SEED_CONFIG.ENABLE_USERS && !SEED_CONFIG.ENABLE_MENU && !SEED_CONFIG.ENABLE_DASHBOARD) {
    console.log('   ⚠️  No seeding modules were enabled');
  }

  console.log('\n💡 Control seeding with environment variables:');
  console.log('   SEED_USERS=false       # Disable user seeding');
  console.log('   SEED_MENU=false        # Disable menu seeding');
  console.log('   SEED_DASHBOARD=false   # Disable dashboard seeding');
  console.log('   RESET_DB=false         # Disable database reset');
  console.log('   FORCE_GENERATE=false   # Skip Prisma generation');
}

// Export functions for external use
module.exports = {
  seedInit,
  default: seedInit,

  // Export individual seeders
  seedUsers,
  seedMenu,
  seedDashboard,

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
