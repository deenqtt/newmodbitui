# WhatsApp API Service Implementation & Testing Guide

## 🎯 Overview

Implementasi lengkap WhatsApp API service untuk sistem monitoring MODbit dengan integrasi Qontak API. Service ini mendukung berbagai jenis notifikasi termasuk maintenance, alarm, system notifications, dan bulk messaging.

## 📂 File Structure

```
lib/services/
├── whatsapp-service.ts        # Core WhatsApp service
└── whatsapp-logger.ts         # Logging service

app/api/whatsapp/
├── send/route.ts             # Send custom messages
├── config/route.ts           # Configuration management
├── maintenance/route.ts      # Maintenance notifications
├── alarm/route.ts            # Alarm notifications
└── bulk/route.ts             # Bulk operations

tests/
├── whatsapp-service.test.ts     # Unit tests
├── whatsapp-api.test.ts         # API route tests
└── whatsapp-integration.test.ts # Integration tests

scripts/
├── test-whatsapp.js            # Test runner
└── manual-test-whatsapp.js     # Manual testing
```

## 🔧 Configuration

### Environment Variables

```bash
# Qontak API Configuration
QONTAK_API_URL=https://service-chat.qontak.com/api/open/v1/broadcasts/whatsapp/direct
QONTAK_BEARER_TOKEN=your_bearer_token_here
QONTAK_CHANNEL_INTEGRATION_ID=your_channel_id_here
QONTAK_MESSAGE_TEMPLATE_ID=your_template_id_here
QONTAK_LANGUAGE=id

# Testing (optional)
TEST_PHONE_NUMBER=081234567890
```

### Konfigurasi di Qontak Dashboard

1. Buat channel WhatsApp di dashboard Qontak
2. Setup message template dengan parameter yang sesuai
3. Dapatkan Bearer Token dari API settings
4. Catat Channel Integration ID dan Message Template ID

## 🚀 Features

### ✅ Core Features

- **Multiple Notification Types**: Maintenance, Alarm, System, Custom, Bulk
- **Phone Number Formatting**: Automatic Indonesian (+62) format conversion
- **Message Templates**: Dynamic message generation with parameters
- **Error Handling**: Comprehensive error logging and recovery
- **Rate Limiting**: Built-in delays for bulk operations
- **Database Integration**: Logging notifications to database
- **Role-based Access**: Admin-only configuration access
- **Connection Testing**: Test API connectivity

### ✅ Service Types

#### 1. Maintenance Notifications
```typescript
const maintenanceData = {
  userName: 'John Technician',
  taskName: 'Server Maintenance',
  deviceName: 'Server-001',
  startTime: '2025-01-15 10:00:00',
  endTime: '2025-01-15 12:00:00',
  status: 'Scheduled',
  description: 'Monthly server check'
};

await whatsappService.sendMaintenanceNotification(
  '081234567890', 
  maintenanceData, 
  'user-123'
);
```

#### 2. Alarm Notifications
```typescript
const alarmData = {
  userName: 'Security Team',
  deviceName: 'Temperature Sensor 01',
  alarmType: 'High Temperature',
  severity: 'CRITICAL', // LOW, MEDIUM, HIGH, CRITICAL
  message: 'Temperature exceeded 80°C',
  timestamp: '2025-01-20 14:30:00',
  location: 'Server Room A'
};

await whatsappService.sendAlarmNotification('081234567890', alarmData);
```

#### 3. System Notifications
```typescript
const systemData = {
  title: 'System Maintenance',
  message: 'System akan maintenance dari 02:00-04:00',
  severity: 'WARNING', // INFO, WARNING, ERROR
  timestamp: '2025-01-25 01:45:00',
  additionalInfo: 'Semua layanan monitoring akan terpengaruh'
};

await whatsappService.sendSystemNotification(
  '081234567890',
  'System Admin',
  systemData
);
```

#### 4. Bulk Operations
```typescript
const recipients = [
  { phoneNumber: '081111111111', name: 'User 1' },
  { phoneNumber: '082222222222', name: 'User 2' },
  { phoneNumber: '083333333333', name: 'User 3' }
];

await whatsappService.sendBulkNotifications(
  recipients,
  'Emergency system maintenance notification',
  'system',
  'admin-123'
);
```

