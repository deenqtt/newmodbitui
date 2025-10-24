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
import { getExternalDeviceListenerService } from "./services/external-device-listener";
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

  console.log("🚀 Starting background services...");

  // Background user seeding (silent)
  userSeederService.seedDefaultUsers().catch(() => {});

  // Initialize all services (silent where possible)
  getAlarmMonitorService();
  getCalculationService();
  getHealthCheckService();
  getLogListenerService();
  getZkTecoService();
  getStatsListenerService();
  getCleanupService();
  getZigbeeListenerService();
  getThermalListenerService();
  getExternalDeviceListenerService();
  getLoggingSchedulerService();
  getBillSchedulerService();

  // Start schedulers (minimal logging)
  nodeLocationStatusScheduler.start(1);

  // Start MQTT listener with delay
  setTimeout(async () => {
    await nodeTenantLocationMqttListener.start();
  }, 3000); // Reduced to 3 seconds

  servicesInitialized = true;
  console.log("✅ All services started");
}
