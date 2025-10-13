// Simplified lazy loading approach for navigation optimization
export { LoadingPage } from './loading-page';

// Utility function untuk get page loading message berdasarkan path
export function getLoadingMessage(pathname: string): string {
  const pathMap: Record<string, string> = {
    '/': 'Loading Main Dashboard...',
    '/monitoring/layout-2d': 'Loading 2D Layout...',
    '/devices/devices-internal': 'Loading Device Management...',
    '/devices/devices-external': 'Loading External Devices...',
    '/devices/access-controllers': 'Loading Access Controllers...',
    '/devices/zigbee': 'Loading Zigbee Devices...',
    '/lo-ra-wan/device-list': 'Loading LoRaWAN Devices...',
    '/lo-ra-wan/device-profiles': 'Loading Device Profiles...',
    '/lo-ra-wan/applications': 'Loading Applications...',
    '/lo-ra-wan/gateways': 'Loading LoRaWAN Gateways...',
    '/lo-ra-wan/ec25-modem': 'Loading EC25 Modem Monitor...',
    '/control/logic': 'Loading Logic Control...',
    '/control/manual': 'Loading Manual Control...',
    '/control/schedule': 'Loading Schedule Control...',
    '/control/unified': 'Loading Unified Control...',
    '/control/value': 'Loading Value Control...',
    '/control/voice': 'Loading Voice Control...',
    '/payload/discover': 'Loading Payload Discovery...',
    '/payload/remapping': 'Loading Payload Remapping...',
    '/payload/static': 'Loading Static Payload...',
    '/info': 'Loading System Information...',
    '/alarms/alarm-management': 'Loading Alarm Configuration...',
    '/alarms/alarm-log-reports': 'Loading Alarm History...',
    '/analytics/devices-log-report': 'Loading Device Logs...',
    '/maintenance/schedule-management': 'Loading Maintenance Scheduler...',
    '/security-access/access-control': 'Loading Access Control...',
    '/security-access/surveillance-cctv': 'Loading CCTV Surveillance...',
    '/security-access/voice-recognition/relay-control': 'Loading Voice Recognition...',
    '/network/communication-setup': 'Loading Network Configuration...',
    '/network/mqtt-broker': 'Loading MQTT Broker Settings...',
    '/devices/devices-for-logging': 'Loading Logging Configuration...',
    '/system-config/user-management': 'Loading User Management...',
    '/system-config/power-analyzer': 'Loading Power Analysis...',
    '/system-config/system-backup': 'Loading System Backup...',
    '/network/register-snmp': 'Loading SNMP Configuration...',
    '/snmp-data-get': 'Loading SNMP Data Retrieval...',
    '/system-config/error-logs': 'Loading Error Logs...',
  };

  return pathMap[pathname] || 'Loading page...';
}
