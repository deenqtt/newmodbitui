// File: lib/init-services.ts
import { getAlarmMonitorService } from "./services/alarm-monitor";
import { getCalculationService } from "./services/calculation-service";
import { getHealthCheckService } from "./services/health-check";
import { getLogListenerService } from "./services/log-listener";
import { getZkTecoService } from "./services/zkteco-service";
import { getStatsListenerService } from "./services/stats-listener";
import { getLoraListenerService } from "./services/lora-listener";
import { getCleanupService } from "./services/cleanup-service"; // <-- 1. IMPORT SERVICE BARU

let servicesInitialized = false;

export function initializeBackgroundServices() {
  if (servicesInitialized) {
    return;
  }

  console.log("Initializing all background services for production...");

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
