// File: tests/whatsapp-service.test.ts

import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { WhatsAppService } from '../lib/services/whatsapp-service';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch as any;

// Mock environment variables
const originalEnv = process.env;

describe('WhatsAppService', () => {
  let whatsappService: WhatsAppService;

  beforeEach(() => {
    // Reset environment variables
    process.env = {
      ...originalEnv,
      QONTAK_API_URL: 'https://test-api.qontak.com/api/open/v1/broadcasts/whatsapp/direct',
      QONTAK_BEARER_TOKEN: 'test-bearer-token',
      QONTAK_CHANNEL_INTEGRATION_ID: 'test-channel-id',
      QONTAK_MESSAGE_TEMPLATE_ID: 'test-template-id',
      QONTAK_LANGUAGE: 'en'
    };
    
    whatsappService = new WhatsAppService();
    mockFetch.mockClear();
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.clearAllMocks();
  });

  describe('Configuration', () => {
    test('should be configured with environment variables', () => {
      const configStatus = whatsappService.getConfigStatus();
      
      expect(configStatus.configured).toBe(true);
      expect(configStatus.apiUrl).toBe(true);
      expect(configStatus.bearerToken).toBe(true);
      expect(configStatus.channelIntegrationId).toBe(true);
      expect(configStatus.messageTemplateId).toBe(true);
      expect(configStatus.language).toBe('en');
    });

    test('should detect missing configuration', () => {
      // Create service without environment variables
      process.env = {};
      const unconfiguredService = new WhatsAppService();
      const configStatus = unconfiguredService.getConfigStatus();
      
      expect(configStatus.configured).toBe(false);
    });

    test('should update configuration dynamically', () => {
      const newConfig = {
        bearerToken: 'new-token',
        language: 'id'
      };
      
      whatsappService.updateConfig(newConfig);
      const configStatus = whatsappService.getConfigStatus();
      
      expect(configStatus.language).toBe('id');
    });
  });

  describe('Phone Number Formatting', () => {
    test('should format Indonesian phone numbers correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, message_id: 'test-123' })
      });

      await whatsappService.sendCustomMessage('081234567890', 'Test User', 'Test message');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('62812345678')
        })
      );
    });

    test('should handle already formatted international numbers', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, message_id: 'test-123' })
      });

      await whatsappService.sendCustomMessage('6281234567890', 'Test User', 'Test message');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('6281234567890')
        })
      );
    });
  });

  describe('Custom Messages', () => {
    test('should send custom message successfully', async () => {
      const mockResponse = {
        success: true,
        message_id: 'msg-123',
        status: 'sent'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await whatsappService.sendCustomMessage(
        '081234567890',
        'John Doe',
        'Hello, this is a test message'
      );

      expect(result.success).toBe(true);
      expect(result.message).toBe('WhatsApp message sent successfully');
      expect(result.response).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    test('should handle API errors gracefully', async () => {
      const mockErrorResponse = {
        error: 'Invalid template',
        message: 'Template not found'
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => mockErrorResponse
      });

      const result = await whatsappService.sendCustomMessage(
        '081234567890',
        'John Doe',
        'Test message'
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('WhatsApp API error: 400');
    });

    test('should validate required parameters', async () => {
      const result = await whatsappService.sendCustomMessage(
        '',
        'John Doe',
        'Test message'
      );

      expect(result.success).toBe(false);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('Maintenance Notifications', () => {
    test('should send maintenance notification successfully', async () => {
      const mockResponse = {
        success: true,
        message_id: 'maint-123'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const maintenanceData = {
        userName: 'John Doe',
        taskName: 'Server Maintenance',
        deviceName: 'Server-001',
        startTime: '2025-01-01 10:00:00',
        endTime: '2025-01-01 12:00:00',
        status: 'Scheduled',
        description: 'Routine maintenance check'
      };

      const result = await whatsappService.sendMaintenanceNotification(
        '081234567890',
        maintenanceData
      );

      expect(result.success).toBe(true);
      expect(result.message).toBe('WhatsApp notification sent successfully');
      
      // Verify the request payload contains maintenance-specific parameters
      const fetchCall = mockFetch.mock.calls[0];
      const payload = JSON.parse(fetchCall[1].body);
      
      expect(payload.parameters.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            key: "3",
            value: "task_name",
            value_text: "Server Maintenance"
          }),
          expect.objectContaining({
            key: "4",
            value: "device_name",
            value_text: "Server-001"
          })
        ])
      );
    });

    test('should generate proper maintenance message text', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      const maintenanceData = {
        userName: 'John Doe',
        taskName: 'Database Backup',
        deviceName: 'DB-Server-01',
        startTime: '2025-01-15 02:00:00',
        endTime: '2025-01-15 04:00:00',
        status: 'Scheduled'
      };

      await whatsappService.sendMaintenanceNotification(
        '081234567890',
        maintenanceData
      );

      const fetchCall = mockFetch.mock.calls[0];
      const payload = JSON.parse(fetchCall[1].body);
      const messageText = payload.parameters.body.find(p => p.key === "2").value_text;

      expect(messageText).toContain('🔧 *MAINTENANCE NOTIFICATION*');
      expect(messageText).toContain('Hello John Doe');
      expect(messageText).toContain('Database Backup');
      expect(messageText).toContain('DB-Server-01');
      expect(messageText).toContain('Scheduled');
    });
  });

  describe('Alarm Notifications', () => {
    test('should send alarm notification successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, message_id: 'alarm-123' })
      });

      const alarmData = {
        userName: 'Admin User',
        deviceName: 'Temperature Sensor 01',
        alarmType: 'Temperature High',
        severity: 'HIGH' as const,
        message: 'Temperature exceeded 80°C threshold',
        timestamp: '2025-01-20 14:30:00',
        location: 'Server Room A'
      };

      const result = await whatsappService.sendAlarmNotification(
        '081234567890',
        alarmData
      );

      expect(result.success).toBe(true);
      expect(result.message).toBe('WhatsApp alarm notification sent successfully');
    });

    test('should use correct severity emoji for different alarm levels', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      const criticalAlarm = {
        userName: 'Admin User',
        deviceName: 'Fire Sensor',
        alarmType: 'Fire Detected',
        severity: 'CRITICAL' as const,
        message: 'Fire alarm triggered',
        timestamp: '2025-01-20 15:00:00'
      };

      await whatsappService.sendAlarmNotification('081234567890', criticalAlarm);

      const fetchCall = mockFetch.mock.calls[0];
      const payload = JSON.parse(fetchCall[1].body);
      const messageText = payload.parameters.body.find(p => p.key === "2").value_text;

      expect(messageText).toContain('🚨 *ALARM NOTIFICATION*');
      expect(messageText).toContain('Fire Detected');
      expect(messageText).toContain('CRITICAL');
    });
  });

  describe('System Notifications', () => {
    test('should send system notification successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, message_id: 'sys-123' })
      });

      const systemData = {
        title: 'System Maintenance',
        message: 'System will be down for maintenance from 2AM to 4AM',
        severity: 'WARNING' as const,
        timestamp: '2025-01-25 01:45:00',
        additionalInfo: 'All monitoring services will be affected'
      };

      const result = await whatsappService.sendSystemNotification(
        '081234567890',
        'System Admin',
        systemData
      );

      expect(result.success).toBe(true);
      expect(result.message).toBe('WhatsApp system notification sent successfully');
    });
  });

  describe('Bulk Notifications', () => {
    test('should send bulk notifications to multiple recipients', async () => {
      // Mock successful responses for all recipients
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, message_id: 'bulk-1' })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, message_id: 'bulk-2' })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, message_id: 'bulk-3' })
        });

      const recipients = [
        { phoneNumber: '081111111111', name: 'User 1' },
        { phoneNumber: '082222222222', name: 'User 2' },
        { phoneNumber: '083333333333', name: 'User 3' }
      ];

      const result = await whatsappService.sendBulkNotifications(
        recipients,
        'This is a bulk notification test',
        'system'
      );

      expect(result.success).toBe(true);
      expect(result.summary.total).toBe(3);
      expect(result.summary.successful).toBe(3);
      expect(result.summary.failed).toBe(0);
      expect(result.results).toHaveLength(3);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    test('should handle mixed success/failure in bulk notifications', async () => {
      // Mock mixed responses
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, message_id: 'bulk-1' })
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 400,
          json: async () => ({ error: 'Invalid phone number' })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, message_id: 'bulk-3' })
        });

      const recipients = [
        { phoneNumber: '081111111111', name: 'User 1' },
        { phoneNumber: 'invalid', name: 'User 2' },
        { phoneNumber: '083333333333', name: 'User 3' }
      ];

      const result = await whatsappService.sendBulkNotifications(
        recipients,
        'Bulk test message'
      );

      expect(result.success).toBe(true); // Success because at least one succeeded
      expect(result.summary.total).toBe(3);
      expect(result.summary.successful).toBe(2);
      expect(result.summary.failed).toBe(1);
      
      // Check individual results
      expect(result.results[0].success).toBe(true);
      expect(result.results[1].success).toBe(false);
      expect(result.results[2].success).toBe(true);
    });
  });

  describe('Connection Testing', () => {
    test('should test connection successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, message_id: 'test-123' })
      });

      const result = await whatsappService.testConnection('081234567890');

      expect(result.success).toBe(true);
      expect(result.message).toBe('WhatsApp message sent successfully');
      
      // Verify test message content
      const fetchCall = mockFetch.mock.calls[0];
      const payload = JSON.parse(fetchCall[1].body);
      const messageText = payload.parameters.body.find(p => p.key === "2").value_text;
      
      expect(messageText).toContain('test message');
      expect(messageText).toContain('working properly');
    });

    test('should handle connection test failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await whatsappService.testConnection('081234567890');

      expect(result.success).toBe(false);
      expect(result.message).toContain('Connection test failed');
    });
  });

  describe('Service Statistics', () => {
    test('should return service statistics', () => {
      const stats = whatsappService.getServiceStats();

      expect(stats).toEqual({
        serviceName: 'WhatsApp Service',
        version: '1.0.0',
        provider: 'Qontak API',
        configured: true,
        lastConfigUpdate: expect.any(String),
        supportedNotificationTypes: ['maintenance', 'alarm', 'system', 'custom', 'bulk']
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network timeout'));

      const result = await whatsappService.sendCustomMessage(
        '081234567890',
        'Test User',
        'Test message'
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('Network timeout');
    });

    test('should handle malformed API responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => { throw new Error('Invalid JSON'); }
      });

      const result = await whatsappService.sendCustomMessage(
        '081234567890',
        'Test User',
        'Test message'
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('WhatsApp API error: 500');
    });

    test('should handle unconfigured service', async () => {
      // Create unconfigured service
      process.env = {};
      const unconfiguredService = new WhatsAppService();

      const result = await unconfiguredService.sendCustomMessage(
        '081234567890',
        'Test User',
        'Test message'
      );

      expect(result.success).toBe(false);
      expect(result.message).toBe('WhatsApp service not properly configured');
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });
});