## 🧪 Testing

### Automated Tests

```bash
# Install test dependencies
npm install --save-dev jest @jest/globals ts-jest @types/jest

# Add to package.json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:whatsapp": "jest --testPathPattern=whatsapp"
  },
  "jest": {
    "preset": "ts-jest",
    "testEnvironment": "node",
    "setupFilesAfterEnv": ["<rootDir>/tests/setup.ts"],
    "testMatch": ["**/__tests__/**/*.test.(js|ts)", "**/*.test.(js|ts)"]
  }
}

# Run tests
npm run test:whatsapp
```

### Manual Testing

```bash
# Run manual test script
node scripts/manual-test-whatsapp.js

# Test configuration
node -e "require('./scripts/manual-test-whatsapp.js'); console.log(testConfiguration());"

# Test phone formatting
node -e "require('./scripts/manual-test-whatsapp.js'); console.log(testPhoneFormatting());"
```

### Test Coverage

- **Unit Tests** (whatsapp-service.test.ts):
  - Configuration management
  - Phone number formatting
  - Message template generation
  - Error handling scenarios
  - Service statistics

- **API Tests** (whatsapp-api.test.ts):
  - Authentication and authorization
  - Request validation
  - Response formatting
  - Error responses

- **Integration Tests** (whatsapp-integration.test.ts):
  - End-to-end workflows
  - Database integration
  - Logging verification
  - Bulk operation handling

## 📊 API Endpoints

### 1. Send Custom Message
```http
POST /api/whatsapp/send
Authorization: Required (any authenticated user)
Content-Type: application/json

{
  "phoneNumber": "081234567890",
  "recipientName": "John Doe",
  "message": "Hello from Modbo System",
  "additionalParams": []
}
```

### 2. Configuration Management
```http
GET /api/whatsapp/config
Authorization: Admin only

PUT /api/whatsapp/config
Authorization: Admin only
{
  "bearerToken": "new-token",
  "language": "en"
}

POST /api/whatsapp/config
Authorization: Admin only
{
  "testPhoneNumber": "081234567890"
}
```

### 3. Maintenance Notifications
```http
POST /api/whatsapp/maintenance
Authorization: Admin only
{
  "maintenanceId": 1,
  "phoneNumber": "081234567890"
}

GET /api/whatsapp/maintenance?maintenanceId=1
Authorization: Admin only
```

### 4. Alarm Notifications
```http
POST /api/whatsapp/alarm
Authorization: Admin only
{
  "phoneNumber": "081234567890",
  "userName": "Security Team",
  "deviceName": "Fire Sensor",
  "alarmType": "Fire Detected",
  "severity": "CRITICAL",
  "message": "Fire alarm triggered",
  "location": "Server Room"
}

GET /api/whatsapp/alarm
Authorization: Any authenticated user
# Returns severity levels and alarm templates
```

### 5. Bulk Operations
```http
POST /api/whatsapp/bulk
Authorization: Admin only
{
  "recipients": [
    {"phoneNumber": "081111111111", "name": "User 1"},
    {"phoneNumber": "082222222222", "name": "User 2"}
  ],
  "message": "Emergency notification",
  "notificationType": "system"
}

GET /api/whatsapp/bulk?limit=10&offset=0
Authorization: Admin only
# Returns bulk operation history and statistics
```

## 🔍 Monitoring & Logging

### WhatsApp Logger Features

- **Structured Logging**: Level-based logging (DEBUG, INFO, WARN, ERROR)
- **Persistent Storage**: Important events stored in database
- **Statistics**: Success rates, error tracking, performance metrics
- **Cleanup**: Automatic old log cleanup

### Log Types

- Message sent/failed events
- Configuration changes
- Connection test results
- Bulk operation summaries
- Rate limiting events

### Getting Log Statistics
```typescript
import { whatsappLogger } from '@/lib/services/whatsapp-logger';

const stats = await whatsappLogger.getLogStatistics(7); // Last 7 days
console.log(stats);
// {
//   totalLogs: 150,
//   errorCount: 5,
//   warningCount: 10,
//   infoCount: 135,
//   errorRate: "3.33%",
//   topErrors: [...]
// }
```

## 🚨 Error Handling

