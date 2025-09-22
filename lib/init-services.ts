// File: lib/init-services.ts
import { getAlarmMonitorService } from "./services/alarm-monitor";
import { getCalculationService } from "./services/calculation-service";
import { getHealthCheckService } from "./services/health-check";
import { getLogListenerService } from "./services/log-listener";

import { getStatsListenerService } from "./services/stats-listener";
import { getLoraListenerService } from "./services/lora-listener";
import { getCleanupService } from "./services/cleanup-service";
import { userSeederService } from "./services/user-seeder-service";
import { getGatewayStatsListenerService } from "./services/gateway-stats-listener";
// Import layanan lainnya
import { getEc25ListenerService } from "./services/ec25-listener";
import { getZigbeeListenerService } from "./services/zigbee-listener";
// Import thermal listener yang baru
import { getThermalListenerService } from "./services/thermal-listener";

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

  // Initialize all services
  getAlarmMonitorService();
  getCalculationService();
  getHealthCheckService();
  getLogListenerService();

  getStatsListenerService();
  // getLoraListenerService();
  getCleanupService();
  // getGatewayStatsListenerService();

  // Panggil layanan EC25 dan Zigbee
  getEc25ListenerService();
  getZigbeeListenerService();

  // Panggil thermal listener service yang baru
  getThermalListenerService();

  servicesInitialized = true;
}
