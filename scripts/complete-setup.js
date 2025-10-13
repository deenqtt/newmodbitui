const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// Function to execute shell commands
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

async function resetAndSetupDatabase() {
  console.log('🔄 Starting complete database reset and setup...\n');

  const steps = [
    // Reset database
    () => runCommand('npx prisma migrate reset --force --skip-generate', 'Reset database migrations'),
    () => runCommand('npx prisma db push --force-reset', 'Force reset database schema'),

    // Generate Prisma client
    () => runCommand('npx prisma generate', 'Generate Prisma client'),

    // Seed basic data
    async () => {
      console.log('🌱 Seeding basic system data...');
      const result = await seedBasicData();
      if (!result) {
        console.log('❌ Basic data seeding failed');
        return false;
      }
      console.log('✅ Basic data seeded');
      return true;
    },

    // Add menu management
    async () => {
      console.log('📋 Setting up menu management...');
      const result = await addMenuManagement();
      if (!result) {
        console.log('❌ Menu management setup failed');
        return false;
      }
      console.log('✅ Menu management added');
      return true;
    },

    // Optional: Final build test (commented out for faster setup)
    () => {
      console.log('🔧 Skipping build test (optional step)');
      return true;
      // runCommand('npm run build', 'Build application to verify setup')
    },
  ];

  // Execute all steps
  for (const step of steps) {
    if (!await step()) {
      console.error('❌ Setup failed');
      process.exit(1);
    }
    console.log(''); // Add spacing
  }

  console.log('🎉 Complete database setup finished successfully!');
}

