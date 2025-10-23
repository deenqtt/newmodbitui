// File: lib/services/bill-scheduler.ts
// Purpose: Database logging ONLY - setiap 10 menit
// Bill calculation & MQTT publish ditangani oleh Calculation Service (realtime)
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

let instance: BillSchedulerService | null = null;

export class BillSchedulerService {
  private activeTimers: Map<string, { timer: NodeJS.Timeout; config: any }>;
  private reloadRequested: boolean = false;
  private hostname: string;
  private port: number;
  private isInitialized: boolean = false;
  private readonly BILL_INTERVAL_MINUTES = 10; // ✅ FIXED 10 MENIT untuk DB logging

  constructor(hostname: string = "localhost", port: number = 3000) {
    this.activeTimers = new Map();
    this.hostname = hostname;
    this.port = port;

    console.log("💰 Bill Scheduler Service: DB Logging Only (10min intervals)");
  }

  /**
   * Calculate next run time based on config creation time
   */
  private calculateNextRunTime(config: any) {
    const now = new Date();
    const createdAt = new Date(config.createdAt);
    const intervalMs = this.BILL_INTERVAL_MINUTES * 60 * 1000; // 10 menit = 600000ms

    const elapsedMs = now.getTime() - createdAt.getTime();
    const remainderMs = elapsedMs % intervalMs;
    const nextRunMs = intervalMs - remainderMs;

    const nextRun = new Date(now.getTime() + nextRunMs);

    return { nextRun, delayMs: nextRunMs };
  }

  /**
   * Process single bill config
   */
  private async processSingleBillConfig(config: any) {
    const now = new Date().toLocaleString("id-ID", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    console.log(
      `\n💰 [${now}] Processing Bill: ${config.customName} (${this.BILL_INTERVAL_MINUTES}min)`
    );

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

      const response = await fetch(
        `http://${this.hostname}:${this.port}/api/cron/bill-logger?configId=${config.id}`,
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
        `✅ ${config.customName}: processed ${
          result.logged || 0
        } bill entry(ies)`
      );
    } catch (error: any) {
      if (error.name === "AbortError") {
        console.error(`❌ Timeout processing ${config.customName} (>30s)`);
      } else {
        console.error(
          `❌ Failed to process ${config.customName}:`,
          error.message
        );
      }
    }
  }

