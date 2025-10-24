const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addDevicePermissions() {
  try {
    console.log('🔧 Adding device permissions to database...');

    // Create device permissions
    const devicePermissions = [
      { name: 'devices.view', description: 'View devices', resource: 'devices', action: 'view' },
      { name: 'devices.create', description: 'Create devices', resource: 'devices', action: 'create' },
      { name: 'devices.update', description: 'Update devices', resource: 'devices', action: 'update' },
      { name: 'devices.delete', description: 'Delete devices', resource: 'devices', action: 'delete' },
    ];

    for (const perm of devicePermissions) {
      await prisma.permission.upsert({
        where: { name: perm.name },
        update: {},
        create: perm,
      });
      console.log('✅ Created permission:', perm.name);
    }

    // Get roles
    const adminRole = await prisma.role.findUnique({ where: { name: 'ADMIN' } });
    const userRole = await prisma.role.findUnique({ where: { name: 'USER' } });
    const developerRole = await prisma.role.findUnique({ where: { name: 'DEVELOPER' } });

    if (!adminRole || !userRole || !developerRole) {
      throw new Error('Roles not found. Please run user seeding first.');
    }

    // Assign device permissions
    const devicePerms = await prisma.permission.findMany({
      where: { resource: 'devices' },
    });

    // Admin gets all device permissions
    for (const perm of devicePerms) {
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

    // User gets view permissions for devices
    const viewPerm = devicePerms.find(p => p.action === 'view');
    if (viewPerm) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: userRole.id,
            permissionId: viewPerm.id,
          },
        },
        update: {},
        create: {
          roleId: userRole.id,
          permissionId: viewPerm.id,
        },
      });
    }

    // Developer gets all device permissions (same as admin)
    for (const perm of devicePerms) {
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

    console.log('✅ Device permissions added successfully');
    console.log('   - ADMIN: all device permissions (view, create, update, delete)');
    console.log('   - USER: view devices only');
    console.log('   - DEVELOPER: all device permissions (view, create, update, delete)');

  } catch (error) {
    console.error('❌ Error adding device permissions:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  addDevicePermissions()
    .then(() => {
      console.log('🎉 Device permissions seeding completed!');
    })
    .catch((error) => {
      console.error('❌ Device permissions seeding failed:', error);
      process.exit(1);
    });
}

module.exports = { addDevicePermissions };
