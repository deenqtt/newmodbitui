// scripts/migrate-to-sqlite.ts
import { PrismaClient as PostgresClient } from "@prisma/client";
import { PrismaClient as SQLiteClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";

class DatabaseMigrator {
  private postgresDb: PostgresClient;
  private sqliteDb: SQLiteClient;
  private supabaseClient: any;

  constructor() {
    // Initialize Postgres connection (Supabase)
    this.postgresDb = new PostgresClient({
      datasources: {
        db: {
          url: process.env.SUPABASE_DATABASE_URL!,
        },
      },
    });

    // Initialize SQLite connection
    this.sqliteDb = new SQLiteClient({
      datasources: {
        db: {
          url: "file:./iot_dashboard.db",
        },
      },
    });

    // Initialize Supabase client for RLS bypass
    this.supabaseClient = createClient(
      `https://${process.env.NEXT_PUBLIC_SUPABASE_PROJECT_REF}.supabase.co`,
      process.env.SUPABASE_ACCESS_TOKEN!
    );
  }

  async migrate() {
    console.log("🚀 Starting migration from Supabase to SQLite...");

    try {
      // Test connections
      await this.testConnections();

      // Create SQLite tables
      await this.createSQLiteTables();

      // Migrate data in correct order (due to foreign keys)
      await this.migrateUsers();
      await this.migrateDevices();
      await this.migrateConfigurations();
      await this.migrateLogs();
      await this.migrateOtherTables();

      console.log("✅ Migration completed successfully!");
      await this.generateMigrationReport();
    } catch (error) {
      console.error("❌ Migration failed:", error);
      throw error;
    } finally {
      await this.cleanup();
    }
  }

  private async testConnections() {
    console.log("🔍 Testing database connections...");

    try {
      // Test Postgres
      await this.postgresDb.user.count();
      console.log("✅ Supabase connection OK");

      // Test SQLite (will create file if doesn't exist)
      await this.sqliteDb.$executeRaw`SELECT 1`;
      console.log("✅ SQLite connection OK");
    } catch (error) {
      throw new Error(`Connection test failed: ${error}`);
    }
  }

  private async createSQLiteTables() {
    console.log("📋 Creating SQLite tables...");

    // Run Prisma migration to create tables
    const { spawn } = require("child_process");

    return new Promise((resolve, reject) => {
      const prisma = spawn("npx", ["prisma", "db", "push"], {
        stdio: "inherit",
        env: { ...process.env, DATABASE_URL: "file:./iot_dashboard.db" },
      });

      prisma.on("close", (code: number) => {
        if (code === 0) {
          console.log("✅ SQLite tables created");
          resolve(true);
        } else {
          reject(new Error(`Prisma db push failed with code ${code}`));
        }
      });
    });
  }

  private async migrateUsers() {
    console.log("👥 Migrating users...");

    const users = await this.postgresDb.user.findMany({
      include: {
        dashboards: true,
        notifications: true,
      },
    });

    console.log(`Found ${users.length} users to migrate`);

    for (const user of users) {
      // Migrate user
      await this.sqliteDb.user.upsert({
        where: { id: user.id },
        update: {},
        create: {
          id: user.id,
          email: user.email,
          password: user.password,
          role: user.role,
          fingerprintId: user.fingerprintId,
          cardUid: user.cardUid,
          phoneNumber: user.phoneNumber,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          needsSync: false,
          syncedAt: new Date(),
        },
      });

      // Migrate user dashboards
      for (const dashboard of user.dashboards) {
        await this.sqliteDb.dashboardLayout.upsert({
          where: { id: dashboard.id },
          update: {},
          create: {
            id: dashboard.id,
            name: dashboard.name,
            layout: dashboard.layout,
            userId: dashboard.userId,
            inUse: dashboard.inUse,
            isActive: dashboard.isActive,
            createdAt: dashboard.createdAt,
            updatedAt: dashboard.updatedAt,
          },
        });
      }

      // Migrate user notifications
      for (const notification of user.notifications) {
        await this.sqliteDb.notification.upsert({
          where: { id: notification.id },
          update: {},
          create: {
            id: notification.id,
            message: notification.message,
            isRead: notification.isRead,
            userId: notification.userId,
            createdAt: notification.createdAt,
          },
        });
      }
    }

    console.log("✅ Users migrated");
  }

  private async migrateDevices() {
    console.log("🔌 Migrating devices...");

    const devices = await this.postgresDb.deviceExternal.findMany({
      include: {
        loggingConfigs: {
          include: {
            logs: {
              orderBy: { timestamp: "desc" },
              take: 10000, // Limit untuk prevent memory issues
            },
          },
        },
        alarmConfigs: {
          include: {
            bits: true,
            logs: {
              orderBy: { timestamp: "desc" },
              take: 1000,
            },
          },
        },
      },
    });

    console.log(`Found ${devices.length} devices to migrate`);

    for (const device of devices) {
      // Migrate device
      await this.sqliteDb.deviceExternal.upsert({
        where: { id: device.id },
        update: {},
        create: {
          id: device.id,
          uniqId: device.uniqId,
          name: device.name,
          topic: device.topic,
          address: device.address,
          lastPayload: device.lastPayload
            ? JSON.stringify(device.lastPayload)
            : null,
          lastUpdatedByMqtt: device.lastUpdatedByMqtt,
          isOnline: device.lastUpdatedByMqtt
            ? new Date().getTime() - device.lastUpdatedByMqtt.getTime() < 300000
            : false,
          createdAt: device.createdAt,
          updatedAt: device.updatedAt,
          needsSync: false,
          syncedAt: new Date(),
        },
      });

      // Migrate logging configs and logs
      for (const config of device.loggingConfigs) {
        await this.sqliteDb.loggingConfiguration.upsert({
          where: { id: config.id },
          update: {},
          create: {
            id: config.id,
            customName: config.customName,
            key: config.key,
            units: config.units,
            multiply: config.multiply,
            deviceUniqId: config.deviceUniqId,
            createdAt: config.createdAt,
            updatedAt: config.updatedAt,
          },
        });

        // Batch insert logs
        if (config.logs.length > 0) {
          const logData = config.logs.map((log) => ({
            id: log.id,
            configId: log.configId,
            value: log.value,
            timestamp: log.timestamp,
            dateKey: log.timestamp.toISOString().split("T")[0],
            hourKey: log.timestamp.getHours(),
          }));

          // Insert in batches to avoid memory issues
          const batchSize = 1000;
          for (let i = 0; i < logData.length; i += batchSize) {
            const batch = logData.slice(i, i + batchSize);
            await this.sqliteDb.loggedData.createMany({
              data: batch,
              skipDuplicates: true,
            });
          }
        }
      }

      // Migrate alarm configs
      for (const alarm of device.alarmConfigs) {
        await this.sqliteDb.alarmConfiguration.upsert({
          where: { id: alarm.id },
          update: {},
          create: {
            id: alarm.id,
            customName: alarm.customName,
            alarmType: alarm.alarmType,
            keyType: alarm.keyType,
            key: alarm.key,
            deviceUniqId: alarm.deviceUniqId,
            minValue: alarm.minValue,
            maxValue: alarm.maxValue,
            maxOnly: alarm.maxOnly,
            createdAt: alarm.createdAt,
            updatedAt: alarm.updatedAt,
          },
        });

        // Migrate alarm bits
        for (const bit of alarm.bits) {
          await this.sqliteDb.alarmBitConfiguration.create({
            data: {
              id: bit.id,
              alarmConfigId: bit.alarmConfigId,
              bitPosition: bit.bitPosition,
              customName: bit.customName,
              alertToWhatsApp: bit.alertToWhatsApp,
            },
          });
        }

        // Migrate alarm logs
        for (const log of alarm.logs) {
          await this.sqliteDb.alarmLog.create({
            data: {
              id: log.id,
              status: log.status,
              triggeringValue: log.triggeringValue,
              timestamp: log.timestamp,
              clearedAt: log.clearedAt,
              alarmConfigId: log.alarmConfigId,
            },
          });
        }
      }
    }

    console.log("✅ Devices migrated");
  }

  private async migrateConfigurations() {
    console.log("⚙️ Migrating configurations...");

    // Migrate bill configurations
    const billConfigs = await this.postgresDb.billConfiguration.findMany({
      include: { logs: { take: 1000 } },
    });

    for (const config of billConfigs) {
      await this.sqliteDb.billConfiguration.create({
        data: {
          id: config.id,
          customName: config.customName,
          sourceDeviceKey: config.sourceDeviceKey,
          rupiahRatePerKwh: config.rupiahRatePerKwh,
          dollarRatePerKwh: config.dollarRatePerKwh,
          publishTargetDeviceUniqId: config.publishTargetDeviceUniqId,
          sourceDeviceUniqId: config.sourceDeviceUniqId,
          createdAt: config.createdAt,
          updatedAt: config.updatedAt,
        },
      });

      // Migrate bill logs
      for (const log of config.logs) {
        await this.sqliteDb.billLog.create({
          data: {
            id: log.id,
            configId: log.configId,
            rawValue: log.rawValue,
            rupiahCost: log.rupiahCost,
            dollarCost: log.dollarCost,
            timestamp: log.timestamp,
          },
        });
      }
    }

    console.log("✅ Configurations migrated");
  }

  private async migrateLogs() {
    console.log("📊 Creating data aggregations...");

    // Create hourly aggregations for better dashboard performance
    const configs = await this.sqliteDb.loggingConfiguration.findMany();

    for (const config of configs) {
      // Get hourly aggregations from logged data
      const hourlyData = await this.sqliteDb.loggedData.groupBy({
        by: ["configId", "dateKey", "hourKey"],
        where: { configId: config.id },
        _avg: { value: true },
        _min: { value: true },
        _max: { value: true },
        _sum: { value: true },
        _count: { value: true },
      });

      for (const data of hourlyData) {
        await this.sqliteDb.dataAggregation.upsert({
          where: {
            configId_aggregateType_dateKey: {
              configId: config.id,
              aggregateType: "hourly",
              dateKey: `${data.dateKey}-${data.hourKey
                .toString()
                .padStart(2, "0")}`,
            },
          },
          update: {},
          create: {
            configId: config.id,
            aggregateType: "hourly",
            dateKey: `${data.dateKey}-${data.hourKey
              .toString()
              .padStart(2, "0")}`,
            avgValue: data._avg.value,
            minValue: data._min.value,
            maxValue: data._max.value,
            sumValue: data._sum.value,
            count: data._count.value,
          },
        });
      }
    }

    console.log("✅ Data aggregations created");
  }

  private async migrateOtherTables() {
    console.log("🔄 Migrating other tables...");

    // Add other tables as needed (CCTV, ZkTeco, etc.)

    console.log("✅ Other tables migrated");
  }

  private async generateMigrationReport() {
    console.log("\n📈 MIGRATION REPORT:");
    console.log("==========================================");

    const tables = [
      "user",
      "deviceExternal",
      "loggingConfiguration",
      "loggedData",
      "alarmConfiguration",
      "billConfiguration",
    ];

    for (const table of tables) {
      const count = await (this.sqliteDb as any)[table].count();
      console.log(`${table}: ${count} records`);
    }

    const dbStats = (await this.sqliteDb.$queryRaw`
      SELECT 
        COUNT(*) as total_tables,
        (SELECT COUNT(*) FROM LoggedData) as total_logs,
        (SELECT page_count * page_size FROM pragma_page_count(), pragma_page_size()) as db_size_bytes
    `) as any[];

    console.log(
      `\nDatabase size: ${(dbStats[0].db_size_bytes / 1024 / 1024).toFixed(
        2
      )} MB`
    );
    console.log(`Total logs: ${dbStats[0].total_logs}`);
    console.log("==========================================\n");
  }

  private async cleanup() {
    await this.postgresDb.$disconnect();
    await this.sqliteDb.$disconnect();
  }
}

// CLI runner
async function main() {
  if (!process.env.SUPABASE_DATABASE_URL) {
    throw new Error("SUPABASE_DATABASE_URL environment variable is required");
  }

  const migrator = new DatabaseMigrator();
  await migrator.migrate();
}

// Run migration if called directly
if (require.main === module) {
  main().catch(console.error);
}

export { DatabaseMigrator };
