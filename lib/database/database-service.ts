// lib/database/database-service.ts
import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";

interface DatabaseConfig {
  useLocal: boolean;
  enableSync: boolean;
  supabaseUrl?: string;
  supabaseKey?: string;
}

class DatabaseService {
  private localDb: PrismaClient;
  private supabaseClient?: any;
  private config: DatabaseConfig;
  private isOnline: boolean = false;
  private syncInterval?: NodeJS.Timeout;

  constructor(config: DatabaseConfig) {
    this.config = config;

    // Initialize local PostgreSQL
    this.localDb = new PrismaClient();

    // Initialize Supabase if sync enabled
    if (config.enableSync && config.supabaseUrl && config.supabaseKey) {
      this.supabaseClient = createClient(
        config.supabaseUrl,
        config.supabaseKey
      );
    }

    this.checkConnectivity();
    this.startSyncProcess();
  }

  // Connectivity monitoring
  private async checkConnectivity() {
    try {
      if (this.supabaseClient) {
        const { error } = await this.supabaseClient
          .from("User")
          .select("count")
          .limit(1);
        this.isOnline = !error;
      }
    } catch {
      this.isOnline = false;
    }

    // Check setiap 30 detik
    setTimeout(() => this.checkConnectivity(), 30000);
  }

  // Main database operations - Always use local first
  async findMany(table: string, options?: any) {
    try {
      return await (this.localDb as any)[table].findMany(options);
    } catch (error) {
      console.error(`Error in findMany for ${table}:`, error);
      throw error;
    }
  }

  async findUnique(table: string, options: any) {
    try {
      return await (this.localDb as any)[table].findUnique(options);
    } catch (error) {
      console.error(`Error in findUnique for ${table}:`, error);
      throw error;
    }
  }

  async create(table: string, data: any) {
    try {
      // Always create in local first
      const result = await (this.localDb as any)[table].create({
        data: { ...data, needsSync: true },
      });

      // Queue for sync if online
      if (this.isOnline && this.config.enableSync) {
        await this.queueForSync("CREATE", table, result.id, result);
      }

      return result;
    } catch (error) {
      console.error(`Error in create for ${table}:`, error);
      throw error;
    }
  }

  async update(table: string, where: any, data: any) {
    try {
      const result = await (this.localDb as any)[table].update({
        where,
        data: { ...data, needsSync: true, updatedAt: new Date() },
      });

      if (this.isOnline && this.config.enableSync) {
        await this.queueForSync("UPDATE", table, where.id, result);
      }

      return result;
    } catch (error) {
      console.error(`Error in update for ${table}:`, error);
      throw error;
    }
  }

  async delete(table: string, where: any) {
    try {
      if (this.isOnline && this.config.enableSync) {
        await this.queueForSync("DELETE", table, where.id, where);
      }

      return await (this.localDb as any)[table].delete({ where });
    } catch (error) {
      console.error(`Error in delete for ${table}:`, error);
      throw error;
    }
  }

  // Batch operations untuk IoT data logging
  async createMany(table: string, data: any[]) {
    try {
      const batchSize = 1000; // SQLite optimal batch size
      const results = [];

      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);
        const result = await (this.localDb as any)[table].createMany({
          data: batch,
          skipDuplicates: true,
        });
        results.push(result);
      }

