# Alarm Configurations Seeding Guide

## Overview
This seed script creates comprehensive alarm configurations and demo alarm logs for testing the IoT dashboard's alarm monitoring system.

## Usage

### Individual Execution
```bash
npm run seed:alarm-configs
# or
node scripts/seed-alarm-configs.js
```

### As Part of Full Seeding
The alarm configurations are included in the main seeding process (`npm run db:seed`) by default.

## Data Created

### Alarm Configurations (19 total)
- **Critical Alarms (9)**: High-priority alerts requiring immediate attention
- **Major Alarms (8)**: Medium-priority alerts
- **Minor Alarms (2)**: Low-priority warnings
- **Bit Value Alarms (1)**: Digital status-based alerts

#### Alarm Types by Device:
- **PH Sensors**: 11 alarms (threshold-based for pH and temperature monitoring)
- **Flow Meters**: 4 alarms (flow rate monitoring with critical no-flow detection)
- **Air Quality**: 3 alarms (PM2.5, PM10, humidity monitoring)
- **Vibration**: 1 alarm (digital fault detection)

### Alarm Logs (8 demo logs)
- **Active (2)**: Currently active alarms
- **Acknowledged (1)**: Acknowledged but not resolved
- **Cleared (5)**: Historical alarms that were resolved

## Alarm Configuration Structure

| Field | Type | Description |
|-------|------|-------------|
| `id` | String | Unique predictable identifier |
| `customName` | String | Human-readable alarm description |
| `alarmType` | Enum | CRITICAL, MAJOR, MINOR |
| `keyType` | Enum | THRESHOLD, BIT_VALUE |
| `key` | String | Sensor key to monitor |
| `deviceUniqId` | String | Reference to DeviceExternal.uniqId |
| `minValue` | Float | Minimum threshold (optional) |
| `maxValue` | Float | Maximum threshold (optional) |
| `maxOnly` | Boolean | True if only max threshold applies |

## Key Features

### Threshold-Based Alarms
- **PH Monitoring**: Critical high (>12.0), Major high (>10.5), Minor low (<4.5)
- **Temperature**: Critical high (>60°C), Major high (>50°C), Critical low (<5°C)
- **Flow Rate**: Critical no-flow (<0.5), Major low (<2.0), Critical low (<1.0)
- **Air Quality**: PM2.5 critical (>100.0), PM10 major (>150.0), Humidity low (<20.0)

### Bit Value Alarms
- **Vibration Fault**: Digital status monitoring using bit fields

## Dashboard Integration

### Widgets that Use These Alarms:
- **AlarmLogList**: Displays all alarm logs with filtering
- **AlarmSummary**: Shows alarm statistics by type/status
- **Dashboard Alerts**: Real-time alarm notifications

### Real-time Monitoring:
- MQTT-based alarm triggering
- WhatsApp notifications (configurable)
- Alarm escalation workflows

## Customization

### Adding New Alarm Configurations:
1. Add entries to `ALARM_CONFIGS_DATA` array in `seed-alarm-configs.js`
2. Ensure device exists (run `seed-devices.js` first)
3. Use predictable ID format: `{device-key}-{alarm-type}-{suffix}`

### Environment Variables:
```bash
SEED_ALARM_CONFIGS=false  # Disable alarm seeding
```

## Dependencies
- Requires seeded devices (run `npm run seed:devices` first)
- Compatible with SQLite and PostgreSQL
- Works with Prisma Client v6.x

## Example Queries

```javascript
// Get active alarms
const activeAlarms = await prisma.alarmLog.findMany({
  where: { status: 'ACTIVE' },
  include: { alarmConfig: true, device: true }
});

// Get alarm configurations by device
const deviceAlarms = await prisma.alarmConfiguration.findMany({
  where: { deviceUniqId: 'limbah-ph1' }
});
```

## Testing
The seeded data provides a comprehensive test environment for:
- Alarm widget functionality
- Real-time alarm notifications
- Alarm history and analytics
- Multi-device alarm management
