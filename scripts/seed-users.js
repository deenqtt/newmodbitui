#!/usr/bin/env node

/**
 * User Seeder Script
 * 
 * Seeds default admin and user accounts when the users table is empty.
 * This script should be run only once during initial setup.
 * 
 * Usage: npm run seed:users
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const DEFAULT_USERS = [
  {
    email: 'admin@modbit.com',
    password: 'admin123',
    role: 'ADMIN',
    phoneNumber: '+62123456789'
  },
  {
    email: 'user@modbit.com', 
    password: 'user123',
    role: 'USER',
    phoneNumber: '+62987654321'
  }
];

async function hashPassword(password) {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
}

async function checkExistingUsers() {
  try {
    const userCount = await prisma.user.count();
    return userCount;
  } catch (error) {
    console.error('Error checking existing users:', error);
    throw error;
  }
}

async function createUser(userData) {
  try {
    const hashedPassword = await hashPassword(userData.password);
    
    const user = await prisma.user.create({
      data: {
        email: userData.email,
        password: hashedPassword,
        role: userData.role,
        phoneNumber: userData.phoneNumber
      },
      select: {
        id: true,
        email: true,
        role: true,
        phoneNumber: true,
        createdAt: true
      }
    });
    
    return user;
  } catch (error) {
    console.error(`Error creating user ${userData.email}:`, error);
    throw error;
  }
}

async function seedUsers() {
  console.log('🌱 Starting user seeding process...\n');
  
  try {
    // Check if users already exist
    const existingUserCount = await checkExistingUsers();
    
    if (existingUserCount > 0) {
      console.log(`⚠️  Users table is not empty (${existingUserCount} users found).`);
      console.log('Seeding skipped to prevent duplicate data.\n');
      console.log('If you want to reset users, please manually clear the users table first.');
      return;
    }
    
    console.log('✅ Users table is empty. Proceeding with seeding...\n');
    
    // Create default users
    const createdUsers = [];
    
    for (const userData of DEFAULT_USERS) {
      console.log(`Creating ${userData.role.toLowerCase()} user: ${userData.email}`);
      
      const user = await createUser(userData);
      createdUsers.push(user);
      
      console.log(`✅ User created successfully!`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Phone: ${user.phoneNumber}`);
      console.log(`   Created: ${user.createdAt.toLocaleString()}\n`);
    }
    
    // Summary
    console.log('🎉 User seeding completed successfully!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 SUMMARY:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ ${createdUsers.length} users created successfully`);
    console.log('\n📝 DEFAULT LOGIN CREDENTIALS:');
    console.log('┌─────────────────────────────────────────────────┐');
    console.log('│ ADMIN USER                                      │');
    console.log('├─────────────────────────────────────────────────┤');
    console.log('│ Email:    admin@modbit.com                      │');
    console.log('│ Password: admin123                              │');
    console.log('│ Role:     ADMIN                                 │');
    console.log('└─────────────────────────────────────────────────┘');
    console.log('┌─────────────────────────────────────────────────┐');
    console.log('│ REGULAR USER                                    │');
    console.log('├─────────────────────────────────────────────────┤');
    console.log('│ Email:    user@modbit.com                       │');
    console.log('│ Password: user123                               │');
    console.log('│ Role:     USER                                  │');
    console.log('└─────────────────────────────────────────────────┘');
    console.log('\n⚠️  IMPORTANT SECURITY NOTES:');
    console.log('   • Please change these default passwords immediately after first login');
    console.log('   • Consider implementing additional security measures in production');
    console.log('   • Store sensitive credentials securely\n');
    
  } catch (error) {
    console.error('❌ Error during user seeding:', error);
    
    if (error.code === 'P2002') {
      console.error('   Unique constraint violation - user with this email may already exist');
    } else if (error.code === 'P2025') {
      console.error('   Record not found error');
    } else if (error.code === 'P1001') {
      console.error('   Database connection error - please check your DATABASE_URL');
    }
    
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n⚠️  Received SIGINT, shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n⚠️  Received SIGTERM, shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', async (error) => {
  console.error('❌ Unhandled promise rejection:', error);
  await prisma.$disconnect();
  process.exit(1);
});

// Run the seeder
if (require.main === module) {
  seedUsers();
}

module.exports = { seedUsers };