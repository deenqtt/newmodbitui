/**
 * User Seeder Service
 * 
 * Automatically seeds default users when the application starts
 * if the users table is empty. This ensures there's always at least
 * one admin user available for initial setup.
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

interface DefaultUser {
  email: string;
  password: string;
  role: 'ADMIN' | 'USER';
  phoneNumber?: string;
}

const DEFAULT_USERS: DefaultUser[] = [
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

class UserSeederService {
  private static instance: UserSeederService;
  private isSeeding = false;

  public static getInstance(): UserSeederService {
    if (!UserSeederService.instance) {
      UserSeederService.instance = new UserSeederService();
    }
    return UserSeederService.instance;
  }

  /**
   * Hash password using bcrypt
   */
  private async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  }

  /**
   * Check if users exist in the database
   */
  private async checkExistingUsers(): Promise<number> {
    try {
      const userCount = await prisma.user.count();
      return userCount;
    } catch (error) {
      console.error('[UserSeeder] Error checking existing users:', error);
      throw error;
    }
  }

  /**
   * Create a single user
   */
  private async createUser(userData: DefaultUser) {
    try {
      const hashedPassword = await this.hashPassword(userData.password);
      
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
      console.error(`[UserSeeder] Error creating user ${userData.email}:`, error);
      throw error;
    }
  }

  /**
   * Seed default users if the table is empty
   */
  public async seedDefaultUsers(): Promise<boolean> {
    // Prevent concurrent seeding
    if (this.isSeeding) {
      console.log('[UserSeeder] Seeding already in progress, skipping...');
      return false;
    }

    this.isSeeding = true;

    try {
      // Check if users already exist
      const existingUserCount = await this.checkExistingUsers();
      
      if (existingUserCount > 0) {
        console.log(`[UserSeeder] Users already exist (${existingUserCount} users found), skipping seed.`);
        return false;
      }
      
      console.log('[UserSeeder] No users found, seeding default users...');
      
      // Create default users
      const createdUsers = [];
      
      for (const userData of DEFAULT_USERS) {
        try {
          const user = await this.createUser(userData);
          createdUsers.push(user);
          console.log(`[UserSeeder] Created ${userData.role.toLowerCase()} user: ${userData.email}`);
        } catch (error) {
          // Continue with other users even if one fails
          console.error(`[UserSeeder] Failed to create user ${userData.email}:`, error);
        }
      }
      
      if (createdUsers.length > 0) {
        console.log(`[UserSeeder] Successfully seeded ${createdUsers.length} default users.`);
        console.log('[UserSeeder] Default login credentials:');
        console.log('  Admin: admin@modbit.com / admin123');
        console.log('  User:  user@modbit.com / user123');
        console.log('[UserSeeder] ⚠️  Please change these default passwords after first login!');
        return true;
      } else {
        console.error('[UserSeeder] Failed to create any default users.');
        return false;
      }
      
    } catch (error) {
      console.error('[UserSeeder] Error during user seeding:', error);
      
      if (error.code === 'P2002') {
        console.error('[UserSeeder] Unique constraint violation - user with this email may already exist');
      } else if (error.code === 'P1001') {
        console.error('[UserSeeder] Database connection error - please check your DATABASE_URL');
      }
      
      return false;
    } finally {
      this.isSeeding = false;
    }
  }

  /**
   * Get default user credentials (for testing/documentation purposes)
   */
  public getDefaultCredentials() {
    return DEFAULT_USERS.map(user => ({
      email: user.email,
      password: user.password,
      role: user.role
    }));
  }

  /**
   * Check if default admin exists
   */
  public async hasDefaultAdmin(): Promise<boolean> {
    try {
      const adminUser = await prisma.user.findFirst({
        where: {
          email: 'admin@modbit.com',
          role: 'ADMIN'
        }
      });
      
      return !!adminUser;
    } catch (error) {
      console.error('[UserSeeder] Error checking for default admin:', error);
      return false;
    }
  }
}

// Create and export singleton instance
export const userSeederService = UserSeederService.getInstance();

// Export class for testing
export { UserSeederService };