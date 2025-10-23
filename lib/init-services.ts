// File: lib/init-services.ts
import { getAlarmMonitorService } from "./services/alarm-monitor";
import { getCalculationService } from "./services/calculation-service";
import { getHealthCheckService } from "./services/health-check";
import { getLogListenerService } from "./services/log-listener";
import { getZkTecoService } from "./services/zkteco-service";
import { getStatsListenerService } from "./services/stats-listener";
import { getLoraListenerService } from "./services/lora-listener";
import { getCleanupService } from "./services/cleanup-service";
import { userSeederService } from "./services/user-seeder-service";
import { getGatewayStatsListenerService } from "./services/gateway-stats-listener";
import { getEc25ListenerService } from "./services/ec25-listener";
import { getZigbeeListenerService } from "./services/zigbee-listener";
import { getThermalListenerService } from "./services/thermal-listener";
import { getBillSchedulerService } from "./services/bill-scheduler";

// 🆕 Import Logging Scheduler
import { getLoggingSchedulerService } from "./services/logging-scheduler";

// 🆕 Import NodeTenantLocation Status Scheduler
import { nodeLocationStatusScheduler } from "./services/node-tenant-location-service";

// 🆕 Import MQTT Listener for NodeTenantLocation
import { nodeTenantLocationMqttListener } from "./services/node-tenant-location-mqtt-listener";

let servicesInitialized = false;

export async function initializeBackgroundServices() {
  if (servicesInitialized) {
    return;
  }

  console.log("🚀 Initializing all background services for production...\n");

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
  getZkTecoService();
  getStatsListenerService();
  // getLoraListenerService();
  getCleanupService();
  // getGatewayStatsListenerService();
  getZigbeeListenerService();
  getThermalListenerService();

  // 🆕 Initialize Logging Scheduler Service
  getLoggingSchedulerService();
  getBillSchedulerService();

  // 🆕 Start NodeTenantLocation Status Scheduler
  try {
    nodeLocationStatusScheduler.start(1); // Monitor setiap 1 menit
    console.log("✅ NodeTenantLocation Status Scheduler started (1 minute intervals)");
  } catch (error) {
    console.error("❌ Failed to start NodeTenantLocation Status Scheduler:", error);
  }

  // 🆕 Start NodeTenantLocation MQTT Listener (setelah semua service lain ready)
  setTimeout(async () => {
    try {
      await nodeTenantLocationMqttListener.start();
      console.log("✅ NodeTenantLocation MQTT Listener started successfully");
    } catch (error) {
      console.error("❌ Failed to start NodeTenantLocation MQTT Listener:", error);
    }
  }, 5000); // Delay 5 detik agar MQTT connection sudah siap

  servicesInitialized = true;
  console.log("\n✅ All background services started successfully.\n");
}
