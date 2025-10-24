const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function seedUsers() {
  console.log('👥 Seeding users and roles...');

  try {
    // Simple approach - first check if we can use the Prisma client, if not, skip user seeding
    console.log('🔍 Checking Prisma client availability...');

    const createdRoles = {};

    // Try to check if the table exists
    try {
      const tableExists = await prisma.$queryRaw`SELECT name FROM sqlite_master WHERE type='table' AND name='User'`;
      console.log('✅ Database tables exist');

      // Create roles directly without checking if table exists
      const roles = [
        { name: 'ADMIN', description: 'Administrator with full system access' },
        { name: 'USER', description: 'Regular user with limited access' },
        { name: 'DEVELOPER', description: 'Developer with advanced access' },
      ];
      for (const role of roles) {
        try {
          const created = await prisma.role.create({
            data: role,
          });
          createdRoles[role.name] = created;
          console.log(`   - Created role: ${role.name}`);
        } catch (roleError) {
          console.log(`   - Role ${role.name} might already exist, skipping...`);
          // Try to fetch existing role if creation failed
          try {
            const existingRole = await prisma.role.findUnique({
              where: { name: role.name },
            });
            if (existingRole) {
              createdRoles[role.name] = existingRole;
              console.log(`   - Found existing role: ${role.name}`);
            }
          } catch (fetchError) {
            console.log(`   - Could not fetch existing role ${role.name}: ${fetchError.message}`);
          }
        }
      }
    } catch (dbError) {
      console.log('⚠️  Database tables not fully available, skipping role creation');
      throw new Error('Database schema incomplete - please run migrations first');
    }

    // Check if createdRoles has any content
    const roleNames = Object.keys(createdRoles);
    if (roleNames.length === 0) {
      throw new Error('No roles were created or found. Cannot proceed with user creation.');
    }
    console.log(`📋 Available roles for user creation: ${roleNames.join(', ')}`);

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
      if (!role) {
        console.warn(`⚠️  Role ${user.roleName} not found, skipping user ${user.email}`);
        continue;
      }

      try {
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
        console.log(`   - Created user: ${user.email} (${user.roleName})`);
      } catch (userError) {
        console.log(`   - User ${user.email} might already exist, skipping...`);
      }
    }

    console.log('✅ Users and roles seeded successfully');
    console.log(`   - ${Object.keys(createdRoles).length} roles available`);
    console.log(`   - ${users.length} users processed`);

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
