# NEXUS IoT Dashboard - Task Documentation

## Project Overview
IoT monitoring and control platform for wastewater treatment system with MQTT integration and real-time dashboard visualization.

## Device Configuration (TASK.md)

### External Devices (7 devices)
```json
[
  {
    "name": "SENSOR PH 1",
    "address": "1",
    "topic": "limbah/ph1",
    "uniqId": "limbah-ph1"
  },
  {
    "name": "SENSOR PH 2",
    "address": "2",
    "topic": "limbah/ph2",
    "uniqId": "limbah-ph2"
  },
  {
    "name": "SENSOR PH 3",
    "address": "5",
    "topic": "limbah/ph3",
    "uniqId": "limbah-ph3"
  },
  {
    "name": "WATER FLOW 1",
    "address": "3",
    "topic": "limbah/flow1",
    "uniqId": "limbah-flow1"
  },
  {
    "name": "WATER FLOW 2",
    "address": "4",
    "topic": "limbah/flow2",
    "uniqId": "limbah-flow2"
  },
  {
    "name": "AIR QUALITY 1",
    "address": null,
    "topic": "limbah/airquality1/sps30",
    "uniqId": "limbah-airquality1-sps30"
  },
  {
    "name": "AIR QUALITY 2",
    "address": null,
    "topic": "limbah/airquality2/sps30",
    "uniqId": "limbah-airquality2-sps30"
  }
]
```

### Logging Configurations (12 configs)
| Custom Name | Key | Units | Device | Interval |
|-------------|-----|-------|---------|----------|
| Flow Rate [Water Flow Meter 1] | flow_rate | L/s | limbah-flow1 | 15min |
| Flow Rate [Water Flow Meter 2] | flow_rate | L/s | limbah-flow2 | 15min |
| PH Index [Sensor PH 1] | ph | % | limbah-ph1 | 15min |
| PH Index [Sensor PH 2] | ph | % | limbah-ph2 | 15min |
| PH Index [Sensor PH 3] | ph | % | limbah-ph3 | 15min |
| PM 2.5 [Air Quality 1] | pm2_5 | µg/m³ | limbah-airquality1-sps30 | 15min |
| PM 2.5 [Air Quality 2] | pm2_5 | µg/m³ | limbah-airquality2-sps30 | 15min |
| Temp Index [Sensor PH 1] | temp | C | limbah-ph1 | 15min |
| Temp Index [Sensor PH 2] | temp | C | limbah-ph2 | 15min |
| Temp Index [Sensor PH 3] | temp | C | limbah-ph3 | 15min |
| Total Flow/Month [Water Flow Sensor 1] | total_flow_this_month | L | limbah-flow1 | 15min |
| Total Flow/Month [Water Flow Sensor 2] | total_flow_this_month | L | limbah-flow2 | 15min |

### Alarm Configurations (18 configs)
| Alarm Type | Severity | Parameter | Threshold | Device |
|------------|----------|-----------|-----------|--------|
| PH Critical Low | CRITICAL | ph < 2.0 | - | limbah-ph1 |
| PH Critical High | CRITICAL | ph > 12.0 | - | All PH sensors |
| Temperature Critical High | CRITICAL | temp > 60.0°C | - | limbah-ph1 |
| Flow Rate Critical No Flow | CRITICAL | flow_rate < 0.5 L/s | - | All flow sensors |
| PM2.5 Critical High | CRITICAL | pm2_5 > 100 µg/m³ | - | limbah-airquality1-sps30 |
| PM10 Critical High | CRITICAL | pm10_0 > 200 µg/m³ | - | limbah-airquality2-sps30 |

### Dashboard Widgets (19 widgets)
- **Icon Status Cards**: 15 cards showing real-time sensor values
- **Multi-Series Charts**: 5 charts for data visualization
  - pH Level Meter (all 3 sensors)
  - Temperature Index (all 3 sensors)
  - Flow Rate (both flow meters)
  - Total Flow/Month (both flow meters)
  - Air Quality (both PM2.5 sensors)

## Maintenance Schedules (7 schedules)
Monthly maintenance tasks for all equipment:
- PH sensors: 3 tasks (calibration, cleaning)
- Flow meters: 2 tasks (inspection, verification)
- Air quality sensors: 2 tasks (cleaning, filter replacement)

## Updated Files
- ✅ `scripts/seed-devices.js` - Updated with new device IDs
- ✅ `scripts/seed-logging-configs.js` - Updated with new logging configs
- ✅ `scripts/seed-alarm-configs.js` - Updated with 18 alarm configs
- ✅ `scripts/seed-maintenance.js` - Updated with monthly schedules
- ✅ `scripts/seed-dashboard.js` - Updated with latest dashboard layout

## Deployment Status
- ✅ Application runs without permission errors
- ✅ All MQTT services connected
- ✅ Database seeding functional
- ✅ Dashboard displays 19 widgets
- ✅ Real-time monitoring active

## MQTT Integration
- **Broker**: localhost:9000 (WebSocket)
- **Topics**: limbah/ph1, limbah/ph2, limbah/ph3, limbah/flow1, limbah/flow2, limbah/airquality1/sps30, limbah/airquality2/sps30
- **Status**: All services connected and active

## Final Result
✅ **Full IoT Monitoring System** operational
✅ **19 Dashboard Widgets** configured
✅ **12 Logging Configurations** active
✅ **18 Alarm Configurations** protecting equipment
✅ **7 Monthly Maintenance Schedules** organized
✅ **Real-time MQTT Communication** working
