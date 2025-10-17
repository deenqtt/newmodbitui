const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Pre-configured dashboard data dengan widget lengkap menggunakan predictable device IDs
const PRECONFIGURED_DASHBOARD = [
  {
    id: "iot-dashboard-main",
    name: "IOT Dashboard",
    layout: "[{\"w\":4,\"h\":3,\"x\":0,\"y\":0,\"i\":\"Icon-Status-Card-widget-1760673204678\",\"minW\":2,\"minH\":2,\"moved\":false,\"static\":false,\"widgetType\":\"Icon Status Card\",\"config\":{\"customName\":\"Flow Rate [ Water Flow Meter 1]\",\"deviceUniqId\":\"limbah-flow1\",\"selectedKey\":\"flow_rate\",\"multiply\":1,\"units\":\"L/s\",\"selectedIcon\":\"Zap\",\"iconColor\":\"#0084ff\",\"iconBgColor\":\"#003b99\"}},{\"w\":4,\"h\":3,\"x\":0,\"y\":3,\"i\":\"Icon-Status-Card-widget-1760673423751\",\"minW\":2,\"minH\":2,\"moved\":false,\"static\":false,\"widgetType\":\"Icon Status Card\",\"config\":{\"customName\":\"Total Flow [Water Flow 1]\",\"deviceUniqId\":\"limbah-flow1\",\"selectedKey\":\"total_flow\",\"multiply\":1,\"units\":\"L\",\"selectedIcon\":\"Droplets\",\"iconColor\":\"#0062ff\",\"iconBgColor\":\"#002b70\"}},{\"w\":4,\"h\":3,\"x\":0,\"y\":6,\"i\":\"Icon-Status-Card-widget-1760673577412\",\"minW\":2,\"minH\":2,\"moved\":false,\"static\":false,\"widgetType\":\"Icon Status Card\",\"config\":{\"customName\":\"Flow Rate [ Water Flow Meter 2]\",\"deviceUniqId\":\"limbah-flow2\",\"selectedKey\":\"flow_rate\",\"multiply\":1,\"units\":\"L/s\",\"selectedIcon\":\"Zap\",\"iconColor\":\"#47ff66\",\"iconBgColor\":\"#008a30\"}},{\"w\":4,\"h\":3,\"x\":0,\"y\":9,\"i\":\"Icon-Status-Card-widget-1760673618493\",\"minW\":2,\"minH\":2,\"moved\":false,\"static\":false,\"widgetType\":\"Icon Status Card\",\"config\":{\"customName\":\"Total Flow [Water Flow 2]\",\"deviceUniqId\":\"limbah-flow2\",\"selectedKey\":\"total_flow\",\"multiply\":1,\"units\":\"L\",\"selectedIcon\":\"Droplets\",\"iconColor\":\"#00ff59\",\"iconBgColor\":\"#005214\"}},{\"w\":4,\"h\":6,\"x\":4,\"y\":0,\"i\":\"Grouped-Icon-Status-widget-1760674294573\",\"minW\":3,\"minH\":4,\"moved\":false,\"static\":false,\"widgetType\":\"Grouped Icon Status\",\"config\":{\"title\":\"PH Sensor 1\",\"items\":[{\"customName\":\"Temp\",\"deviceUniqId\":\"limbah-ph1\",\"selectedKey\":\"temp\",\"units\":\"C\",\"multiply\":1,\"selectedIcon\":\"Thermometer\",\"iconColor\":\"#00ff59\",\"iconBgColor\":\"#006b1b\"},{\"customName\":\"PH\",\"deviceUniqId\":\"limbah-ph1\",\"selectedKey\":\"ph\",\"units\":\"\",\"multiply\":1,\"selectedIcon\":\"Droplets\",\"iconColor\":\"#00bfff\",\"iconBgColor\":\"#003b99\"}]}},{\"w\":4,\"h\":6,\"x\":4,\"y\":6,\"i\":\"Grouped-Icon-Status-widget-1760674531232\",\"minW\":3,\"minH\":4,\"moved\":false,\"static\":false,\"widgetType\":\"Grouped Icon Status\",\"config\":{\"title\":\"PH Sensor 2\",\"items\":[{\"customName\":\"Temp\",\"deviceUniqId\":\"limbah-ph2\",\"selectedKey\":\"temp\",\"units\":\"C\",\"multiply\":1,\"selectedIcon\":\"Thermometer\",\"iconColor\":\"#00ff6e\",\"iconBgColor\":\"#006b12\"},{\"customName\":\"PH\",\"deviceUniqId\":\"limbah-ph2\",\"selectedKey\":\"ph\",\"units\":\"\",\"multiply\":1,\"selectedIcon\":\"Droplets\",\"iconColor\":\"#0b95fe\",\"iconBgColor\":\"#003b99\"}]}},{\"w\":6,\"h\":9,\"x\":0,\"y\":12,\"i\":\"Multi-Series-Chart-widget-1760682757528\",\"minW\":4,\"minH\":4,\"moved\":false,\"static\":false,\"widgetType\":\"Multi-Series Chart\",\"config\":{\"widgetTitle\":\"Flow Meter\",\"timeRange\":\"24h\",\"hasAnimation\":true,\"refreshInterval\":5,\"chartType\":\"line\",\"series\":[{\"name\":\"Flow Rate 1\",\"loggingConfigId\":\"flow-rate-1\",\"color\":\"#eb80a8\"},{\"name\":\"Flow Rate 2\",\"loggingConfigId\":\"flow-rate-2\",\"color\":\"#4becd0\"}]}},{\"w\":6,\"h\":9,\"x\":6,\"y\":12,\"i\":\"Multi-Series-Chart-widget-1760682817149\",\"minW\":4,\"minH\":4,\"moved\":false,\"static\":false,\"widgetType\":\"Multi-Series Chart\",\"config\":{\"widgetTitle\":\"PH Sensor\",\"timeRange\":\"24h\",\"hasAnimation\":true,\"refreshInterval\":5,\"chartType\":\"bar\",\"series\":[{\"name\":\"PH 1\",\"loggingConfigId\":\"ph-sensor-1\",\"color\":\"#185e5d\"},{\"name\":\"PH 2\",\"loggingConfigId\":\"ph-sensor-2\",\"color\":\"#9d19ae\"}]}},{\"w\":6,\"h\":8,\"x\":0,\"y\":21,\"i\":\"Multi-Series-Chart-widget-1760682863677\",\"minW\":4,\"minH\":4,\"moved\":false,\"static\":false,\"widgetType\":\"Multi-Series Chart\",\"config\":{\"widgetTitle\":\"Temperature [PH Sensor]\",\"timeRange\":\"24h\",\"hasAnimation\":true,\"refreshInterval\":5,\"chartType\":\"line\",\"series\":[{\"name\":\"Temp 1\",\"loggingConfigId\":\"temp-sensor-1\",\"color\":\"#f5bbed\"},{\"name\":\"Temp 2\",\"loggingConfigId\":\"temp-sensor-2\",\"color\":\"#32d962\"}]}},{\"w\":6,\"h\":8,\"x\":6,\"y\":21,\"i\":\"Multi-Series-Chart-widget-1760682908091\",\"minW\":4,\"minH\":4,\"moved\":false,\"static\":false,\"widgetType\":\"Multi-Series Chart\",\"config\":{\"widgetTitle\":\"Total Flow\",\"timeRange\":\"24h\",\"hasAnimation\":true,\"refreshInterval\":5,\"chartType\":\"line\",\"series\":[{\"name\":\"Total Flow 1\",\"loggingConfigId\":\"total-flow-1\",\"color\":\"#defa1d\"},{\"name\":\"Total Flow 2\",\"loggingConfigId\":\"total-flow-2\",\"color\":\"#b91c-de\"}]}},{\"w\":4,\"h\":6,\"x\":8,\"y\":0,\"i\":\"Dashboard-Shortcut-widget-1760683809747\",\"minW\":2,\"minH\":2,\"moved\":false,\"static\":false,\"widgetType\":\"Dashboard Shortcut\",\"config\":{\"shortcutTitle\":\"Layout Monitoring Schema Water Threatment\",\"targetType\":\"custom\",\"customRoute\":\"/layout2d\"}}]",
    userId: "cmgsx5s8d0004gvt6i5hyf5wz",
    createdAt: "2025-10-16T04:27:58.753Z",
    updatedAt: "2025-10-17T06:54:57.186Z",
    inUse: true,
    isActive: true
  }
];