### Common Error Scenarios

1. **Configuration Errors**
   - Missing environment variables
   - Invalid API credentials
   - Template not found

2. **Network Errors**
   - API timeout
   - Connection refused
   - DNS resolution failure

3. **Rate Limiting**
   - Too many requests per minute
   - Daily quota exceeded

4. **Validation Errors**
   - Invalid phone number format
   - Missing required parameters
   - Invalid severity level

### Error Response Format
```json
{
  "success": false,
  "message": "Human readable error message",
  "error": "Technical error details",
  "errorCode": "HTTP_STATUS_OR_CUSTOM_CODE"
}
```

## 🔧 Troubleshooting

### Common Issues

1. **Service Not Configured**
   ```bash
   # Check configuration status
   curl -X GET /api/whatsapp/config \
     -H "Authorization: Bearer admin-token"
   ```

2. **Messages Not Sending**
   - Verify Qontak API credentials
   - Check template ID is correct
   - Validate phone number format
   - Review API rate limits

3. **Database Connection Issues**
   - Check Prisma connection
   - Verify notification table exists
   - Check database permissions

### Debug Mode
```typescript
// Enable detailed logging
process.env.WHATSAPP_DEBUG = 'true';

// Check service status
const status = whatsappService.getServiceStats();
console.log(status);
```

## 📈 Performance Considerations

### Rate Limiting
- **Bulk Operations**: 1 second delay between messages
- **API Limits**: Respect Qontak rate limits
- **Max Bulk Size**: 100 recipients per request

### Database Optimization
- Log cleanup runs automatically
- Only important events are persisted
- Indexed queries for performance

### Memory Usage
- Singleton pattern for service instances
- Efficient message template generation
- Automatic cleanup of old logs

## 🔄 Integration Examples

### Maintenance System Integration
```typescript
// In maintenance creation handler
const maintenance = await prisma.maintenance.create({...});

// Send WhatsApp notification
if (user.phoneNumber) {
  const notificationData = {
    userName: user.name,
    taskName: maintenance.name,
    deviceName: maintenance.deviceTarget.name,
    startTime: maintenance.startTask.toISOString(),
    endTime: maintenance.endTask.toISOString(),
    status: maintenance.status
  };

  await whatsappService.sendMaintenanceNotification(
    user.phoneNumber,
    notificationData,
    currentUser.id
  );
}
```

### Alarm System Integration
```typescript
// In alarm trigger handler
const alarmData = {
  userName: 'Security Team',
  deviceName: alarm.device.name,
  alarmType: alarm.type,
  severity: alarm.severity,
  message: alarm.message,
  timestamp: new Date().toISOString(),
  location: alarm.device.location
};

// Send to all admin users
const adminUsers = await prisma.user.findMany({
  where: { role: 'ADMIN', phoneNumber: { not: null } }
});

for (const admin of adminUsers) {
  await whatsappService.sendAlarmNotification(
    admin.phoneNumber,
    alarmData
  );
}
```

## 📝 Development Notes

### Service Architecture
- **Singleton Pattern**: One instance shared across app
- **Dependency Injection**: Logger injected for testability
- **Error Boundaries**: Graceful degradation on failures
- **Type Safety**: Full TypeScript support

### Testing Strategy
- **Unit Tests**: Test individual functions
- **API Tests**: Test HTTP endpoints
- **Integration Tests**: Test full workflows
- **Manual Tests**: Real API testing

### Future Enhancements
- [ ] Message scheduling
- [ ] Template management UI
- [ ] Delivery status tracking
- [ ] Message history dashboard
- [ ] Multi-language support
- [ ] Rich media support (images, documents)

## ✅ Implementation Status

✅ **Completed Features:**
- Core WhatsApp service with Qontak integration
- Multiple notification types (maintenance, alarm, system, custom, bulk)
- Comprehensive error handling and logging
- Phone number formatting for Indonesia
- Database integration for logging
- Role-based API access control
- Configuration management
- Connection testing
- Comprehensive test suite
- Documentation and examples

🎯 **Ready for Production Use**

Service ini sudah siap untuk digunakan di production dengan konfigurasi yang tepat. Pastikan semua environment variables sudah diset dan Qontak API credentials sudah valid.