  /**
   * Schedule single config billing (recursive setTimeout)
   */
  private scheduleBillConfig(config: any) {
    if (this.activeTimers.has(config.id)) {
      console.log(`⏭️  Bill config ${config.customName} already scheduled`);
      return;
    }

    const { nextRun, delayMs } = this.calculateNextRunTime(config);

    console.log(`📅 Scheduling Bill: ${config.customName}`);
    console.log(`   • Interval: ${this.BILL_INTERVAL_MINUTES} minutes (FIXED)`);
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

      // Process bill
      await this.processSingleBillConfig(config);

      // Schedule next run (recursive)
      const intervalMs = this.BILL_INTERVAL_MINUTES * 60 * 1000;
      const nextTimer = setTimeout(
        async function runNext(this: BillSchedulerService) {
          if (!this.activeTimers.has(config.id)) return;

          await this.processSingleBillConfig(config);

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
   * Setup all bill configs (DB logging only)
   */
  public async setupAllConfigs() {
    try {
      console.log("\n🔄 Setting up bill schedulers (DB logging only)...");

      const configs = await prisma.billConfiguration.findMany({
        include: {
          sourceDevice: true,
          publishTargetDevice: true,
        },
      });

      if (configs.length === 0) {
        console.log("⚠️  No bill configurations found.");
        return;
      }

      console.log(`\n📊 Found ${configs.length} bill configuration(s)\n`);

      // Schedule 10-minute logging untuk setiap config
      for (const config of configs) {
        this.scheduleBillConfig(config);
      }

      console.log(
        `\n🎉 All bill configs scheduled! (${this.activeTimers.size} total)\n`
      );
    } catch (error) {
      console.error("❌ Error setting up bill configs:", error);
      throw error;
    }
  }

  /**
   * Reload configurations (add new, remove deleted)
   */
  public async reloadConfigs() {
    try {
      console.log("\n🔄 Reloading bill configuration...");

      const currentConfigs = await prisma.billConfiguration.findMany({
        include: {
          sourceDevice: true,
          publishTargetDevice: true,
        },
      });

      const currentConfigIds = new Set(currentConfigs.map((c) => c.id));

      // Stop & remove deleted configs
      for (const [configId, timerData] of this.activeTimers.entries()) {
        if (!currentConfigIds.has(configId)) {
          clearTimeout(timerData.timer);
          this.activeTimers.delete(configId);
          console.log(
            `🛑 Stopped & removed bill: ${timerData.config.customName}`
          );
        }
      }

      // Add new configs
      for (const config of currentConfigs) {
        if (!this.activeTimers.has(config.id)) {
          console.log(`🆕 New bill config detected: ${config.customName}`);
          this.scheduleBillConfig(config);
        }
      }

      console.log(
        `\n✅ Reload complete. Active bill timers: ${this.activeTimers.size}\n`
      );
    } catch (error) {
      console.error("❌ Error reloading bill configs:", error);
      throw error;
    }
  }

  /**
   * Request reload (called by API)
   */
  public requestReload() {
    console.log("[Bill Scheduler] 🔄 Reload requested");
    this.reloadRequested = true;
  }

  /**
   * Start auto-reload polling
   */
  private startAutoReloadPolling(intervalMs: number = 5000) {
    setInterval(async () => {
      if (this.reloadRequested) {
        console.log(
          "\n🔄 [BILL AUTO-CHECK] Reload flag detected, reloading..."
        );
        this.reloadRequested = false;
        await this.reloadConfigs();
      }
    }, intervalMs);

    console.log(
      `🔄 Bill auto-reload polling started (check every ${intervalMs / 1000}s)`
    );
  }

  /**
   * Initialize scheduler
   */
  public async initialize() {
    if (this.isInitialized) {
      console.log("ℹ️  Bill Scheduler already initialized");
      return;
    }

    try {
      console.log("\n╔══════════════════════════════════════╗");
      console.log("║   BILL SCHEDULER SERVICE             ║");
      console.log("║   DB Logging Only (10min intervals)  ║");
      console.log("║   (MQTT publish by Calculation Svc)  ║");
      console.log("╚══════════════════════════════════════╝\n");

      // Setup all bill configs
      await this.setupAllConfigs();

      // Start auto-reload polling
      this.startAutoReloadPolling(5000);

      this.isInitialized = true;

      console.log("🎉 Bill Scheduler Service ready!");
      console.log("💡 DB Logging: every 10 minutes");
      console.log("💡 MQTT Publishing: handled by Calculation Service (realtime)");
      console.log("💡 Auto-reload polling: every 5s\n");
    } catch (error) {
      console.error("❌ Failed to initialize Bill Scheduler:", error);
      throw error;
    }
  }

  /**
   * Shutdown gracefully
   */
  public shutdown() {
    console.log("\n🛑 Shutting down Bill Scheduler...");

    // Stop all timers
    this.activeTimers.forEach(({ timer }) => clearTimeout(timer));
    this.activeTimers.clear();

    this.isInitialized = false;

    console.log("✅ All bill timers stopped");
  }

  /**
   * Get status
   */
  public getStatus() {
    return {
      initialized: this.isInitialized,
      activeTimers: this.activeTimers.size,
      intervalMinutes: this.BILL_INTERVAL_MINUTES,
      configs: Array.from(this.activeTimers.values()).map(({ config }) => ({
        id: config.id,
        name: config.customName,
        sourceDevice: config.sourceDevice?.name,
        publishDevice: config.publishTargetDevice?.name,
      })),
    };
  }
}

/**
 * Get singleton instance
 */
export function getBillSchedulerService(): BillSchedulerService {
  if (!instance) {
    instance = new BillSchedulerService();

    // Auto-initialize
    instance.initialize().catch((error) => {
      console.error("❌ Failed to auto-initialize Bill Scheduler:", error);
    });
  }

  return instance;
}

/**
 * Get instance (for API access) - may return null if not initialized yet
 */
export function getBillSchedulerInstance(): BillSchedulerService | null {
  return instance;
}