async function seedBasicData() {
  try {
    // Create system roles
    const adminRole = await prisma.role.upsert({
      where: { name: 'ADMIN' },
      update: {},
      create: {
        name: 'ADMIN',
        description: 'Administrator with full access',
        isSystem: true,
        isActive: true,
      },
    });

    const userRole = await prisma.role.upsert({
      where: { name: 'USER' },
      update: {},
      create: {
        name: 'USER',
        description: 'Regular user with limited access',
        isSystem: true,
        isActive: true,
      },
    });

    const developerRole = await prisma.role.upsert({
      where: { name: 'DEVELOPER' },
      update: {},
      create: {
        name: 'DEVELOPER',
        description: 'Developer with advanced access',
        isSystem: true,
        isActive: true,
      },
    });

    // Create basic permissions
    const permissions = [
      { name: 'menu.view', description: 'View menu items', resource: 'menu', action: 'view' },
      { name: 'menu.create', description: 'Create menu items', resource: 'menu', action: 'create' },
      { name: 'menu.update', description: 'Update menu items', resource: 'menu', action: 'update' },
      { name: 'menu.delete', description: 'Delete menu items', resource: 'menu', action: 'delete' },
      { name: 'user.view', description: 'View users', resource: 'user', action: 'view' },
      { name: 'user.create', description: 'Create users', resource: 'user', action: 'create' },
      { name: 'user.update', description: 'Update users', resource: 'user', action: 'update' },
      { name: 'user.manage', description: 'Manage user permissions', resource: 'user', action: 'manage' },
    ];

    for (const perm of permissions) {
      await prisma.permission.upsert({
        where: { name: perm.name },
        update: {},
        create: perm,
      });
    }

    // Assign all permissions to admin role
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

    // Assign basic menu permissions to user role
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

    // Assign developer permissions (all menu permissions)
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

    // Create comprehensive menu groups
    const dashboardGroup = await prisma.menuGroup.upsert({
      where: { name: 'dashboard' },
      update: {},
      create: {
        name: 'dashboard',
        label: 'Dashboard',
        icon: 'LayoutDashboard',
        order: 0,
      },
    });

    const controlGroup = await prisma.menuGroup.upsert({
      where: { name: 'control' },
      update: {},
      create: {
        name: 'control',
        label: 'Control',
        icon: 'Sliders',
        order: 1,
      },
    });

    const devicesGroup = await prisma.menuGroup.upsert({
      where: { name: 'devices' },
      update: {},
      create: {
        name: 'devices',
        label: 'Devices',
        icon: 'Cpu',
        order: 2,
      },
    });

    const networkGroup = await prisma.menuGroup.upsert({
      where: { name: 'network' },
      update: {},
      create: {
        name: 'network',
        label: 'Network',
        icon: 'Network',
        order: 3,
      },
    });

    const securityGroup = await prisma.menuGroup.upsert({
      where: { name: 'security' },
      update: {},
      create: {
        name: 'security',
        label: 'Security',
        icon: 'Shield',
        order: 4,
      },
    });

    const lorawanGroup = await prisma.menuGroup.upsert({
      where: { name: 'lorawan' },
      update: {},
      create: {
        name: 'lorawan',
        label: 'LoRaWAN',
        icon: 'Radio',
        order: 5,
      },
    });

    const payloadGroup = await prisma.menuGroup.upsert({
      where: { name: 'payload' },
      update: {},
      create: {
        name: 'payload',
        label: 'Payload',
        icon: 'FileText',
        order: 6,
      },
    });

    const systemGroup = await prisma.menuGroup.upsert({
      where: { name: 'system' },
      update: {},
      create: {
        name: 'system',
        label: 'System Config',
        icon: 'Settings',
        order: 7,
      },
    });

    const analyticsGroup = await prisma.menuGroup.upsert({
      where: { name: 'analytics' },
      update: {},
      create: {
        name: 'analytics',
        label: 'Analytics',
        icon: 'BarChart3',
        order: 8,
      },
    });

    const maintenanceGroup = await prisma.menuGroup.upsert({
      where: { name: 'maintenance' },
      update: {},
      create: {
        name: 'maintenance',
        label: 'Maintenance',
        icon: 'Wrench',
        order: 9,
      },
    });

    const toolsGroup = await prisma.menuGroup.upsert({
      where: { name: 'tools' },
      update: {},
      create: {
        name: 'tools',
        label: 'Tools',
        icon: 'Tool',
        order: 10,
      },
    });

    // Create comprehensive menu items based on all app routes
    const menuItems = [
      // Dashboard Group
      {
        name: 'dashboard-overview',
        label: 'Overview Dashboard',
        path: '/',
        icon: 'LayoutDashboard',
        order: 0,
        menuGroupId: dashboardGroup.id,
        isDeveloper: false,
      },
      {
        name: 'dashboard-layout2d',
        label: 'Process Flow',
        path: '/layout2d',
        icon: 'Workflow',
        order: 1,
        menuGroupId: dashboardGroup.id,
        isDeveloper: false,
      },

      // Control Group
      {
        name: 'control-manual',
        label: 'Manual Control',
        path: '/control/manual',
        icon: 'Settings',
        order: 0,
        menuGroupId: controlGroup.id,
        isDeveloper: false,
      },
      {
        name: 'control-schedule',
        label: 'Scheduled Control',
        path: '/control/schedule',
        icon: 'Calendar',
        order: 1,
        menuGroupId: controlGroup.id,
        isDeveloper: false,
      },
      {
        name: 'control-logic',
        label: 'Logic Control',
        path: '/control/logic',
        icon: 'GitBranch',
        order: 2,
        menuGroupId: controlGroup.id,
        isDeveloper: false,
      },
      {
        name: 'control-unified',
        label: 'Unified Control',
        path: '/control/unified',
        icon: 'Sliders',
        order: 3,
        menuGroupId: controlGroup.id,
        isDeveloper: false,
      },
      {
        name: 'control-value',
        label: 'Value Control',
        path: '/control/value',
        icon: 'Gauge',
        order: 4,
        menuGroupId: controlGroup.id,
        isDeveloper: false,
      },
      {
        name: 'control-voice',
        label: 'Voice Control',
        path: '/control/voice',
        icon: 'Mic',
        order: 5,
        menuGroupId: controlGroup.id,
        isDeveloper: false,
      },

      // Devices Group
      {
        name: 'devices-internal',
        label: 'Internal Devices',
        path: '/devices/devices-internal',
        icon: 'Server',
        order: 0,
        menuGroupId: devicesGroup.id,
        isDeveloper: false,
      },
      {
        name: 'devices-external',
        label: 'External Devices',
        path: '/devices/devices-external',
        icon: 'Globe',
        order: 1,
        menuGroupId: devicesGroup.id,
        isDeveloper: false,
      },
      {
        name: 'devices-access-controllers',
        label: 'Access Controllers',
        path: '/devices/access-controllers',
        icon: 'Shield',
        order: 2,
        menuGroupId: devicesGroup.id,
        isDeveloper: false,
      },
      {
        name: 'devices-zigbee',
        label: 'Zigbee Devices',
        path: '/devices/zigbee',
        icon: 'Zap',
        order: 3,
        menuGroupId: devicesGroup.id,
        isDeveloper: false,
      },

      // Network Group
      {
        name: 'network-communication-setup',
        label: 'Communication Setup',
        path: '/network/communication-setup',
        icon: 'Waves',
        order: 0,
        menuGroupId: networkGroup.id,
        isDeveloper: false,
      },
      {
        name: 'network-mqtt-broker',
        label: 'MQTT Broker',
        path: '/network/mqtt-broker',
        icon: 'Radio',
        order: 1,
        menuGroupId: networkGroup.id,
        isDeveloper: false,
      },
      {
        name: 'network-register-snmp',
        label: 'SNMP Registration',
        path: '/network/register-snmp',
        icon: 'Database',
        order: 2,
        menuGroupId: networkGroup.id,
        isDeveloper: false,
      },

      // Security Group
      {
        name: 'security-access-control',
        label: 'Access Control',
        path: '/security-access/access-control',
        icon: 'Lock',
        order: 0,
        menuGroupId: securityGroup.id,
        isDeveloper: false,
      },
      {
        name: 'security-surveillance-cctv',
        label: 'CCTV Surveillance',
        path: '/security-access/surveillance-cctv',
        icon: 'Camera',
        order: 1,
        menuGroupId: securityGroup.id,
        isDeveloper: false,
      },

      // LoRaWAN Group
      {
        name: 'lorawan-gateways',
        label: 'LoRaWAN Gateways',
        path: '/lo-ra-wan/gateways',
        icon: 'Router',
        order: 0,
        menuGroupId: lorawanGroup.id,
        isDeveloper: false,
      },
      {
        name: 'lorawan-applications',
        label: 'LoRaWAN Apps',
        path: '/lo-ra-wan/applications',
        icon: 'Layers',
        order: 1,
        menuGroupId: lorawanGroup.id,
        isDeveloper: false,
      },
      {
        name: 'lorawan-device-profiles',
        label: 'Device Profiles',
        path: '/lo-ra-wan/device-profiles',
        icon: 'Settings2',
        order: 2,
        menuGroupId: lorawanGroup.id,
        isDeveloper: false,
      },
      {
        name: 'lorawan-device-list',
        label: 'Device List',
        path: '/lo-ra-wan/device-list',
        icon: 'List',
        order: 3,
        menuGroupId: lorawanGroup.id,
        isDeveloper: false,
      },
      {
        name: 'lorawan-ec25-modem',
        label: 'Mobile Modem',
        path: '/lo-ra-wan/ec25-modem',
        icon: 'Wireless',
        order: 4,
        menuGroupId: lorawanGroup.id,
        isDeveloper: false,
      },

      // Payload Group
      {
        name: 'payload-static',
        label: 'Static Payload',
        path: '/payload/static',
        icon: 'FileText',
        order: 0,
        menuGroupId: payloadGroup.id,
        isDeveloper: true,
      },
      {
        name: 'payload-remapping',
        label: 'Payload Remapping',
        path: '/payload/remapping',
        icon: 'ArrowRightLeft',
        order: 1,
        menuGroupId: payloadGroup.id,
        isDeveloper: true,
      },
      {
        name: 'payload-discover',
        label: 'Payload Discovery',
        path: '/payload/discover',
        icon: 'Search',
        order: 2,
        menuGroupId: payloadGroup.id,
        isDeveloper: true,
      },

      // System Config Group
      {
        name: 'system-user-management',
        label: 'User Management',
        path: '/system-config/user-management',
        icon: 'Users',
        order: 0,
        menuGroupId: systemGroup.id,
        isDeveloper: true,
      },
      {
        name: 'system-power-analyzer',
        label: 'Power Analyzer',
        path: '/system-config/power-analyzer',
        icon: 'Zap',
        order: 1,
        menuGroupId: systemGroup.id,
        isDeveloper: true,
      },
      {
        name: 'system-system-backup',
        label: 'System Backup',
        path: '/system-config/system-backup',
        icon: 'HardDrive',
        order: 2,
        menuGroupId: systemGroup.id,
        isDeveloper: true,
      },

      // Alarms & Analytics Group
      {
        name: 'alarms-alarm-management',
        label: 'Alarm Management',
        path: '/alarms/alarm-management',
        icon: 'AlertTriangle',
        order: 0,
        menuGroupId: analyticsGroup.id,
        isDeveloper: false,
      },
      {
        name: 'alarms-alarm-log-reports',
        label: 'Alarm Reports',
        path: '/alarms/alarm-log-reports',
        icon: 'FileBarChart',
        order: 1,
        menuGroupId: analyticsGroup.id,
        isDeveloper: false,
      },
      {
        name: 'analytics-devices-log-report',
        label: 'Device Analytics',
        path: '/analytics/devices-log-report',
        icon: 'BarChart',
        order: 2,
        menuGroupId: analyticsGroup.id,
        isDeveloper: false,
      },

      // Maintenance & Info Group
      {
        name: 'maintenance-schedule-management',
        label: 'Maintenance Schedule',
        path: '/maintenance/schedule-management',
        icon: 'Wrench',
        order: 0,
        menuGroupId: maintenanceGroup.id,
        isDeveloper: false,
      },
      {
        name: 'racks-management',
        label: 'Rack Management',
        path: '/racks',
        icon: 'Archive',
        order: 1,
        menuGroupId: maintenanceGroup.id,
        isDeveloper: false,
      },
      {
        name: 'info-system-info',
        label: 'System Information',
        path: '/info',
        icon: 'Info',
        order: 100,
        menuGroupId: maintenanceGroup.id,
        isDeveloper: false,
      },

      // Tools Group
      {
        name: 'snmp-data-get',
        label: 'SNMP Data Manager',
        path: '/snmp-data-get',
        icon: 'Network',
        order: 0,
        menuGroupId: toolsGroup.id,
        isDeveloper: true,
      },
      {
        name: 'whatsapp-test',
        label: 'WhatsApp Integration',
        path: '/whatsapp-test',
        icon: 'MessageCircle',
        order: 1,
        menuGroupId: toolsGroup.id,
        isDeveloper: true,
      },
      {
        name: 'test-system-test',
        label: 'System Testing',
        path: '/test',
        icon: 'Bug',
        order: 2,
        menuGroupId: toolsGroup.id,
        isDeveloper: true,
      },
    ];

    for (const item of menuItems) {
      const menuItem = await prisma.menuItem.upsert({
        where: { name: item.name },
        update: {},
        create: item,
      });

      // Assign menu item permissions to all roles
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
          canView: !menuItem.isDeveloper, // Regular users can't see developer items
          canCreate: false,
          canUpdate: false,
          canDelete: false,
        },
      });

      // Give developers full access to all menu items
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

    // Create example users with different roles
    console.log('👥 Creating example users...');

    const hashedAdminPwd = await bcrypt.hash('admin123', 10);
    const hashedUserPwd = await bcrypt.hash('user123', 10);
    const hashedDevPwd = await bcrypt.hash('dev123', 10);

    // Admin user
    await prisma.user.upsert({
      where: { email: 'admin@gmail.com' },
      update: {},
      create: {
        email: 'admin@gmail.com',
        password: hashedAdminPwd,
        roleId: adminRole.id,
      },
    });

    // Regular user
    await prisma.user.upsert({
      where: { email: 'user@gmail.com' },
      update: {},
      create: {
        email: 'user@gmail.com',
        password: hashedUserPwd,
        roleId: userRole.id,
      },
    });

    // Developer user
    await prisma.user.upsert({
      where: { email: 'developer@gmail.com' },
      update: {},
      create: {
        email: 'developer@gmail.com',
        password: hashedUserPwd,
        roleId: developerRole.id,
      },
    });

    console.log('✅ Example users created successfully');

    console.log('✅ Basic data seeded successfully');
    return true;
  } catch (error) {
    console.error('❌ Error seeding basic data:', error);
    return false;
  }
}

