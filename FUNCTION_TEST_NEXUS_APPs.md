# NEXUS IOT DASHBOARD - TESTING CHECKLIST

| No | Nama Menu | UI | Read | Create | Update | Delete | Response | Comments |
|----|-----------|----|------|--------|--------|--------|----------|----------|
| 1 | Overview Dashboard (/) | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | Dashboard utama - check layout, widgets, real-time updates |
| 2 | Process Flow (/layout2d) | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | 2D flow diagram - check interactivity, data flow, zoom/pan |
| 3 | Node Map View (/manage-node-map) | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | Geographic mapping - check GPS data, marker clustering, map controls |
| 4 | Rack Management (/racks) | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | Rack layout management - check 3D views, device placement, capacity |
| 5 | External Devices (/devices/devices-external) | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | External IoT devices - check discovery, configuration, connectivity status |
| 6 | Device Log Configs (/devices/devices-for-logging) | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | Logging configuration - check data collection, intervals, storage settings |
| 7 | Internal Devices (/devices/devices-internal) | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | Internal network devices - check monitoring, control interfaces, status |
| 8 | Access Controllers (/devices/access-controllers) | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | Access control devices - check lock status, user permissions, activity logs |
| 9 | Zigbee Devices (/devices/zigbee) | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | Zigbee network devices - check pairing, mesh networking, signal strength |
| 10 | MQTT Broker (/network/mqtt-broker) | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | MQTT broker configuration - check topics, subscriptions, security settings |
| 11 | Communication Setup (/network/communication-setup) | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | Network communication settings - check protocols, ports, encryption |
| 12 | SNMP Registration (/network/register-snmp) | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | SNMP device registration - check OID mapping, polling intervals, traps |
| 13 | System Information (/info) | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | System status dashboard - check uptime, CPU, memory, network stats |
| 14 | Manual Control (/control/manual) | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | Direct device control - check button functions, feedback, safety interlocks |
| 15 | Scheduled Control (/control/schedule) | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | Automation scheduling - check cron jobs, recurring tasks, calendar integration |
| 16 | Logic Control (/control/logic) | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | Logic programming - check IF/THEN conditions, triggers, complex logic flows |
| 17 | Unified Control (/control/unified) | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | Multi-device control - check batch operations, group controls, presets |
| 18 | Value Control (/control/value) | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | Parameter adjustment - check setpoints, limits, validation rules |
| 19 | Voice Control (/control/voice) | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | Voice command interface - check speech recognition, command parsing, TTS |
| 20 | Alarm Management (/alarms/alarm-management) | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | Alarm configuration - check thresholds, priorities, escalation rules, notifications |
| 21 | Alarm Reports (/alarms/alarm-log-reports) | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | Historical alarm data - check reporting, filtering, export functions, trends |
| 22 | Device Analytics (/analytics/devices-log-report) | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | Device analytics - check usage statistics, performance metrics, predictive maintenance |
| 23 | Access Control (/security-access/access-control) | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | User authentication - check login/logout, session management, password policies |
| 24 | CCTV Surveillance (/security-access/surveillance-cctv) | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | Video surveillance - check camera feeds, recording, motion detection, storage |
| 25 | OpenVPN Access (/vpn) | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | VPN connection - check secure remote access, tunnel status, connection logs |
| 26 | VPN Configuration (/vpn/config) | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | VPN settings - check certificates, routing rules, security policies, monitoring |
| 27 | Gateways (/lo-ra-wan/gateways) | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | LoRaWAN gateways - check connectivity, packet forwarding, network coverage |
| 28 | Applications (/lo-ra-wan/applications) | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | Application servers - check payload processing, device authentication, integrations |
| 29 | Device Profiles (/lo-ra-wan/device-profiles) | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | Device templates - check parameter definitions, capabilities, configuration templates |
| 30 | Device List (/lo-ra-wan/device-list) | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | Connected devices - check device discovery, status monitoring, OTA updates |
| 31 | Mobile Modem (/lo-ra-wan/ec25-modem) | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | Cellular connectivity - check SIM management, signal strength, failover |
| 32 | User Management (/system-config/user-management) | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | User administration - check role assignment, permissions, account management |
| 33 | Tenant Management (/tenants) | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | Multi-tenancy - check tenant isolation, resource allocation, billing integration |
| 34 | Node Locations (/node-tenant-locations) | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | Geographic nodes - check GPS tracking, location mapping, boundary settings |
| 35 | Menu Management (/manage-menu) | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | Menu configuration - check role-based visibility, ordering, preset management |
| 36 | Menu Presets (/system-config/menu-presets) | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | Menu templates - check customization, user preferences, export/import |
| 37 | Maintenance Schedule (/maintenance/schedule-management) | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | Maintenance planning - check scheduling, task assignment, completion tracking |
| 38 | Node Info Discover (/node-info-discover) | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | Network discovery - check device scanning, identification, topology mapping |
| 39 | SNMP Data Manager (/snmp-data-get) | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | SNMP operations - check polling, trap handling, OID management, bulk operations |
| 40 | Payload Discovery (/payload/discover) | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | Payload analysis - check data decoding, format detection, protocol reverse engineering |
| 41 | Static Payload (/payload/static) | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | Payload templates - check predefined formats, validation rules, batch processing |
| 42 | Payload Remapping (/payload/remapping) | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | Data transformation - check field mapping, type conversion, data enrichment |
</content>

---

## WIDGET COMPONENTS (42 total)

### CRITICAL MONITORING - 10 widgets
- Access Controller Status
- Breaker Status
- Icon Status Card
- Single Value Card
- Grouped Icon Status
- Temperature Indicator Bar
- Analog Gauges
- Running Hours Log
- Calculated Parameter Card
- Multi-Protocol Monitor

### CONTROL SYSTEMS - 4 widgets
- Button Control Modbus
- Button Control Modbit
- Button Control Modular
- Lock Access Control

### DATA VISUALIZATION - 7 widgets
- Basic Trend Chart
- Chart Line
- Chart Bar
- Multi-Series Chart
- Power Analyzer Chart
- Power Generate Chart
- Energy Target Chart

### SYSTEM COMMUNICATION - 5 widgets
- Alarm Summary
- Alarm Log List
- Camera Last Snapshot
- CCTV Live Stream
- CCTV Monitor Videos

### NETWORK & IOT - 3 widgets
- Zigbee Device
- LoRaWAN Device Data
- Thermal Camera

### OPERATIONAL MANAGEMENT - 6 widgets
- Energy Target Gap
- Energy Usage Current Month
- Energy Usage Last Month
- Maintenance Calendar
- Maintenance List
- Maintenance Statistics

### ADVANCED VISUALIZATION - 6 widgets
- 3D Rack Server View
- 3D Containment View
- 3D Subrack View
- Modular 3D Device View
- 3D Container View
- Dashboard Shortcut

### WIDGET RENDERER - 1 component
- WidgetRenderer.tsx
