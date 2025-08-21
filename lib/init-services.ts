// File: lib/init-services.ts
import { getAlarmMonitorService } from "./services/alarm-monitor";
import { getCalculationService } from "./services/calculation-service";
import { getHealthCheckService } from "./services/health-check";
import { getLogListenerService } from "./services/log-listener";
import { getZkTecoService } from "./services/zkteco-service";
import { getStatsListenerService } from "./services/stats-listener";
import { getLoraListenerService } from "./services/lora-listener";
import { getCleanupService } from "./services/cleanup-service"; // <-- 1. IMPORT SERVICE BARU
import { userSeederService } from "./services/user-seeder-service";

let servicesInitialized = false;

export async function initializeBackgroundServices() {
  if (servicesInitialized) {
    return;
  }

  console.log("Initializing all background services for production...");

  // Seed default users first (if needed)
  try {
    await userSeederService.seedDefaultUsers();
  } catch (error) {
    console.error("Failed to seed default users:", error);
  }

  getAlarmMonitorService();
  getCalculationService();
  getHealthCheckService();
  getLogListenerService();
  getZkTecoService();
  getStatsListenerService();
  getLoraListenerService();
  getCleanupService(); // <-- 2. PANGGIL SERVICE BARU DI SINI

  servicesInitialized = true;
  console.log("All background services started.");
}
