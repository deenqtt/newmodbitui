// File: lib/services/logging-scheduler.ts
import { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";

let instance: LoggingSchedulerService | null = null;

export class LoggingSchedulerService {
  private activeTimers: Map<string, { timer: NodeJS.Timeout; intervalTimer: NodeJS.Timeout | null }>;
  private reloadRequested: boolean = false;
  private hostname: string;
  private port: number;
  private isInitialized: boolean = false;
  private isShuttingDown: boolean = false;

  constructor(hostname: string = "localhost", port: number = 3000) {
    this.activeTimers = new Map();
    this.hostname = hostname;
    this.port = port;

    console.log("📅 Logging Scheduler Service: Instance created");
  }

  /**
   * Calculate next run time based on config creation time
   * Returns aligned time to avoid drift
   */
  private calculateNextRunTime(config: any) {
    const now = new Date();
    const createdAt = new Date(config.createdAt);
    const intervalMs = config.loggingIntervalMinutes * 60 * 1000;

    const elapsedMs = now.getTime() - createdAt.getTime();
    const remainderMs = elapsedMs % intervalMs;
    const nextRunMs = intervalMs - remainderMs;

    const nextRun = new Date(now.getTime() + nextRunMs);

    return { nextRun, delayMs: nextRunMs, intervalMs };
  }

  /**
   * Fetch fresh config from database
   */
  private async getFreshConfig(configId: string) {
    try {
      const config = await prisma.loggingConfiguration.findUnique({
        where: { id: configId },
        include: { device: true },
      });
      return config;
    } catch (error) {
      console.error(`❌ Failed to fetch config ${configId}:`, error);
      return null;
    }
  }

  /**
   * Log single config with retry mechanism
   */
  private async logSingleConfig(configId: string, retryCount: number = 0) {
    // Fetch fresh config from database
    const config = await this.getFreshConfig(configId);

    if (!config) {
      console.error(`⚠️  Config ${configId} not found in database, skipping...`);
      return { success: false, logged: 0 };
    }

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

      return { success: true, logged: result.logged || 0 };
    } catch (error: any) {
      if (error.name === "AbortError") {
        console.error(`❌ Timeout logging ${config.customName} (>30s)`);
      } else {
        console.error(`❌ Failed to log ${config.customName}:`, error.message);
      }

      // Retry logic (max 2 retries)
      if (retryCount < 2) {
        console.log(`🔄 Retrying... (attempt ${retryCount + 2}/3)`);
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s
        return this.logSingleConfig(configId, retryCount + 1);
      }

      return { success: false, logged: 0 };
    }
  }

  /**
   * Schedule single config logging with proper interval management
   */
  private scheduleConfigLogging(config: any) {
    // Clear existing timers for this config to prevent duplicates
    if (this.activeTimers.has(config.id)) {
      console.log(`⏭️  Config ${config.customName} already scheduled, clearing old timers...`);
      this.clearConfigTimer(config.id);
    }

    const { nextRun, delayMs, intervalMs } = this.calculateNextRunTime(config);

    console.log(`📅 Scheduling: ${config.customName}`);
    console.log(`   • Interval: ${config.loggingIntervalMinutes} minutes`);
    console.log(
      `   • Next run: ${nextRun.toLocaleString("id-ID")} (in ${Math.round(
        delayMs / 1000
      )}s)`
    );

    // Initial timer for first run
    const initialTimer = setTimeout(async () => {
      await this.executeAndReschedule(config.id);
    }, delayMs);

    // Store timer (intervalTimer will be set after first execution)
    this.activeTimers.set(config.id, {
      timer: initialTimer,
      intervalTimer: null
    });
  }

  /**
   * Execute logging and reschedule next run
   */
  private async executeAndReschedule(configId: string) {
    // Check if config is still active
    if (!this.activeTimers.has(configId) || this.isShuttingDown) {
      return;
    }

    // Fetch fresh config to get latest settings
    const config = await this.getFreshConfig(configId);

    if (!config) {
      console.log(`⏭️  Config ${configId} no longer exists, removing timer...`);
      this.clearConfigTimer(configId);
      return;
    }

    // Execute logging
    await this.logSingleConfig(configId);

    // Check again if still active after logging
    if (!this.activeTimers.has(configId) || this.isShuttingDown) {
      return;
    }

    // Schedule next execution using setInterval for consistency
    const intervalMs = config.loggingIntervalMinutes * 60 * 1000;

    const intervalTimer = setInterval(async () => {
      // Check if still active
      if (!this.activeTimers.has(configId) || this.isShuttingDown) {
        if (intervalTimer) clearInterval(intervalTimer);
        return;
      }

      // Execute logging
      await this.logSingleConfig(configId);
    }, intervalMs);

    // Update timer data
    const timerData = this.activeTimers.get(configId);
    if (timerData) {
      timerData.intervalTimer = intervalTimer;
    }
  }

  /**
   * Clear all timers for a specific config
   */
  private clearConfigTimer(configId: string) {
    const timerData = this.activeTimers.get(configId);
    if (timerData) {
      clearTimeout(timerData.timer);
      if (timerData.intervalTimer) {
        clearInterval(timerData.intervalTimer);
      }
      this.activeTimers.delete(configId);
    }
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
   * Reload configurations (add new, remove deleted, update changed)
   */
  public async reloadConfigs() {
    try {
      console.log("\n🔄 Reloading logging configuration...");

      const currentConfigs = await prisma.loggingConfiguration.findMany({
        include: { device: true },
      });

      const currentConfigIds = new Set(currentConfigs.map((c) => c.id));

      // Stop & remove deleted configs
      for (const [configId] of this.activeTimers.entries()) {
        if (!currentConfigIds.has(configId)) {
          const config = await this.getFreshConfig(configId);
          const configName = config?.customName || configId;
          this.clearConfigTimer(configId);
          console.log(`🛑 Stopped & removed: ${configName}`);
        }
      }

      // Add new configs OR reschedule existing ones (to apply changes)
      for (const config of currentConfigs) {
        if (!this.activeTimers.has(config.id)) {
          console.log(`🆕 New config detected: ${config.customName}`);
          this.scheduleConfigLogging(config);
        } else {
          // Reschedule existing config to apply any changes (interval, multiply, etc)
          console.log(`🔄 Updating config: ${config.customName}`);
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

    this.isShuttingDown = true;

    // Clear all timers
    this.activeTimers.forEach((timerData, configId) => {
      this.clearConfigTimer(configId);
    });
    this.activeTimers.clear();

    this.isInitialized = false;

    console.log("✅ All timers stopped");
  }

  /**
   * Get status
   */
  public async getStatus() {
    const configs = [];

    for (const [configId] of this.activeTimers.entries()) {
      const config = await this.getFreshConfig(configId);
      if (config) {
        configs.push({
          id: config.id,
          name: config.customName,
          interval: config.loggingIntervalMinutes,
        });
      }
    }

    return {
      initialized: this.isInitialized,
      activeTimers: this.activeTimers.size,
      configs,
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
