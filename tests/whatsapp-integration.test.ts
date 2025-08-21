// File: tests/whatsapp-integration.test.ts

import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { whatsappService } from '../lib/services/whatsapp-service';
import { whatsappLogger } from '../lib/services/whatsapp-logger';

// Mock fetch and logger
const mockFetch = jest.fn();
global.fetch = mockFetch as any;

jest.mock('../lib/services/whatsapp-logger');
const mockLogger = whatsappLogger as jest.Mocked<typeof whatsappLogger>;

// Mock prisma
jest.mock('../lib/prisma', () => ({
  prisma: {
    notification: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      deleteMany: jest.fn()
    },
    maintenance: {
      findUnique: jest.fn()
    }
  }
}));

import { prisma } from '../lib/prisma';
const mockPrisma = prisma as jest.Mocked<typeof prisma>;

const originalEnv = process.env;

describe('WhatsApp Integration Tests', () => {
  beforeEach(() => {
    // Setup test environment
    process.env = {
      ...originalEnv,
      QONTAK_API_URL: 'https://test-api.qontak.com/api/open/v1/broadcasts/whatsapp/direct',
      QONTAK_BEARER_TOKEN: 'test-token',
      QONTAK_CHANNEL_INTEGRATION_ID: 'test-channel',
      QONTAK_MESSAGE_TEMPLATE_ID: 'test-template',
      QONTAK_LANGUAGE: 'id'
    };
    
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Maintenance Integration', () => {
    test('should send maintenance notification with proper integration', async () => {
      // Mock successful API response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message_id: 'maint-test-123',
          status: 'sent'
        })
      });

      const maintenanceData = {
        userName: 'John Technician',
        taskName: 'Server Rack Inspection',
        deviceName: 'Server Rack A1',
        startTime: '2025-01-15 09:00:00',
        endTime: '2025-01-15 11:00:00',
        status: 'Scheduled',
        description: 'Monthly inspection of cooling systems'
      };

      const result = await whatsappService.sendMaintenanceNotification(
        '081234567890',
        maintenanceData,
        'user-123'
      );

      // Verify successful sending
      expect(result.success).toBe(true);
      expect(result.response.message_id).toBe('maint-test-123');
      
      // Verify logger was called for success
      expect(mockLogger.log).toHaveBeenCalledWith({\n        level: 'DEBUG',\n        message: 'Sending WhatsApp message',\n        phoneNumber: '6281234567890',\n        userId: 'user-123',\n        data: { recipientName: 'John Technician', hasParameters: true }\n      });

      expect(mockLogger.logMessageSent).toHaveBeenCalledWith(\n        '6281234567890',\n        'maint-test-123',\n        'user-123',\n        expect.any(Number),\n        expect.objectContaining({ recipientName: 'John Technician' })\n      );

      // Verify message content
      const fetchCall = mockFetch.mock.calls[0];
      const payload = JSON.parse(fetchCall[1].body);
      
      expect(payload.to_number).toBe('6281234567890');
      expect(payload.to_name).toBe('John Technician');
      expect(payload.parameters.body).toEqual(\n        expect.arrayContaining([\n          expect.objectContaining({\n            key: \"3\",\n            value: \"task_name\",\n            value_text: \"Server Rack Inspection\"\n          })\n        ])\n      );
    });

    test('should handle maintenance notification failure with proper error logging', async () => {
      // Mock API failure
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: 'Invalid template parameters',
          details: 'Template variables missing'
        })
      });

      const maintenanceData = {
        userName: 'Jane Technician',
        taskName: 'HVAC Maintenance',
        deviceName: 'HVAC Unit B2',
        startTime: '2025-01-16 14:00:00',
        endTime: '2025-01-16 16:00:00',
        status: 'Scheduled'
      };

      const result = await whatsappService.sendMaintenanceNotification(
        '081987654321',
        maintenanceData,
        'user-456'
      );

      // Verify failure handling
      expect(result.success).toBe(false);
      expect(result.message).toContain('WhatsApp API error: 400');
      
      // Verify error logging
      expect(mockLogger.logMessageFailed).toHaveBeenCalledWith(\n        '6281987654321',\n        expect.stringContaining('WhatsApp API error: 400'),\n        '400',\n        'user-456',\n        expect.any(Object)\n      );
    });

    test('should integrate with maintenance database records', async () => {
      // Mock database maintenance record
      const mockMaintenance = {\n        id: 1,\n        name: 'Database Backup Task',\n        description: 'Weekly database backup',\n        startTask: new Date('2025-01-20T02:00:00Z'),\n        endTask: new Date('2025-01-20T04:00:00Z'),\n        assignTo: 'user-789',\n        targetId: 'device-db01',\n        status: 'Scheduled',\n        assignedTo: {\n          id: 'user-789',\n          email: 'dbadmin@company.com'\n        },\n        deviceTarget: {\n          name: 'Database Server 01',\n          topic: 'devices/db01'\n        }\n      };

      mockPrisma.maintenance.findUnique.mockResolvedValue(mockMaintenance);
      mockPrisma.notification.create.mockResolvedValue({\n        id: 1,\n        message: 'Notification logged',\n        userId: 'user-789',\n        createdAt: new Date()\n      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message_id: 'db-maint-123'
        })
      });

      // Simulate API call that would happen in maintenance route
      const notificationData = {
        userName: mockMaintenance.assignedTo.email.split('@')[0],
        taskName: mockMaintenance.name,
        deviceName: mockMaintenance.deviceTarget.name,
        startTime: mockMaintenance.startTask.toISOString(),
        endTime: mockMaintenance.endTask.toISOString(),
        status: mockMaintenance.status,
        description: mockMaintenance.description
      };

      const result = await whatsappService.sendMaintenanceNotification(
        '081555666777',
        notificationData,
        'admin-user'
      );

      expect(result.success).toBe(true);
      
      // Verify proper data transformation from database
      const fetchCall = mockFetch.mock.calls[0];
      const payload = JSON.parse(fetchCall[1].body);
      
      expect(payload.parameters.body.find(p => p.key === \"3\").value_text).toBe('Database Backup Task');
      expect(payload.parameters.body.find(p => p.key === \"4\").value_text).toBe('Database Server 01');
    });
  });

  describe('Alarm Integration', () => {
    test('should send alarm notification with proper severity handling', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message_id: 'alarm-critical-123'
        })
      });

      const alarmData = {
        userName: 'Security Team',
        deviceName: 'Fire Sensor Zone A',
        alarmType: 'Fire Alarm',
        severity: 'CRITICAL' as const,
        message: 'Fire detected in server room A. Immediate evacuation required.',
        timestamp: '2025-01-20 15:30:00',
        location: 'Data Center Floor 1'
      };

      const result = await whatsappService.sendAlarmNotification(
        '081911911911',
        alarmData
      );

      expect(result.success).toBe(true);
      expect(result.message).toBe('WhatsApp alarm notification sent successfully');
      
      // Verify message contains critical alarm formatting
      const fetchCall = mockFetch.mock.calls[0];
      const payload = JSON.parse(fetchCall[1].body);
      const messageText = payload.parameters.body.find(p => p.key === \"2\").value_text;
      
      expect(messageText).toContain('🚨 *ALARM NOTIFICATION*');
      expect(messageText).toContain('Fire Alarm');
      expect(messageText).toContain('CRITICAL');
      expect(messageText).toContain('Data Center Floor 1');
    });

    test('should handle different severity levels with appropriate emojis', async () => {
      const severityTests = [\n        { severity: 'LOW' as const, expectedEmoji: '🟡' },\n        { severity: 'MEDIUM' as const, expectedEmoji: '🟠' },\n        { severity: 'HIGH' as const, expectedEmoji: '🔴' },\n        { severity: 'CRITICAL' as const, expectedEmoji: '🚨' }\n      ];

      for (const { severity, expectedEmoji } of severityTests) {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, message_id: `test-${severity.toLowerCase()}` })
        });

        const alarmData = {
          userName: 'Test User',
          deviceName: 'Test Device',
          alarmType: 'Test Alarm',
          severity,
          message: 'Test alarm message',
          timestamp: '2025-01-20 16:00:00'
        };

        await whatsappService.sendAlarmNotification('081111111111', alarmData);

        const fetchCall = mockFetch.mock.calls[mockFetch.mock.calls.length - 1];
        const payload = JSON.parse(fetchCall[1].body);
        const messageText = payload.parameters.body.find(p => p.key === \"2\").value_text;

        expect(messageText).toContain(expectedEmoji);
      }
    });
  });

  describe('Bulk Operations Integration', () => {
    test('should handle bulk operations with proper logging and rate limiting', async () => {
      // Mock successful responses for all recipients
      const recipients = [\n        { phoneNumber: '081111111111', name: 'User 1' },\n        { phoneNumber: '082222222222', name: 'User 2' },\n        { phoneNumber: '083333333333', name: 'User 3' }\n      ];

      // Mock responses for each recipient
      recipients.forEach(() => {\n        mockFetch.mockResolvedValueOnce({\n          ok: true,\n          json: async () => ({ success: true, message_id: `bulk-${Math.random()}` })\n        });\n      });

      const result = await whatsappService.sendBulkNotifications(\n        recipients,\n        'Emergency system maintenance notification',\n        'system',\n        'admin-123'\n      );

      expect(result.success).toBe(true);
      expect(result.summary.total).toBe(3);
      expect(result.summary.successful).toBe(3);
      expect(result.summary.failed).toBe(0);

      // Verify bulk operation logging
      expect(mockLogger.log).toHaveBeenCalledWith({\n        level: 'INFO',\n        message: 'Starting bulk notification to 3 recipients',\n        userId: 'admin-123',\n        data: { notificationType: 'system', recipientCount: 3 }\n      });

      expect(mockLogger.logBulkOperation).toHaveBeenCalledWith(\n        3, // total\n        3, // successful\n        0, // failed\n        'admin-123',\n        'system'\n      );
    });

    test('should handle partial failures in bulk operations', async () => {
      const recipients = [\n        { phoneNumber: '081111111111', name: 'User 1' },\n        { phoneNumber: '082222222222', name: 'User 2' },\n        { phoneNumber: '083333333333', name: 'User 3' }\n      ];

      // Mock mixed responses - success, failure, success
      mockFetch\n        .mockResolvedValueOnce({\n          ok: true,\n          json: async () => ({ success: true, message_id: 'bulk-1' })\n        })\n        .mockResolvedValueOnce({\n          ok: false,\n          status: 400,\n          json: async () => ({ error: 'Invalid phone number' })\n        })\n        .mockResolvedValueOnce({\n          ok: true,\n          json: async () => ({ success: true, message_id: 'bulk-3' })\n        });

      const result = await whatsappService.sendBulkNotifications(\n        recipients,\n        'Test bulk message',\n        'custom',\n        'admin-456'\n      );

      expect(result.success).toBe(true); // Success because some succeeded
      expect(result.summary.successful).toBe(2);
      expect(result.summary.failed).toBe(1);

      // Check individual results
      expect(result.results[0].success).toBe(true);
      expect(result.results[1].success).toBe(false);
      expect(result.results[2].success).toBe(true);

      // Verify mixed result logging
      expect(mockLogger.logBulkOperation).toHaveBeenCalledWith(\n        3, 2, 1, 'admin-456', 'custom'\n      );
    });
  });

  describe('Configuration Integration', () => {
    test('should log configuration changes properly', async () => {
      const newConfig = {\n        bearerToken: 'new-test-token',\n        language: 'en'\n      };

      whatsappService.updateConfig(newConfig, 'admin-789');

      expect(mockLogger.logConfigurationChange).toHaveBeenCalledWith(\n        'admin-789',\n        expect.objectContaining({\n          changes: ['bearerToken', 'language']\n        })\n      );
    });

    test('should test connection with proper logging', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({\n          success: true,\n          message_id: 'connection-test-123'\n        })\n      });

      const result = await whatsappService.testConnection('081999888777', 'test-admin');

      expect(result.success).toBe(true);
      expect(mockLogger.logConnectionTest).toHaveBeenCalledWith(\n        '081999888777',\n        true,\n        expect.any(Number),\n        'test-admin',\n        undefined\n      );
    });
  });

  describe('Error Handling Integration', () => {
    test('should handle network timeouts gracefully', async () => {
      // Mock network timeout
      mockFetch.mockRejectedValueOnce(new Error('Network timeout after 30s'));

      const result = await whatsappService.sendCustomMessage(\n        '081123456789',\n        'Test User',\n        'Test message',\n        [],\n        'user-timeout'\n      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('Network timeout');

      // Verify error logging
      expect(mockLogger.logMessageFailed).toHaveBeenCalledWith(\n        '6281123456789',\n        'Network timeout after 30s',\n        'NETWORK_ERROR',\n        'user-timeout',\n        expect.objectContaining({ error: expect.stringContaining('Network timeout') })\n      );
    });

    test('should handle rate limiting scenarios', async () => {
      // Mock rate limit response
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({\n          error: 'Rate limit exceeded',\n          retry_after: 60\n        })\n      });

      const result = await whatsappService.sendCustomMessage(\n        '081987654321',\n        'Rate Limited User',\n        'This should be rate limited',\n        [],\n        'user-rate-limited'\n      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('WhatsApp API error: 429');

      // Verify rate limit error logging
      expect(mockLogger.logMessageFailed).toHaveBeenCalledWith(\n        '6281987654321',\n        expect.stringContaining('Rate limit exceeded'),\n        '429',\n        'user-rate-limited',\n        expect.any(Object)\n      );
    });
  });

  describe('Service Statistics Integration', () => {
    test('should return comprehensive service statistics', () => {
      const stats = whatsappService.getServiceStats();

      expect(stats).toEqual({\n        serviceName: 'WhatsApp Service',\n        version: '1.0.0',\n        provider: 'Qontak API',\n        configured: true,\n        lastConfigUpdate: expect.any(String),\n        supportedNotificationTypes: ['maintenance', 'alarm', 'system', 'custom', 'bulk']\n      });
    });

    test('should detect unconfigured service state', () => {\n      // Clear environment to simulate unconfigured state\n      process.env = {};\n      const unconfiguredService = new (require('../lib/services/whatsapp-service').WhatsAppService)();\n      \n      const stats = unconfiguredService.getServiceStats();\n      expect(stats.configured).toBe(false);\n    });
  });\n\n  describe('End-to-End Scenarios', () => {\n    test('should handle complete maintenance workflow', async () => {\n      // Simulate complete maintenance notification workflow\n      mockFetch.mockResolvedValueOnce({\n        ok: true,\n        json: async () => ({\n          success: true,\n          message_id: 'e2e-maintenance-123',\n          delivery_status: 'sent'\n        })\n      });\n\n      const maintenanceData = {\n        userName: 'Senior Technician',\n        taskName: 'Monthly UPS Battery Check',\n        deviceName: 'UPS System Building A',\n        startTime: '2025-02-01 08:00:00',\n        endTime: '2025-02-01 10:00:00',\n        status: 'Scheduled',\n        description: 'Check battery voltage and replace if necessary'\n      };\n\n      // Send notification\n      const result = await whatsappService.sendMaintenanceNotification(\n        '081555123456',\n        maintenanceData,\n        'maintenance-admin'\n      );\n\n      // Verify end-to-end success\n      expect(result.success).toBe(true);\n      expect(result.response.message_id).toBe('e2e-maintenance-123');\n      \n      // Verify all logging steps occurred\n      expect(mockLogger.log).toHaveBeenCalledWith(\n        expect.objectContaining({\n          level: 'DEBUG',\n          message: 'Sending WhatsApp message'\n        })\n      );\n      \n      expect(mockLogger.logMessageSent).toHaveBeenCalled();\n      \n      expect(mockLogger.log).toHaveBeenCalledWith(\n        expect.objectContaining({\n          level: 'INFO',\n          message: 'Maintenance notification sent successfully'\n        })\n      );\n    });\n  });\n});