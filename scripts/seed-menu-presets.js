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

    // Menu presets data from TASK.md
    const menuPresetsData = [
      {
        id: "cmh1qu812000pgvvf9rnrhhnu",
        name: "Node",
        description: "",
        icon: "Menu",
        isActive: false,
        isSystem: false,
        selectedGroups: [
          "cmh1n7t100011gvi3hhlbkpyp", // dashboard
          "cmh1n7t160012gvi3p7ybrc6h", // devices
          "cmh1n7t1c0013gvi3q147z737", // network
          "cmh1n7t1i0014gvi33vypp5jm", // monitoring
          "cmh1n7t1u0016gvi33ttibgk7", // control
          "cmh1n7t1z0017gvi3ifxqshvv", // analytics
          "cmh1n7t250018gvi3grm4ko4u", // security
          "cmh1n7t2b0019gvi3nmgktsja", // security_access
          "cmh1n7t2m001bgvi3zf39d6uu", // lorawan
          "cmh1n7t2s001cgvi3rr0t15jw", // administration
          "cmh1n7t2x001dgvi34t7geyl4"  // maintenance
        ],
        selectedItems: [
          "cmh1n7t33001fgvi37pmaicqa", // dashboard-overview
          "cmh1n7t3p001ngvi3510lhh9o", // dashboard-layout2d
          "cmh1n7t4z0023gvi3lhk1sq3u", // devices-external
          "cmh1n7t5h002bgvi3ahpmclue", // logging-configs
          "cmh1n7t5z002jgvi3naesro4y", // network-mqtt-broker
          "cmh1n7t87003fgvi36wlyxzvb", // network-communication-setup
          "cmh1n7t8u003ngvi3f0k0uqcy", // network-register-snmp
          "cmh1n7t9i003vgvi3ow8o7e45", // info-system-info
          "cmh1n7tar004bgvi3rrlvi5ac", // control-manual
          "cmh1n7tbe004jgvi3n610gn5u", // control-schedule
          "cmh1n7tc1004rgvi3esklrwd8", // control-logic
          "cmh1n7tco004zgvi3ulybt4wc", // control-unified
          "cmh1n7tdd0057gvi317m2br6q", // control-value
          "cmh1n7te1005fgvi367kggzhw", // control-voice
          "cmh1n7ter005ngvi3f0avovu5", // deployment-sensors
          "cmh1n7tfg005vgvi3cu1hqbe5", // alarms-alarm-management
          "cmh1n7tg40063gvi3g318r1ts", // alarms-alarm-log-reports
          "cmh1n7tgt006bgvi3zkbgeaqe", // analytics-devices-log-report
          "cmh1n7thi006jgvi3lnbhp2v4", // lorawan-gateways
          "cmh1n7ti4006rgvi3jifw2306", // lorawan-applications
          "cmh1n7tir006zgvi3e9jnfaxb", // lorawan-device-profiles
          "cmh1n7tjd0077gvi3hphq7r7f", // lorawan-device-list
          "cmh1n7tnt008jgvi34fjdh11d", // lorawan-ec25-modem
          "cmh1n7toh008rgvi3phccr2nj", // system-user-management
          "cmh1n7tp6008zgvi3joea5c96", // system-tenant-management
          "cmh1n7tpv0097gvi39veq48zw", // system-node-locations
          "cmh1n7tqj009fgvi3i80171k0", // system-menu-management
          "cmh1n7tr6009ngvi3h97tktuz", // maintenance-schedule-management
          "cmh1n7tsd00a3gvi35cz1so98", // security-access-control
          "cmh1n7tsv00abgvi3kcxzsp67", // security-surveillance-cctv
          "cmh1n7ttc00ajgvi3gmpytldq", // vpn-openvpn
          "cmh1n7ttu00argvi3n8cx44ub"  // vpn-wireguard
        ]
      },
      {
        id: "cmh1qs5tb0000gvvf8vxmlx2w",
        name: "Server",
        description: "",
        icon: "Menu",
        isActive: false,
        isSystem: false,
        selectedGroups: [
          "cmh1n7t100011gvi3hhlbkpyp", // dashboard
          "cmh1n7t1c0013gvi3q147z737", // network
          "cmh1n7t1i0014gvi33vypp5jm", // monitoring
          "cmh1n7t1z0017gvi3ifxqshvv", // analytics
          "cmh1n7t2b0019gvi3nmgktsja", // security_access
          "cmh1n7t2m001bgvi3zf39d6uu", // lorawan
          "cmh1n7t2x001dgvi34t7geyl4"  // maintenance
        ],
        selectedItems: [
          "cmh1n7t33001fgvi37pmaicqa", // dashboard-overview
          "cmh1n7t4c001vgvi3aadbaain", // devices-internal
          "cmh1n7t5h002bgvi3ahpmclue", // network-mqtt-broker
          "cmh1n7t5z002jgvi3naesro4y", // network-communication-setup
          "cmh1n7t87003fgvi36wlyxzvb", // network-register-snmp
          "cmh1n7t8u003ngvi3f0k0uqcy", // info-system-info
          "cmh1n7t9i003vgvi3ow8o7e45", // control-manual
          "cmh1n7tg40063gvi3g318r1ts", // alarms-alarm-log-reports
          "cmh1n7ti4006rgvi3jifw2306", // lorawan-applications
          "cmh1n7tir006zgvi3e9jnfaxb", // lorawan-device-profiles
          "cmh1n7tjd0077gvi3hphq7r7f", // lorawan-device-list
          "cmh1n7tnt008jgvi34fjdh11d", // lorawan-ec25-modem
          "cmh1n7toh008rgvi3phccr2nj", // system-user-management
          "cmh1n7tqj009fgvi3i80171k0", // system-menu-management
          "cmh1n7trt009vgvi3z2cunuwt", // system-menu-presets
          "cmh1n7tsv00abgvi3kcxzsp67", // security-surveillance-cctv
          "cmh1n7ttc00ajgvi3gmpytldq"  // vpn-openvpn
        ]
      },
      {
        id: "cmh1r5xri001xgvvfb59t8h1s",
        name: "Water Waste",
        description: "",
        icon: "Menu",
        isActive: false,
        isSystem: false,
        selectedGroups: [
          "cmh1n7t100011gvi3hhlbkpyp", // dashboard
          "cmh1n7t1c0013gvi3q147z737", // network
          "cmh1n7t1i0014gvi33vypp5jm", // monitoring
          "cmh1n7t1z0017gvi3ifxqshvv", // analytics
          "cmh1n7t2b0019gvi3nmgktsja", // security_access
          "cmh1n7t2m001bgvi3zf39d6uu", // lorawan
          "cmh1n7t2s001cgvi3rr0t15jw", // administration
          "cmh1n7t2x001dgvi34t7geyl4"  // maintenance
        ],
        selectedItems: [
          "cmh1n7t33001fgvi37pmaicqa", // dashboard-overview
          "cmh1n7t3p001ngvi3510lhh9o", // dashboard-layout2d
          "cmh1n7t5h002bgvi3ahpmclue", // logging-configs
          "cmh1n7t5z002jgvi3naesro4y", // network-mqtt-broker
          "cmh1n7t87003fgvi36wlyxzvb", // network-communication-setup
          "cmh1n7t8u003ngvi3f0k0uqcy", // info-system-info
          "cmh1n7ter005ngvi3f0avovu5", // alarms-alarm-log-reports
          "cmh1n7tfg005vgvi3cu1hqbe5", // analytics-devices-log-report
          "cmh1n7tg40063gvi3g318r1ts", // lorawan-gateways
          "cmh1n7ti4006rgvi3jifw2306", // lorawan-applications
          "cmh1n7tir006zgvi3e9jnfaxb", // lorawan-device-profiles
          "cmh1n7tjd0077gvi3hphq7r7f", // lorawan-device-list
          "cmh1n7tnt008jgvi34fjdh11d", // lorawan-ec25-modem
          "cmh1n7tqj009fgvi3i80171k0", // system-menu-management
          "cmh1n7tr6009ngvi3h97tktuz", // maintenance-schedule-management
          "cmh1n7tsv00abgvi3kcxzsp67", // security-surveillance-cctv
          "cmh1n7ttc00ajgvi3gmpytldq", // vpn-openvpn
          "cmh1n7ttu00argvi3n8cx44ub"  // vpn-wireguard
        ]
      }
    ];

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
