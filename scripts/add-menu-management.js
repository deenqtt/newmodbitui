const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addManageMenu() {
  try {
    console.log('🔧 Adding Menu Management to system...');

    // Get the system group
    let systemGroup = await prisma.menuGroup.findUnique({
      where: { name: 'system' }
    });

    if (!systemGroup) {
      console.log('📁 System menu group not found, creating...');
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
    const menuManagement = await prisma.menuItem.upsert({
      where: { name: 'system-menu-management' },
      update: {},
      create: {
        menuGroupId: systemGroup.id,
        name: 'system-menu-management',
        label: 'Menu Management',
        path: '/manage-menu',
        icon: 'Menu',
        component: 'MenuManagement',
        order: 99, // High order to place it at the end
        isActive: true,
        isDeveloper: true,
      },
    });

    console.log('✅ Menu item created:', menuManagement.label);

    // Get admin role and assign permissions
    const adminRole = await prisma.role.findUnique({
      where: { name: 'ADMIN' }
    });

    if (adminRole) {
      await prisma.roleMenuPermission.upsert({
        where: {
          roleId_menuItemId: {
            roleId: adminRole.id,
            menuItemId: menuManagement.id,
          },
        },
        update: {},
        create: {
          roleId: adminRole.id,
          menuItemId: menuManagement.id,
          canView: true,
          canCreate: true,
          canUpdate: true,
          canDelete: true,
        },
      });
      console.log('✅ Admin permissions assigned');
    }

    console.log('🎉 Menu Management added to system successfully!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  addManageMenu().catch(console.error);
}
