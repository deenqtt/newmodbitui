// File: lib/services/logging-scheduler.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

let instance: LoggingSchedulerService | null = null;

export class LoggingSchedulerService {
  private activeTimers: Map<string, { timer: NodeJS.Timeout; config: any }>;
  private reloadRequested: boolean = false;
  private hostname: string;
  private port: number;
  private isInitialized: boolean = false;

  constructor(hostname: string = "localhost", port: number = 3000) {
    this.activeTimers = new Map();
    this.hostname = hostname;
    this.port = port;

    console.log("📅 Logging Scheduler Service: Instance created");
  }

  /**
   * Calculate next run time based on config creation time
   */
  private calculateNextRunTime(config: any) {
    const now = new Date();
    const createdAt = new Date(config.createdAt);
    const intervalMs = config.loggingIntervalMinutes * 60 * 1000;

    const elapsedMs = now.getTime() - createdAt.getTime();
    const remainderMs = elapsedMs % intervalMs;
    const nextRunMs = intervalMs - remainderMs;

    const nextRun = new Date(now.getTime() + nextRunMs);

    return { nextRun, delayMs: nextRunMs };
  }

  /**
   * Log single config
   */
  private async logSingleConfig(config: any) {
    const now = new Date().toLocaleString("id-ID", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    console.log(
      `\n🕐 [${now}] Logging: ${config.customName} (${config.loggingIntervalMinutes}min)`
    );

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

      const response = await fetch(
        `http://${this.hostname}:${this.port}/api/cron/log-data?configId=${config.id}`,
        {
          method: "GET",
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log(
        `✅ ${config.customName}: logged ${result.logged || 0} entry(ies)`
      );
    } catch (error: any) {
      if (error.name === "AbortError") {
        console.error(`❌ Timeout logging ${config.customName} (>30s)`);
      } else {
        console.error(`❌ Failed to log ${config.customName}:`, error.message);
      }
    }
  }

  /**
   * Schedule single config logging (recursive setTimeout)
   */
  private scheduleConfigLogging(config: any) {
    if (this.activeTimers.has(config.id)) {
      console.log(`⏭️  Config ${config.customName} already scheduled`);
      return;
    }

    const { nextRun, delayMs } = this.calculateNextRunTime(config);

    console.log(`📅 Scheduling: ${config.customName}`);
    console.log(`   • Interval: ${config.loggingIntervalMinutes} minutes`);
    console.log(
      `   • Next run: ${nextRun.toLocaleString("id-ID")} (in ${Math.round(
        delayMs / 1000
      )}s)`
    );

    const timer = setTimeout(async () => {
      // Check if still active
      if (!this.activeTimers.has(config.id)) {
        console.log(`⏭️  Skipping ${config.customName} (deleted)`);
        return;
      }

      // Log data
      await this.logSingleConfig(config);

      // Schedule next run (recursive)
      const intervalMs = config.loggingIntervalMinutes * 60 * 1000;
      const nextTimer = setTimeout(
        async function runNext(this: LoggingSchedulerService) {
          if (!this.activeTimers.has(config.id)) return;

          await this.logSingleConfig(config);

          // Continue recursion
          const timer = setTimeout(runNext.bind(this), intervalMs);
          const timerData = this.activeTimers.get(config.id);
          if (timerData) {
            timerData.timer = timer;
          }
        }.bind(this),
        intervalMs
      );

      // Update timer
      const timerData = this.activeTimers.get(config.id);
      if (timerData) {
        timerData.timer = nextTimer;
      }
    }, delayMs);

    // Store timer
    this.activeTimers.set(config.id, { timer, config });
  }

  /**
   * Setup all configs
   */
  public async setupAllConfigs() {
    try {
      console.log("\n🔄 Setting up logging schedulers...");

      const configs = await prisma.loggingConfiguration.findMany({
        include: { device: true },
      });

      if (configs.length === 0) {
        console.log("⚠️  No logging configurations found.");
        return;
      }

      console.log(`\n📊 Found ${configs.length} logging configuration(s)\n`);

      for (const config of configs) {
        this.scheduleConfigLogging(config);
      }

      console.log(
        `\n🎉 All configs scheduled! (${this.activeTimers.size} total)\n`
      );
    } catch (error) {
      console.error("❌ Error setting up configs:", error);
      throw error;
    }
  }

  /**
   * Reload configurations (add new, remove deleted)
   */
  public async reloadConfigs() {
    try {
      console.log("\n🔄 Reloading logging configuration...");

      const currentConfigs = await prisma.loggingConfiguration.findMany({
        include: { device: true },
      });

      const currentConfigIds = new Set(currentConfigs.map((c) => c.id));

      // Stop & remove deleted configs
      for (const [configId, timerData] of this.activeTimers.entries()) {
        if (!currentConfigIds.has(configId)) {
          clearTimeout(timerData.timer);
          this.activeTimers.delete(configId);
          console.log(`🛑 Stopped & removed: ${timerData.config.customName}`);
        }
      }

      // Add new configs
      for (const config of currentConfigs) {
        if (!this.activeTimers.has(config.id)) {
          console.log(`🆕 New config detected: ${config.customName}`);
          this.scheduleConfigLogging(config);
        }
      }

      console.log(
        `\n✅ Reload complete. Active timers: ${this.activeTimers.size}\n`
      );
    } catch (error) {
      console.error("❌ Error reloading configs:", error);
      throw error;
    }
  }

  /**
   * Request reload (called by API)
   */
  public requestReload() {
    console.log("[Scheduler] 🔄 Reload requested");
    this.reloadRequested = true;
  }

  /**
   * Start auto-reload polling
   */
  private startAutoReloadPolling(intervalMs: number = 5000) {
    setInterval(async () => {
      if (this.reloadRequested) {
        console.log("\n🔄 [AUTO-CHECK] Reload flag detected, reloading...");
        this.reloadRequested = false;
        await this.reloadConfigs();
      }
    }, intervalMs);

    console.log(
      `🔄 Auto-reload polling started (check every ${intervalMs / 1000}s)`
    );
  }

  /**
   * Initialize scheduler
   */
  public async initialize() {
    if (this.isInitialized) {
      return; // Silent already initialized
    }

    try {
      // Setup all configs (silent setup)
      await this.setupAllConfigs();

      // Start auto-reload polling
      this.startAutoReloadPolling(5000);

      this.isInitialized = true;

      console.log("✅ Logging Scheduler ready (1 config, auto-reload enabled)");
    } catch (error: any) {
      console.error("❌ Logging Scheduler failed:", error?.message || error);
      throw error;
    }
  }

  /**
   * Shutdown gracefully
   */
  public shutdown() {
    console.log("\n🛑 Shutting down Logging Scheduler...");

    this.activeTimers.forEach(({ timer }) => clearTimeout(timer));
    this.activeTimers.clear();

    this.isInitialized = false;

    console.log("✅ All timers stopped");
  }

  /**
   * Get status
   */
  public getStatus() {
    return {
      initialized: this.isInitialized,
      activeTimers: this.activeTimers.size,
      configs: Array.from(this.activeTimers.values()).map(({ config }) => ({
        id: config.id,
        name: config.customName,
        interval: config.loggingIntervalMinutes,
      })),
    };
  }
}

/**
 * Get singleton instance
 */
export function getLoggingSchedulerService(): LoggingSchedulerService {
  if (!instance) {
    instance = new LoggingSchedulerService();

    // Auto-initialize
    instance.initialize().catch((error) => {
      console.error("❌ Failed to auto-initialize Logging Scheduler:", error);
    });
  }

  return instance;
}

/**
 * Get instance (for API access) - may return null if not initialized yet
 */
export function getLoggingSchedulerInstance(): LoggingSchedulerService | null {
  return instance;
}