async function seedDashboard() {
  console.log('📊 Seeding dashboard layout data with pre-configured widgets...');

  try {
    // Get the admin user untuk assign dashboard
    const adminUser = await prisma.user.findFirst({
      where: {
        role_data: {
          name: 'ADMIN'
        }
      }
    });

    if (!adminUser) {
      console.log('⚠️ No admin user found. Skipping dashboard seeding.');
      console.log('   Make sure to run user seeding first: SEED_USERS=true');
      return true;
    }

    console.log(`   Found admin user: ${adminUser.email} (ID: ${adminUser.id})`);

    let createdCount = 0;
    let updatedCount = 0;

    // Process each pre-configured dashboard
    for (const dashboardData of PRECONFIGURED_DASHBOARD) {
      try {
        // Update userId dengan admin user yang ditemukan
        const dashboardToCreate = {
          ...dashboardData,
          userId: adminUser.id
        };

        console.log(`🔍 Processing dashboard: "${dashboardData.name}"`);

        // Use upsert untuk handle existing dashboards with predictable ID
        const dashboard = await prisma.dashboardLayout.upsert({
          where: {
            id: dashboardData.name.toLowerCase().replace(/\s+/g, '-')
          },
          update: {
            name: dashboardData.name,
            layout: dashboardData.layout,
            userId: adminUser.id,
            inUse: dashboardData.inUse,
            isActive: dashboardData.isActive,
            updatedAt: new Date()
          },
          create: dashboardToCreate
        });

        // Count operations
        const wasCreated = dashboard.createdAt.getTime() === dashboard.updatedAt.getTime();
        if (wasCreated) {
          createdCount++;
          console.log(`   ➕ Created dashboard: ${dashboard.name}`);
        } else {
          updatedCount++;
          console.log(`   📝 Updated dashboard: ${dashboard.name}`);
        }

        console.log(`      ID: ${dashboard.id}`);
        console.log(`      User: ${dashboard.userId}`);
        console.log(`      Widgets: ${JSON.parse(dashboard.layout).length} configured widgets`);
        console.log(`      In Use: ${dashboard.inUse ? '✅' : '❌'}`);
        console.log(`      Active: ${dashboard.isActive ? '✅' : '❌'}`);
        console.log('');

      } catch (dashboardError) {
        console.error(`   ❌ Error processing dashboard "${dashboardData.name}":`, dashboardError.message);
      }
    }

    console.log('📊 Dashboard seeding summary:');
    console.log(`   ✅ Created: ${createdCount} dashboards`);
    console.log(`   📝 Updated: ${updatedCount} dashboards`);
    console.log('');
    console.log('🎯 Pre-configured widgets included:');
    console.log('   📈 Flow Monitoring: Flow rates and total flow for 2 water meters');
    console.log('   🌡️  PH & Temp: Dual-parameter display for 2 PH sensors');
    console.log('   📊 Charts: Multi-series charts for flow, PH, temperature, and totalizers');
    console.log('   🔗 Shortcuts: Quick access to Layout 2D monitoring schema');

    console.log('✅ Dashboard seeding completed successfully');
    console.log('🚀 Ready-to-use dashboard with monitoring widgets available.');

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
