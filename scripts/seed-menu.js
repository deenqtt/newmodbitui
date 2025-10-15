const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedMenu() {
  console.log('📋 Seeding menu system...');

  try {
    // Create permissions
    const permissions = [
      { name: 'menu.view', description: 'View menu items', resource: 'menu', action: 'view' },
      { name: 'menu.create', description: 'Create menu items', resource: 'menu', action: 'create' },
      { name: 'menu.update', description: 'Update menu items', resource: 'menu', action: 'update' },
      { name: 'menu.delete', description: 'Delete menu items', resource: 'menu', action: 'delete' },
    ];

    for (const perm of permissions) {
      await prisma.permission.upsert({
        where: { name: perm.name },
        update: {},
        create: perm,
      });
    }

    // Get roles (assuming they exist from user seeding)
    const adminRole = await prisma.role.findUnique({ where: { name: 'ADMIN' } });
    const userRole = await prisma.role.findUnique({ where: { name: 'USER' } });
    const developerRole = await prisma.role.findUnique({ where: { name: 'DEVELOPER' } });

    if (!adminRole || !userRole || !developerRole) {
      throw new Error('Roles not found. Please run user seeding first.');
    }

    // Assign permissions to roles
    const allPermissions = await prisma.permission.findMany();
    for (const perm of allPermissions) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: adminRole.id,
            permissionId: perm.id,
          },
        },
        update: {},
        create: {
          roleId: adminRole.id,
          permissionId: perm.id,
        },
      });
    }

    // Assign menu permissions to user role
    const menuPermissions = await prisma.permission.findMany({
      where: { resource: 'menu' },
    });
    for (const perm of menuPermissions) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: userRole.id,
            permissionId: perm.id,
          },
        },
        update: {},
        create: {
          roleId: userRole.id,
          permissionId: perm.id,
        },
      });
    }

    // Assign developer permissions
    for (const perm of menuPermissions) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: developerRole.id,
            permissionId: perm.id,
          },
        },
        update: {},
        create: {
          roleId: developerRole.id,
          permissionId: perm.id,
        },
      });
    }

    // Create menu groups with isActive and isDeveloper flags
    const menuGroups = [
      { name: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard', order: 0, isActive: true },
      { name: 'control', label: 'Control', icon: 'Sliders', order: 1, isActive: true },
      { name: 'devices', label: 'Devices', icon: 'Cpu', order: 2, isActive: true },
      { name: 'network', label: 'Network', icon: 'Network', order: 3, isActive: true },
      { name: 'security', label: 'Security', icon: 'Shield', order: 4, isActive: true },
      { name: 'lorawan', label: 'LoRaWAN', icon: 'Radio', order: 5, isActive: true },
      { name: 'payload', label: 'Payload', icon: 'FileText', order: 6, isActive: true, isDeveloper: true },
      { name: 'system', label: 'System Config', icon: 'Settings', order: 7, isActive: true, isDeveloper: true },
      { name: 'analytics', label: 'Analytics', icon: 'BarChart3', order: 8, isActive: true },
      { name: 'maintenance', label: 'Maintenance', icon: 'Wrench', order: 9, isActive: true },
      { name: 'tools', label: 'Tools', icon: 'Tool', order: 10, isActive: true, isDeveloper: true },
    ];

    const createdMenuGroups = {};
    for (const group of menuGroups) {
      const created = await prisma.menuGroup.upsert({
        where: { name: group.name },
        update: {},
        create: group,
      });
      createdMenuGroups[group.name] = created;
    }

    // Create menu items
    const menuItems = [
      // Dashboard Group
      { name: 'dashboard-overview', label: 'Overview Dashboard', path: '/', icon: 'LayoutDashboard', order: 0, groupName: 'dashboard', isActive: true, isDeveloper: false },
      { name: 'dashboard-layout2d', label: 'Process Flow', path: '/layout2d', icon: 'Workflow', order: 1, groupName: 'dashboard', isActive: true, isDeveloper: false },

      // Control Group
      { name: 'control-manual', label: 'Manual Control', path: '/control/manual', icon: 'Settings', order: 0, groupName: 'control', isDeveloper: false },
      { name: 'control-schedule', label: 'Scheduled Control', path: '/control/schedule', icon: 'Calendar', order: 1, groupName: 'control', isDeveloper: false },
      { name: 'control-logic', label: 'Logic Control', path: '/control/logic', icon: 'GitBranch', order: 2, groupName: 'control', isDeveloper: false },
      { name: 'control-unified', label: 'Unified Control', path: '/control/unified', icon: 'Sliders', order: 3, groupName: 'control', isDeveloper: false },
      { name: 'control-value', label: 'Value Control', path: '/control/value', icon: 'Gauge', order: 4, groupName: 'control', isDeveloper: false },
      { name: 'control-voice', label: 'Voice Control', path: '/control/voice', icon: 'Mic', order: 5, groupName: 'control', isDeveloper: false },

      // Devices Group
      { name: 'devices-internal', label: 'Internal Devices', path: '/devices/devices-internal', icon: 'Server', order: 0, groupName: 'devices', isDeveloper: false },
      { name: 'devices-external', label: 'External Devices', path: '/devices/devices-external', icon: 'Globe', order: 1, groupName: 'devices', isDeveloper: false },
      { name: 'devices-access-controllers', label: 'Access Controllers', path: '/devices/access-controllers', icon: 'Shield', order: 2, groupName: 'devices', isDeveloper: false },
      { name: 'devices-zigbee', label: 'Zigbee Devices', path: '/devices/zigbee', icon: 'Zap', order: 3, groupName: 'devices', isDeveloper: false },

      // Network Group
      { name: 'network-communication-setup', label: 'Communication Setup', path: '/network/communication-setup', icon: 'Waves', order: 0, groupName: 'network', isDeveloper: false },
      { name: 'network-mqtt-broker', label: 'MQTT Broker', path: '/network/mqtt-broker', icon: 'Radio', order: 1, groupName: 'network', isDeveloper: false },
      { name: 'network-register-snmp', label: 'SNMP Registration', path: '/network/register-snmp', icon: 'Database', order: 2, groupName: 'network', isDeveloper: false },

      // Security Group
      { name: 'security-access-control', label: 'Access Control', path: '/security-access/access-control', icon: 'Lock', order: 0, groupName: 'security', isDeveloper: false },
      { name: 'security-surveillance-cctv', label: 'CCTV Surveillance', path: '/security-access/surveillance-cctv', icon: 'Camera', order: 1, groupName: 'security', isDeveloper: false },

      // LoRaWAN Group
      { name: 'lorawan-gateways', label: 'LoRaWAN Gateways', path: '/lo-ra-wan/gateways', icon: 'Router', order: 0, groupName: 'lorawan', isDeveloper: false },
      { name: 'lorawan-applications', label: 'LoRaWAN Apps', path: '/lo-ra-wan/applications', icon: 'Layers', order: 1, groupName: 'lorawan', isDeveloper: false },
      { name: 'lorawan-device-profiles', label: 'Device Profiles', path: '/lo-ra-wan/device-profiles', icon: 'Settings2', order: 2, groupName: 'lorawan', isDeveloper: false },
      { name: 'lorawan-device-list', label: 'Device List', path: '/lo-ra-wan/device-list', icon: 'List', order: 3, groupName: 'lorawan', isDeveloper: false },
      { name: 'lorawan-ec25-modem', label: 'Mobile Modem', path: '/lo-ra-wan/ec25-modem', icon: 'Wireless', order: 4, groupName: 'lorawan', isDeveloper: false },

      // Payload Group (Developer only)
      { name: 'payload-static', label: 'Static Payload', path: '/payload/static', icon: 'FileText', order: 0, groupName: 'payload', isDeveloper: true },
      { name: 'payload-remapping', label: 'Payload Remapping', path: '/payload/remapping', icon: 'ArrowRightLeft', order: 1, groupName: 'payload', isDeveloper: true },
      { name: 'payload-discover', label: 'Payload Discovery', path: '/payload/discover', icon: 'Search', order: 2, groupName: 'payload', isDeveloper: true },

      // System Config Group (Developer)
      { name: 'system-user-management', label: 'User Management', path: '/system-config/user-management', icon: 'Users', order: 0, groupName: 'system', isDeveloper: true },
      { name: 'system-power-analyzer', label: 'Power Analyzer', path: '/system-config/power-analyzer', icon: 'Zap', order: 1, groupName: 'system', isDeveloper: true },
      { name: 'system-system-backup', label: 'System Backup', path: '/system-config/system-backup', icon: 'HardDrive', order: 2, groupName: 'system', isDeveloper: true },
      { name: 'system-menu-management', label: 'Menu Management', path: '/manage-menu', icon: 'Menu', order: 99, groupName: 'system', isDeveloper: true },

      // Analytics Group
      { name: 'alarms-alarm-management', label: 'Alarm Management', path: '/alarms/alarm-management', icon: 'AlertTriangle', order: 0, groupName: 'analytics', isDeveloper: false },
      { name: 'alarms-alarm-log-reports', label: 'Alarm Reports', path: '/alarms/alarm-log-reports', icon: 'FileBarChart', order: 1, groupName: 'analytics', isDeveloper: false },
      { name: 'analytics-devices-log-report', label: 'Device Analytics', path: '/analytics/devices-log-report', icon: 'BarChart', order: 2, groupName: 'analytics', isDeveloper: false },

      // Maintenance Group
      { name: 'maintenance-schedule-management', label: 'Maintenance Schedule', path: '/maintenance/schedule-management', icon: 'Wrench', order: 0, groupName: 'maintenance', isDeveloper: false },
      { name: 'racks-management', label: 'Rack Management', path: '/racks', icon: 'Archive', order: 1, groupName: 'maintenance', isDeveloper: false },
      { name: 'info-system-info', label: 'System Information', path: '/info', icon: 'Info', order: 100, groupName: 'maintenance', isDeveloper: false },

      // Tools Group (Developer)
      { name: 'snmp-data-get', label: 'SNMP Data Manager', path: '/snmp-data-get', icon: 'Network', order: 0, groupName: 'tools', isDeveloper: true },
      { name: 'whatsapp-test', label: 'WhatsApp Integration', path: '/whatsapp-test', icon: 'MessageCircle', order: 1, groupName: 'tools', isDeveloper: true },
      { name: 'test-system-test', label: 'System Testing', path: '/test', icon: 'Bug', order: 2, groupName: 'tools', isDeveloper: true },
    ];

    for (const item of menuItems) {
      const menuItem = await prisma.menuItem.upsert({
        where: { name: item.name },
        update: {},
        create: {
          menuGroupId: createdMenuGroups[item.groupName].id,
          name: item.name,
          label: item.label,
          path: item.path,
          icon: item.icon,
          order: item.order,
          isDeveloper: item.isDeveloper,
        },
      });

      // Create permissions for each menu item
      // Admin gets full permissions
      await prisma.roleMenuPermission.upsert({
        where: {
          roleId_menuItemId: {
            roleId: adminRole.id,
            menuItemId: menuItem.id,
          },
        },
        update: {},
        create: {
          roleId: adminRole.id,
          menuItemId: menuItem.id,
          canView: true,
          canCreate: true,
          canUpdate: true,
          canDelete: true,
        },
      });

      // User gets view only (unless developer item)
      await prisma.roleMenuPermission.upsert({
        where: {
          roleId_menuItemId: {
            roleId: userRole.id,
            menuItemId: menuItem.id,
          },
        },
        update: {},
        create: {
          roleId: userRole.id,
          menuItemId: menuItem.id,
          canView: !item.isDeveloper,
          canCreate: false,
          canUpdate: false,
          canDelete: false,
        },
      });

      // Developer gets full access
      await prisma.roleMenuPermission.upsert({
        where: {
          roleId_menuItemId: {
            roleId: developerRole.id,
            menuItemId: menuItem.id,
          },
        },
        update: {},
        create: {
          roleId: developerRole.id,
          menuItemId: menuItem.id,
          canView: true,
          canCreate: true,
          canUpdate: true,
          canDelete: true,
        },
      });
    }

    console.log('✅ Menu system seeded successfully');
    console.log(`   - ${menuGroups.length} menu groups created`);
    console.log(`   - ${menuItems.length} menu items created`);

  } catch (error) {
    console.error('❌ Error seeding menu:', error);
    throw error;
  }
}

// Export for use in other scripts
module.exports = {
  seedMenu,
  default: seedMenu
};

// Run if called directly
if (require.main === module) {
  seedMenu()
    .then(() => {
      console.log('📋 Menu seeding completed!');
    })
    .catch((error) => {
      console.error('❌ Menu seeding failed:', error);
      process.exit(1);
    })
    .finally(() => {
      prisma.$disconnect();
    });
}
