const { PrismaClient } = require('@prisma/client');
const { truncate } = require('lodash');

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

    // Create menu groups with better logical grouping and ordering
    const menuGroups = [
      // 1. Core Application
      { name: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard', order: 0, isActive: true },

      // 2. Infrastructure Management
      { name: 'infrastructure', label: 'Infrastructure', icon: 'Server', order: 1, isActive: true },
      { name: 'devices', label: 'Devices', icon: 'Cpu', order: 2, isActive: true },
      { name: 'network', label: 'Network', icon: 'Network', order: 3, isActive: true },

      // 3. Monitoring & Control
      { name: 'monitoring', label: 'Monitoring', icon: 'Activity', order: 4, isActive: true },
      { name: 'control', label: 'Control', icon: 'Sliders', order: 5, isActive: true },
      { name: 'analytics', label: 'Analytics', icon: 'BarChart3', order: 6, isActive: true },

      // 4. Security & Access
      { name: 'security', label: 'Security', icon: 'Shield', order: 7, isActive: true },
      { name: 'security_access', label: 'VPN', icon: 'ShieldCheck', order: 8, isActive: true },

      // 5. Specialized Technologies
      { name: 'lorawan', label: 'LoRaWAN', icon: 'Radio', order: 9, isActive: true },

      // 6. Administration & Maintenance
      { name: 'administration', label: 'Administration', icon: 'Settings', order: 10, isActive: true, isDeveloper: true },
      { name: 'maintenance', label: 'Maintenance', icon: 'Wrench', order: 11, isActive: true },

      // 7. Testing & Development
      { name: 'testing', label: 'Payload', icon: 'TestTube', order: 12, isActive: true, isDeveloper: true },
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

    // Create menu items with improved grouping
    const menuItems = [
      // ========== 1. CORE APPLICATION ==========
      // Dashboard Group
      { name: 'dashboard-overview', label: 'Overview Dashboard', path: '/', icon: 'LayoutDashboard', order: 0, groupName: 'dashboard', isActive: true, isDeveloper: false },
      { name: 'dashboard-layout2d', label: 'Process Flow', path: '/layout2d', icon: 'Workflow', order: 1, groupName: 'dashboard', isActive: true, isDeveloper: false },
      { name: 'dashboard-node-map', label: 'Node Map View', path: '/manage-node-map', icon: 'Globe', order: 2, groupName: 'dashboard', isActive: true, isDeveloper: true },

      // ========== 2. INFRASTRUCTURE MANAGEMENT ==========
      // Infrastructure Group - Racks & Physical
      { name: 'racks-management', label: 'Rack Management', path: '/racks', icon: 'Archive', order: 0, groupName: 'infrastructure', isActive: true, isDeveloper: false },

      // Devices Group
      { name: 'devices-external', label: 'External Devices', path: '/devices/devices-external', icon: 'Globe', order: 0, groupName: 'devices', isActive: true, isDeveloper: false },
      { name: 'logging-configs', label: 'Device Log Configs', path: '/devices/devices-for-logging', icon: 'Database', order: 1, groupName: 'devices', isActive: true, isDeveloper: false },
      { name: 'devices-internal', label: 'Internal Devices', path: '/devices/devices-internal', icon: 'Server', order: 2, groupName: 'devices', isActive: true, isDeveloper: false },
      { name: 'devices-access-controllers', label: 'Access Controllers', path: '/devices/access-controllers', icon: 'Shield', order: 3, groupName: 'devices', isActive: true, isDeveloper: false },
      { name: 'devices-zigbee', label: 'Zigbee Devices', path: '/devices/zigbee', icon: 'Zap', order: 4, groupName: 'devices', isActive: true, isDeveloper: false },

      // Network Group
      { name: 'network-mqtt-broker', label: 'MQTT Broker', path: '/network/mqtt-broker', icon: 'Radio', order: 0, groupName: 'network', isActive: true, isDeveloper: false },
      { name: 'network-communication-setup', label: 'Communication Setup', path: '/network/communication-setup', icon: 'Waves', order: 1, groupName: 'network', isActive: true, isDeveloper: false },
      { name: 'network-register-snmp', label: 'SNMP Registration', path: '/network/register-snmp', icon: 'Database', order: 2, groupName: 'network', isActive: true, isDeveloper: false },

      // ========== 3. MONITORING & CONTROL ==========
      // Monitoring Group - Active monitoring features
      { name: 'info-system-info', label: 'System Information', path: '/info', icon: 'Info', order: 0, groupName: 'monitoring', isActive: true, isDeveloper: false },
      { name: 'mqtt-monitoring', label: 'MQTT Monitoring', path: '/mqtt-monitoring', icon: 'Radio', order: 1, groupName: 'monitoring', isActive: true, isDeveloper: false },

      // Control Group - Control interfaces
      { name: 'control-manual', label: 'Manual Control', path: '/control/manual', icon: 'Settings', order: 0, groupName: 'control', isActive: true, isDeveloper: false },
      { name: 'control-schedule', label: 'Scheduled Control', path: '/control/schedule', icon: 'Calendar', order: 1, groupName: 'control', isActive: true, isDeveloper: false },
      { name: 'control-logic', label: 'Logic Control', path: '/control/logic', icon: 'GitBranch', order: 2, groupName: 'control', isActive: true, isDeveloper: false },
      { name: 'control-unified', label: 'Unified Control', path: '/control/unified', icon: 'Sliders', order: 3, groupName: 'control', isActive: true, isDeveloper: false },
      { name: 'control-value', label: 'Value Control', path: '/control/value', icon: 'Gauge', order: 4, groupName: 'control', isActive: true, isDeveloper: false },
      { name: 'control-voice', label: 'Voice Control', path: '/control/voice', icon: 'Mic', order: 5, groupName: 'control', isActive: true, isDeveloper: false },

      // Analytics Group
      { name: 'alarms-alarm-management', label: 'Alarm Management', path: '/alarms/alarm-management', icon: 'AlertTriangle', order: 0, groupName: 'analytics', isActive: true, isDeveloper: false },
      { name: 'alarms-alarm-log-reports', label: 'Alarm Reports', path: '/alarms/alarm-log-reports', icon: 'FileBarChart', order: 1, groupName: 'analytics', isActive: true, isDeveloper: false },
      { name: 'analytics-devices-log-report', label: 'Device Analytics', path: '/analytics/devices-log-report', icon: 'BarChart', order: 2, groupName: 'analytics', isActive: true, isDeveloper: false },

      // ========== 4. SECURITY & ACCESS ==========
      // Security Group - Core security features
      { name: 'security-access-control', label: 'Access Control', path: '/security-access/access-control', icon: 'Lock', order: 0, groupName: 'security', isActive: true, isDeveloper: false },
      { name: 'security-surveillance-cctv', label: 'CCTV Surveillance', path: '/security-access/surveillance-cctv', icon: 'Camera', order: 1, groupName: 'security', isActive: true, isDeveloper: false },

      // Security Access Group - VPN & Remote Access
      { name: 'vpn-openvpn', label: 'OpenVPN', path: '/vpn', icon: 'Lock', order: 0, groupName: 'security_access', isActive: true, isDeveloper: false },
      { name: 'vpn-wireguard', label: 'Config VPN', path: '/vpn/config', icon: 'Shield', order: 1, groupName: 'security_access', isActive: true, isDeveloper: false },
      
      // ========== 5. SPECIALIZED TECHNOLOGIES ==========
      // LoRaWAN Group
      { name: 'lorawan-gateways', label: 'LoRaWAN Gateways', path: '/lo-ra-wan/gateways', icon: 'Router', order: 0, groupName: 'lorawan', isActive: true, isDeveloper: false },
      { name: 'lorawan-applications', label: 'LoRaWAN Apps', path: '/lo-ra-wan/applications', icon: 'Layers', order: 1, groupName: 'lorawan', isActive: true, isDeveloper: false },
      { name: 'lorawan-device-profiles', label: 'Device Profiles', path: '/lo-ra-wan/device-profiles', icon: 'Settings2', order: 2, groupName: 'lorawan', isActive: true, isDeveloper: false },
      { name: 'lorawan-device-list', label: 'Device List', path: '/lo-ra-wan/device-list', icon: 'List', order: 3, groupName: 'lorawan', isActive: true, isDeveloper: false },
      { name: 'lorawan-ec25-modem', label: 'Mobile Modem', path: '/lo-ra-wan/ec25-modem', icon: 'Wireless', order: 4, groupName: 'lorawan', isActive: true, isDeveloper: false },

      // ========== 6. ADMINISTRATION & MAINTENANCE ==========
      // Administration Group - User & System Administration
      { name: 'system-user-management', label: 'User Management', path: '/system-config/user-management', icon: 'Users', order: 0, groupName: 'administration', isActive: true, isDeveloper: true },
      { name: 'system-tenant-management', label: 'Tenant Management', path: '/tenants', icon: 'Building2', order: 1, groupName: 'administration', isActive: true, isDeveloper: true },
      { name: 'system-node-locations', label: 'Node Locations', path: '/node-tenant-locations', icon: 'MapPin', order: 2, groupName: 'administration', isActive: true, isDeveloper: true },
      { name: 'system-menu-management', label: 'Menu Management', path: '/manage-menu', icon: 'Menu', order: 15, groupName: 'administration', isActive: true, isDeveloper: true },
      { name: 'system-menu-presets', label: 'Menu Presets', path: '/system-config/menu-presets', icon: 'Settings2', order: 16, groupName: 'administration', isActive: true, isDeveloper: true },

      // Maintenance Group - Operational Maintenance
      { name: 'maintenance-schedule-management', label: 'Maintenance Schedule', path: '/maintenance/schedule-management', icon: 'Wrench', order: 0, groupName: 'maintenance', isActive: true, isDeveloper: false },

      // ========== 7. TESTING & DEVELOPMENT ==========
      // Testing Group - Development tools and testing
      { name: 'payload-node-info-discover', label: 'Node Info Discover', path: '/node-info-discover', icon: 'Compass', order: 0, groupName: 'testing', isActive: true, isDeveloper: true },
      { name: 'snmp-data-get', label: 'SNMP Data Manager', path: '/snmp-data-get', icon: 'Network', order: 1, groupName: 'testing', isActive: true, isDeveloper: true },
      { name: 'payload-discover', label: 'Payload Discovery', path: '/payload/discover', icon: 'Search', order: 3, groupName: 'testing', isActive: true, isDeveloper: true },
      { name: 'payload-static', label: 'Static Payload', path: '/payload/static', icon: 'FileText', order: 4, groupName: 'testing', isActive: true, isDeveloper: true },
      { name: 'payload-remapping', label: 'Payload Remapping', path: '/payload/remapping', icon: 'ArrowRightLeft', order: 5, groupName: 'testing', isActive: true, isDeveloper: true },
      { name: 'test-system-test', label: 'System Testing', path: '/test', icon: 'Bug', order: 2, groupName: 'testing', isActive: true, isDeveloper: true },

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
          isActive: item.isActive,
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
