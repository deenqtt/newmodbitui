const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function seedUsers() {
  console.log('👥 Seeding users and roles...');

  try {
    // Create roles
    const roles = [
      { name: 'ADMIN', description: 'Administrator with full system access' },
      { name: 'USER', description: 'Regular user with limited access' },
      { name: 'DEVELOPER', description: 'Developer with advanced access' },
    ];

    const createdRoles = {};
    for (const role of roles) {
      const created = await prisma.role.upsert({
        where: { name: role.name },
        update: {},
        create: role,
      });
      createdRoles[role.name] = created;
    }

    // Hash password function
    const hashPassword = async (password) => {
      const saltRounds = 10;
      return bcrypt.hash(password, saltRounds);
    };

    // Create users
    const users = [
      {
        email: 'admin@gmail.com',
        password: await hashPassword('admin123'),
        roleName: 'ADMIN',
        phoneNumber: '+1234567890',
      },
      {
        email: 'user@gmail.com',
        password: await hashPassword('user123'),
        roleName: 'USER',
        phoneNumber: '+1234567891',
      },
      {
        email: 'developer@gmail.com',
        password: await hashPassword('dev123'),
        roleName: 'DEVELOPER',
        phoneNumber: '+1234567892',
      },
    ];

    for (const user of users) {
      const role = createdRoles[user.roleName];
      await prisma.user.upsert({
        where: { email: user.email },
        update: {},
        create: {
          email: user.email,
          password: user.password,
          roleId: role.id,
          phoneNumber: user.phoneNumber,
        },
      });
    }

    console.log('✅ Users and roles seeded successfully');
    console.log(`   - ${roles.length} roles created (ADMIN, USER, DEVELOPER)`);
    console.log(`   - ${users.length} users created`);

  } catch (error) {
    console.error('❌ Error seeding users:', error);
    throw error;
  }
}

// Export for use in other scripts
module.exports = {
  seedUsers,
  default: seedUsers
};

// Run if called directly
if (require.main === module) {
  seedUsers()
    .then(() => {
      console.log('👥 User seeding completed!');
    })
    .catch((error) => {
      console.error('❌ User seeding failed:', error);
      process.exit(1);
    })
    .finally(() => {
      prisma.$disconnect();
    });
}