      return results;
    } catch (error) {
      console.error(`Error in createMany for ${table}:`, error);
      throw error;
    }
  }

  // Offline queue management
  private async queueForSync(
    action: string,
    tableName: string,
    recordId: string,
    data: any
  ) {
    try {
      await this.localDb.offlineQueue.create({
        data: {
          action,
          tableName,
          recordId,
          data: JSON.stringify(data),
        },
      });
    } catch (error) {
      console.error("Error queuing for sync:", error);
    }
  }

  // Sync process
  private startSyncProcess() {
    if (!this.config.enableSync) return;

    this.syncInterval = setInterval(async () => {
      if (this.isOnline) {
        await this.processOfflineQueue();
        await this.syncFromCloud();
      }
    }, 60000); // Sync setiap 1 menit
  }

  private async processOfflineQueue() {
    try {
      const pendingItems = await this.localDb.offlineQueue.findMany({
        where: { status: "pending" },
        orderBy: { createdAt: "asc" },
        take: 50, // Process 50 items at a time
      });

      for (const item of pendingItems) {
        try {
          await this.localDb.offlineQueue.update({
            where: { id: item.id },
            data: { status: "processing" },
          });

          const data = JSON.parse(item.data);

          // Sync to Supabase
          switch (item.action) {
            case "CREATE":
              await this.supabaseClient.from(item.tableName).insert(data);
              break;
            case "UPDATE":
              await this.supabaseClient
                .from(item.tableName)
                .update(data)
                .eq("id", item.recordId);
              break;
            case "DELETE":
              await this.supabaseClient
                .from(item.tableName)
                .delete()
                .eq("id", item.recordId);
              break;
          }

          // Mark as completed
          await this.localDb.offlineQueue.update({
            where: { id: item.id },
            data: { status: "completed" },
          });

          // Update sync status in original record
          if (item.action !== "DELETE") {
            await (this.localDb as any)[item.tableName].update({
              where: { id: item.recordId },
              data: { needsSync: false, syncedAt: new Date() },
            });
          }
        } catch (error) {
          // Mark as failed and increment retry count
          await this.localDb.offlineQueue.update({
            where: { id: item.id },
            data: {
              status: item.retries >= item.maxRetries ? "failed" : "pending",
              retries: item.retries + 1,
              error: error instanceof Error ? error.message : "Unknown error",
            },
          });
        }
      }

      // Clean up completed items older than 7 days
      await this.localDb.offlineQueue.deleteMany({
        where: {
          status: "completed",
          createdAt: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      });
    } catch (error) {
      console.error("Error processing offline queue:", error);
    }
  }

  private async syncFromCloud() {
    // Pull recent changes from cloud (optional)
    // Implementation depends on your sync strategy
  }

  // Utility methods
  async getStorageInfo() {
    const stats = (await this.localDb.$queryRaw`
      SELECT 
        name as tableName,
        COUNT(*) as recordCount
      FROM sqlite_master 
      WHERE type='table' 
      AND name NOT LIKE 'sqlite_%'
      GROUP BY name
    `) as any[];

    const dbSize = (await this.localDb.$queryRaw`
      SELECT page_count * page_size as size 
      FROM pragma_page_count(), pragma_page_size()
    `) as any[];

    return {
      tables: stats,
      totalSize: dbSize[0]?.size || 0,
      isOnline: this.isOnline,
      lastSync: new Date(),
    };
  }

  async getDeviceStatus() {
    const onlineDevices = await this.localDb.deviceExternal.count({
      where: { isOnline: true },
    });

    const totalDevices = await this.localDb.deviceExternal.count();

    const recentLogs = await this.localDb.loggedData.count({
      where: {
        timestamp: {
          gte: new Date(Date.now() - 5 * 60 * 1000), // Last 5 minutes
        },
      },
    });

    return {
      onlineDevices,
      totalDevices,
      recentLogs,
      connectivityStatus: this.isOnline ? "online" : "offline",
    };
  }

  // Cleanup old data untuk prevent storage bloat
  async cleanupOldData() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Keep only last 30 days of logged data
    await this.localDb.loggedData.deleteMany({
      where: { timestamp: { lt: thirtyDaysAgo } },
    });

    // Keep only last 7 days of alarm logs
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    await this.localDb.alarmLog.deleteMany({
      where: { timestamp: { lt: sevenDaysAgo } },
    });

    console.log("Database cleanup completed");
  }

  async disconnect() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    await this.localDb.$disconnect();
  }
}

// Singleton instance
const dbConfig: DatabaseConfig = {
  useLocal: true,
  enableSync: false, // Disable Supabase sync
  supabaseUrl: undefined,
  supabaseKey: undefined,
};

export const db = new DatabaseService(dbConfig);
export default db;
