const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedMenuPresets() {
  console.log('📋 Seeding menu presets...');

  try {
    // Get admin user for createdBy
    const adminUser = await prisma.user.findFirst({
      where: { email: 'admin@gmail.com' }
    });

    if (!adminUser) {
      throw new Error('Admin user not found. Please run user seeding first.');
    }

    // Get all menu groups and items to map names to IDs
    const allGroups = await prisma.menuGroup.findMany({
      select: { id: true, name: true }
    });
    const allItems = await prisma.menuItem.findMany({
      select: { id: true, name: true, menuGroupId: true }
    });

    const groupIdMap = new Map(allGroups.map(g => [g.name, g.id]));
    const itemIdMap = new Map(allItems.map(i => [i.name, i.id]));

    console.log(`📋 Loaded ${allGroups.length} menu groups and ${allItems.length} menu items`);

    // Define menu preset data using names instead of hardcoded IDs
    const rawMenuPresetsData = [
      {
        id: "cmh1qu812000pgvvf9rnrhhnu",
        name: "Node",
        description: "",
        icon: "Menu",
        isActive: false,
        isSystem: false,
        selectedGroupNames: [
          "dashboard",
          "devices",
          "network",
          "monitoring",
          "control",
          "analytics",
          "security",
          "security_access",
          "lorawan",
          "management",
          "maintenance"
        ],
        selectedItemNames: [
          "dashboard-overview",
          "dashboard-layout2d",
          "devices-external",
          "logging-configs",
          "network-mqtt-broker",
          "network-communication-setup",
          "network-register-snmp",
          "info-system-info",
          "control-manual",
          "control-schedule",
          "control-logic",
          "control-unified",
          "control-value",
          "control-voice",
          "alarms-alarm-management",
          "alarms-alarm-log-reports",
          "analytics-devices-log-report",
          "lorawan-gateways",
          "lorawan-applications",
          "lorawan-device-profiles",
          "lorawan-device-list",
          "lorawan-ec25-modem",
          "system-user-management",
          "system-tenant-management",
          "system-node-locations",
          "system-menu-management",
          "maintenance-schedule-management",
          "security-access-control",
          "security-surveillance-cctv",
          "vpn-openvpn",
          "vpn-wireguard"
        ]
      },

      {
        id: "cmh1qs5tb0000gvvf8vxmlx2w",
        name: "Server",
        description: "",
        icon: "Menu",
        isActive: false,
        isSystem: false,
        selectedGroupNames: [
          "dashboard",
          "network",
          "monitoring",
          "analytics",
          "security_access",
          "lorawan",
          "maintenance"
        ],
        selectedItemNames: [
          "dashboard-overview",
          "devices-internal",
          "network-mqtt-broker",
          "network-communication-setup",
          "network-register-snmp",
          "info-system-info",
          "control-manual",
          "alarms-alarm-log-reports",
          "lorawan-applications",
          "lorawan-device-profiles",
          "lorawan-device-list",
          "lorawan-ec25-modem",
          "system-user-management",
          "system-menu-management",
          "system-menu-presets",
          "security-surveillance-cctv",
          "vpn-openvpn"
        ]
      },

      {
        id: "cmh1r5xri001xgvvfb59t8h1s",
        name: "Water Waste",
        description: "",
        icon: "Menu",
        isActive: true,
        isSystem: false,
        selectedGroupNames: [
          "dashboard",
          "devices",
          "network",
          "analytics",
          "security_access",
          "management",
          "maintenance"
        ],
        selectedItemNames: [
          "dashboard-overview",
          "dashboard-layout2d",
          "devices-external",
          "logging-configs",
          "network-mqtt-broker",
          "network-communication-setup",
          "alarms-alarm-management",
          "alarms-alarm-log-reports",
          "analytics-devices-log-report",
          "system-menu-management",
          "system-user-management",
          "maintenance-schedule-management",
          "security-surveillance-cctv",
          "vpn-openvpn",
          "vpn-wireguard"
        ]
      }
    ];

    // Check for missing groups
    const missingGroups = [];
    for (const preset of rawMenuPresetsData) {
      for (const groupName of preset.selectedGroupNames) {
        if (!groupIdMap.has(groupName)) {
          missingGroups.push(groupName);
        }
      }
    }

    // Check for missing items
    const missingItems = [];
    for (const preset of rawMenuPresetsData) {
      for (const itemName of preset.selectedItemNames) {
        if (!itemIdMap.has(itemName)) {
          missingItems.push(itemName);
        }
      }
    }

    if (missingGroups.length > 0) {
      console.error('❌ Missing menu groups:', missingGroups);
      throw new Error(`Missing menu groups: ${missingGroups.join(', ')}`);
    }

    if (missingItems.length > 0) {
      console.error('❌ Missing menu items:', missingItems);
      throw new Error(`Missing menu items: ${missingItems.join(', ')}`);
    }

    // Convert raw menu preset data to use actual IDs instead of names
    const menuPresetsData = rawMenuPresetsData.map(preset => ({
      ...preset,
      selectedGroups: preset.selectedGroupNames.map(name => groupIdMap.get(name)),
      selectedItems: preset.selectedItemNames.map(name => itemIdMap.get(name))
    }));

    // Process each menu preset
    for (const presetData of menuPresetsData) {
      // Create or update menu preset
      const preset = await prisma.menuPreset.upsert({
        where: { id: presetData.id },
        update: {
          name: presetData.name,
          description: presetData.description,
          icon: presetData.icon,
          isActive: presetData.isActive,
          isSystem: presetData.isSystem,
        },
        create: {
          id: presetData.id,
          name: presetData.name,
          description: presetData.description,
          icon: presetData.icon,
          isActive: presetData.isActive,
          isSystem: presetData.isSystem,
          createdBy: adminUser.id,
        },
      });

      console.log(`📋 Creating menu preset: ${preset.name} (${preset.id})`);

      // Clear existing selected groups and items for this preset (for update case)
      await prisma.menuPresetGroup.deleteMany({
        where: { presetId: preset.id }
      });

      await prisma.menuPresetItem.deleteMany({
        where: { presetId: preset.id }
      });

      // Create selected groups
      for (const groupId of presetData.selectedGroups) {
        await prisma.menuPresetGroup.create({
          data: {
            id: undefined, // Auto-generate
            presetId: preset.id,
            groupId: groupId,
          },
        });
      }

      // Create selected items
      for (const itemId of presetData.selectedItems) {
        await prisma.menuPresetItem.create({
          data: {
            id: undefined, // Auto-generate
            presetId: preset.id,
            itemId: itemId,
          },
        });
      }

      console.log(`   ✅ ${presetData.selectedGroups.length} groups and ${presetData.selectedItems.length} items selected`);
    }

    console.log(`✅ Menu presets seeded successfully - ${menuPresetsData.length} presets created`);

  } catch (error) {
    console.error('❌ Error seeding menu presets:', error);
    throw error;
  }
}

// Export for use in other scripts
module.exports = {
  seedMenuPresets,
  default: seedMenuPresets
};

// Run if called directly
if (require.main === module) {
  seedMenuPresets()
    .then(() => {
      console.log('📋 Menu presets seeding completed!');
    })
    .catch((error) => {
      console.error('❌ Menu presets seeding failed:', error);
      process.exit(1);
    })
    .finally(() => {
      prisma.$disconnect();
    });
}