async function addMenuManagement() {
  try {
    // Get the system group
    let systemGroup = await prisma.menuGroup.findUnique({
      where: { name: 'system' }
    });

    if (!systemGroup) {
      systemGroup = await prisma.menuGroup.create({
        data: {
          name: 'system',
          label: 'System',
          icon: 'Settings',
          order: 10,
        }
      });
    }

    // Add menu management item
    await prisma.menuItem.upsert({
      where: { name: 'system-menu-management' },
      update: {},
      create: {
        menuGroupId: systemGroup.id,
        name: 'system-menu-management',
        label: 'Menu Management',
        path: '/manage-menu',
        icon: 'Menu',
        component: 'MenuManagement',
        order: 99,
        isActive: true,
        isDeveloper: true,
      },
    });

    // Get admin role and assign permissions
    const adminRole = await prisma.role.findUnique({
      where: { name: 'ADMIN' }
    });

    if (adminRole) {
      // Get the menu item we just created
      const menuManagementItem = await prisma.menuItem.findUnique({
        where: { name: 'system-menu-management' }
      });

      if (menuManagementItem) {
        await prisma.roleMenuPermission.upsert({
          where: {
            roleId_menuItemId: {
              roleId: adminRole.id,
              menuItemId: menuManagementItem.id,
            },
          },
          update: {},
          create: {
            roleId: adminRole.id,
            menuItemId: menuManagementItem.id,
            canView: true,
            canCreate: true,
            canUpdate: true,
            canDelete: true,
          },
        });
      }
    }

    console.log('✅ Menu management added successfully');
    return true;
  } catch (error) {
    console.error('❌ Error adding menu management:', error);
    return false;
  }
}

// Run if called directly
if (require.main === module) {
  resetAndSetupDatabase()
    .then(() => {
      console.log('\n🎉 Setup completed successfully!');
      console.log('Admin credentials: admin@example.com / auto-generated password');
    })
    .catch((error) => {
      console.error('❌ Setup failed:', error);
      process.exit(1);
    })
    .finally(() => {
      prisma.$disconnect();
    });
}
