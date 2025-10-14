const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedDashboard() {
  console.log('📊 Seeding dashboard layout data...');

  try {
    // Get the first admin user or any user to create dashboard for
    const user = await prisma.user.findFirst({
      where: {
        role_data: {
          name: 'ADMIN'
        }
      }
    });

    if (!user) {
      console.log('⚠️ No admin user found. Skipping dashboard seeding.');
      console.log('   Make sure to run user seeding first: SEED_USERS=true');
      return true; // Return true to not fail the seeding process
    }

    console.log(`   Found admin user: ${user.email} (ID: ${user.id})`);

    // Check if dashboard already exists for this user
    const existingDashboard = await prisma.dashboardLayout.findFirst({
      where: {
        userId: user.id,
        name: 'Default Dashboard'
      }
    });

    if (existingDashboard) {
      console.log(`   📊 Dashboard "Default Dashboard" already exists for user ${user.email}`);
      console.log(`   ID: ${existingDashboard.id}`);
      return true;
    }

    // Create default dashboard layout (empty layout)
    const dashboardLayout = {
      name: 'Default Dashboard',
      userId: user.id,
      layout: [], // Empty layout, no default widgets
      inUse: true,
      isActive: true
    };

    const createdDashboard = await prisma.dashboardLayout.create({
      data: dashboardLayout
    });

    console.log('   ✅ Created dashboard layout:');
    console.log(`      Name: ${createdDashboard.name}`);
    console.log(`      ID: ${createdDashboard.id}`);
    console.log(`      User: ${createdDashboard.userId}`);
    console.log(`      Widgets: ${dashboardLayout.layout.length}`);
    console.log(`      In Use: ${createdDashboard.inUse}`);
    console.log(`      Active: ${createdDashboard.isActive ? 'Yes' : 'No'}`);

    return true;
  } catch (error) {
    console.error('❌ Error seeding dashboard:', error.message);
    console.error('   Stack:', error.stack);
    return false;
  }
}

async function cleanupDashboard() {
  console.log('🧹 Cleaning up dashboard data...');

  try {
    // Remove all dashboard layouts with error handling
    const deletedDashboards = await prisma.dashboardLayout.deleteMany();
    console.log(`   🗑️ Deleted ${deletedDashboards.count} dashboard layouts`);

    return true;
  } catch (error) {
    console.error('❌ Error cleaning up dashboard:', error.message);
    return false;
  }
}

// Export functions
module.exports = {
  seedDashboard,
  cleanupDashboard,
  default: seedDashboard
};

// Run if called directly
if (require.main === module) {
  const args = process.argv.slice(2);
  console.log('🌱 Starting dashboard seeding...');

  (async () => {
    if (args.includes('--cleanup')) {
      await cleanupDashboard();
    }

    seedDashboard()
      .then((success) => {
        if (success) {
          console.log('✅ Dashboard seeding completed successfully!');
        } else {
          console.error('❌ Dashboard seeding failed!');
          process.exit(1);
        }
      })
      .catch((error) => {
        console.error('❌ Unexpected error:', error);
        process.exit(1);
      })
      .finally(() => {
        prisma.$disconnect();
      });
  })();
}
