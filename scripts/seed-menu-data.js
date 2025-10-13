// scripts/seed-menu-data.js
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient();

async function seedMenuData() {
  console.log('🌱 Seeding menu data...');
  console.log('Connected to database:', process.env.DATABASE_URL ? 'Yes' : 'No');

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

    console.log('✅ Roles created successfully!');

    // Create basic permissions
    const permissions = [
      { name: 'menu.view', description: 'View menu items', resource: 'menu', action: 'view' },
      { name: 'menu.create', description: 'Create menu items', resource: 'menu', action: 'create' },
      { name: 'menu.update', description: 'Update menu items', resource: 'menu', action: 'update' },
      { name: 'menu.delete', description: 'Delete menu items', resource: 'menu', action: 'delete' },
      { name: 'user.view', description: 'View users', resource: 'user', action: 'view' },
      { name: 'user.create', description: 'Create users', resource: 'user', action: 'create' },
      { name: 'user.update', description: 'Update users', resource: 'user', action: 'update' },
      { name: 'user.delete', description: 'Delete users', resource: 'user', action: 'delete' },
    ];

    for (const perm of permissions) {
      await prisma.permission.upsert({
        where: { name: perm.name },
        update: {},
        create: perm,
      });
    }

    console.log('✅ Permissions created successfully!');

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

    console.log('✅ Permissions assigned to roles successfully!');

    // Create menu groups
    const dashboardGroup = await prisma.menuGroup.upsert({
      where: { name: 'dashboard' },
      update: {},
      create: {
        name: 'dashboard',
        label: 'Dashboard',
        icon: 'BarChart3',
        order: 0,
      },
    });

    const devicesGroup = await prisma.menuGroup.upsert({
      where: { name: 'devices' },
      update: {},
      create: {
        name: 'devices',
        label: 'Devices',
        icon: 'HardDrive',
        order: 1,
      },
    });

    const systemGroup = await prisma.menuGroup.upsert({
      where: { name: 'system' },
      update: {},
      create: {
        name: 'system',
        label: 'System',
        icon: 'Settings',
        order: 10,
      },
    });

    console.log('✅ Menu groups created successfully!');

    // Create menu items
    const menuItems = [
      {
        name: 'dashboard-overview',
        label: 'Overview',
        path: '/',
        icon: 'BarChart3',
        order: 0,
        menuGroupId: dashboardGroup.id,
        isDeveloper: false,
      },
      {
        name: 'dashboard-layout2d',
        label: 'Process Flow',
        path: '/layout2d',
        icon: 'Monitor',
        order: 1,
        menuGroupId: dashboardGroup.id,
        isDeveloper: false,
      },
      {
        name: 'devices-internal',
        label: 'Internal Devices',
        path: '/devices/devices-internal',
        icon: 'HardDrive',
        order: 0,
        menuGroupId: devicesGroup.id,
        isDeveloper: false,
      },
      {
        name: 'devices-external',
        label: 'External Devices',
        path: '/devices/devices-external',
        icon: 'Package',
        order: 1,
        menuGroupId: devicesGroup.id,
        isDeveloper: false,
      },
      {
        name: 'system-user-management',
        label: 'User Management',
        path: '/system-config/user-management',
        icon: 'Users',
        order: 0,
        menuGroupId: systemGroup.id,
        isDeveloper: true,
      },
    ];

    for (const item of menuItems) {
      const menuItem = await prisma.menuItem.upsert({
        where: { name: item.name },
        update: {},
        create: item,
      });

      // Assign menu item permissions to both roles
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
          canCreate: false,
          canUpdate: false,
          canDelete: false,
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
    }

    console.log('✅ Menu items created successfully!');

    // Update existing users to use new role system with SQL approach for backward compatibility
    try {
      console.log('📊 Migrating existing users to new role system...');

      // Check if any users exist without roleId
      const usersWithoutRoleId = await prisma.user.findMany({
        where: { roleId: null },
        select: { id: true }
      });

      console.log(`📊 Found ${usersWithoutRoleId.length} users without roleId to migrate...`);

      if (usersWithoutRoleId.length === 0) {
        console.log('✅ All users already have roleId assigned, skipping migration.');
      } else {
        // For backward compatibility, assign all existing users to USER role
        // In production, you'd want to map based on existing role data
        console.log('✅ Assigning default USER role to existing users for backward compatibility.');
        for (const user of usersWithoutRoleId) {
          await prisma.user.update({
            where: { id: user.id },
            data: {
              roleId: userRole.id, // Assign USER role by default
            },
          });
        }
        console.log(`✅ Migrated ${usersWithoutRoleId.length} users to USER role successfully!`);
      }
    } catch (migrationError) {
      console.warn('⚠️  User migration encountered an issue:', migrationError.message);
      console.log('Continuing with seeding...');
    }

    console.log('✅ User roles updated successfully!');
    console.log('🎉 All menu data seeded successfully!');

  } catch (error) {
    console.error('❌ Error seeding menu data:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
seedMenuData().catch(console.error);
