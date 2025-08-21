// File: tests/whatsapp-api.test.ts

import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { NextRequest } from 'next/server';
import { POST as sendWhatsApp } from '../app/api/whatsapp/send/route';
import { GET as getConfig, PUT as updateConfig, POST as testConnection } from '../app/api/whatsapp/config/route';
import { POST as sendMaintenanceNotification, GET as getMaintenancePreview } from '../app/api/whatsapp/maintenance/route';

// Mock dependencies
jest.mock('../lib/auth');
jest.mock('../lib/prisma');
jest.mock('../lib/services/whatsapp-service');

import { getAuthFromCookie } from '../lib/auth';
import { prisma } from '../lib/prisma';
import { whatsappService } from '../lib/services/whatsapp-service';

const mockGetAuthFromCookie = getAuthFromCookie as jest.MockedFunction<typeof getAuthFromCookie>;
const mockWhatsAppService = whatsappService as jest.Mocked<typeof whatsappService>;
const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('WhatsApp API Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Send WhatsApp Message API', () => {
    test('should send WhatsApp message successfully', async () => {
      // Mock authentication
      mockGetAuthFromCookie.mockResolvedValue({
        id: 'user-123',
        email: 'admin@test.com',
        role: 'ADMIN'
      });

      // Mock WhatsApp service
      mockWhatsAppService.sendCustomMessage.mockResolvedValue({
        success: true,
        message: 'WhatsApp message sent successfully',
        response: { message_id: 'msg-123' }
      });

      const request = new NextRequest('http://localhost:3000/api/whatsapp/send', {
        method: 'POST',
        body: JSON.stringify({
          phoneNumber: '081234567890',
          recipientName: 'John Doe',
          message: 'Test message',
          additionalParams: []
        }),
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'auth-token=valid-token'
        }
      });

      const response = await sendWhatsApp(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('WhatsApp message sent successfully');
      expect(data.data.message_id).toBe('msg-123');
      expect(mockWhatsAppService.sendCustomMessage).toHaveBeenCalledWith(
        '081234567890',
        'John Doe',
        'Test message',
        []
      );
    });

    test('should return 401 for unauthenticated requests', async () => {
      mockGetAuthFromCookie.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/whatsapp/send', {
        method: 'POST',
        body: JSON.stringify({
          phoneNumber: '081234567890',
          recipientName: 'John Doe',
          message: 'Test message'
        }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await sendWhatsApp(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.message).toBe('Unauthorized');
    });

    test('should validate required fields', async () => {
      mockGetAuthFromCookie.mockResolvedValue({
        id: 'user-123',
        email: 'admin@test.com',
        role: 'ADMIN'
      });

      const request = new NextRequest('http://localhost:3000/api/whatsapp/send', {
        method: 'POST',
        body: JSON.stringify({
          phoneNumber: '',
          recipientName: 'John Doe',
          message: 'Test message'
        }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await sendWhatsApp(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.message).toContain('required');
    });

    test('should handle WhatsApp service errors', async () => {
      mockGetAuthFromCookie.mockResolvedValue({
        id: 'user-123',
        email: 'admin@test.com',
        role: 'ADMIN'
      });

      mockWhatsAppService.sendCustomMessage.mockResolvedValue({
        success: false,
        message: 'WhatsApp service not configured'
      });

      const request = new NextRequest('http://localhost:3000/api/whatsapp/send', {
        method: 'POST',
        body: JSON.stringify({
          phoneNumber: '081234567890',
          recipientName: 'John Doe',
          message: 'Test message'
        }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await sendWhatsApp(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.message).toBe('WhatsApp service not configured');
    });
  });

  describe('WhatsApp Configuration API', () => {
    test('should get configuration status', async () => {
      mockGetAuthFromCookie.mockResolvedValue({
        id: 'admin-123',
        email: 'admin@test.com',
        role: 'ADMIN'
      });

      mockWhatsAppService.getConfigStatus.mockReturnValue({
        configured: true,
        apiUrl: true,
        bearerToken: true,
        channelIntegrationId: true,
        messageTemplateId: true,
        language: 'id'
      });

      const request = new NextRequest('http://localhost:3000/api/whatsapp/config', {
        method: 'GET',
        headers: { 'Cookie': 'auth-token=admin-token' }
      });

      const response = await getConfig(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('success');
      expect(data.data.configured).toBe(true);
    });

    test('should restrict config access to admins only', async () => {
      mockGetAuthFromCookie.mockResolvedValue({
        id: 'user-123',
        email: 'user@test.com',
        role: 'USER'
      });

      const request = new NextRequest('http://localhost:3000/api/whatsapp/config', {
        method: 'GET',
        headers: { 'Cookie': 'auth-token=user-token' }
      });

      const response = await getConfig(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.message).toBe('Forbidden');
    });

    test('should update configuration', async () => {
      mockGetAuthFromCookie.mockResolvedValue({
        id: 'admin-123',
        email: 'admin@test.com',
        role: 'ADMIN'
      });

      mockWhatsAppService.updateConfig.mockImplementation(() => {});
      mockWhatsAppService.getConfigStatus.mockReturnValue({
        configured: true,
        apiUrl: true,
        bearerToken: true,
        channelIntegrationId: true,
        messageTemplateId: true,
        language: 'en'
      });

      const request = new NextRequest('http://localhost:3000/api/whatsapp/config', {
        method: 'PUT',
        body: JSON.stringify({
          bearerToken: 'new-token',
          language: 'en'
        }),
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': 'auth-token=admin-token' 
        }
      });

      const response = await updateConfig(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toContain('updated successfully');
      expect(mockWhatsAppService.updateConfig).toHaveBeenCalledWith({
        bearerToken: 'new-token',
        language: 'en'
      });
    });

    test('should test WhatsApp connection', async () => {
      mockGetAuthFromCookie.mockResolvedValue({
        id: 'admin-123',
        email: 'admin@test.com',
        role: 'ADMIN'
      });

      mockWhatsAppService.testConnection.mockResolvedValue({
        success: true,
        message: 'Connection test successful',
        response: { message_id: 'test-123' }
      });

      const request = new NextRequest('http://localhost:3000/api/whatsapp/config', {
        method: 'POST',
        body: JSON.stringify({
          testPhoneNumber: '081234567890'
        }),
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': 'auth-token=admin-token' 
        }
      });

      const response = await testConnection(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toContain('successful');
      expect(mockWhatsAppService.testConnection).toHaveBeenCalledWith('081234567890');
    });
  });

  describe('WhatsApp Maintenance Notification API', () => {
    test('should send maintenance notification successfully', async () => {
      mockGetAuthFromCookie.mockResolvedValue({
        id: 'admin-123',
        email: 'admin@test.com',
        role: 'ADMIN'
      });

      // Mock maintenance data
      const mockMaintenance = {
        id: 1,
        name: 'Server Maintenance',
        description: 'Routine server check',
        startTask: new Date('2025-01-15T10:00:00Z'),
        endTask: new Date('2025-01-15T12:00:00Z'),
        assignTo: 'user-456',
        targetId: 'device-789',
        status: 'Scheduled',
        assignedTo: {
          id: 'user-456',
          email: 'technician@test.com'
        },
        deviceTarget: {
          name: 'Production Server 01',
          topic: 'devices/server01'
        }
      };

      mockPrisma.maintenance.findUnique.mockResolvedValue(mockMaintenance);
      mockPrisma.notification.create.mockResolvedValue({
        id: 1,
        message: 'WhatsApp notification sent',
        userId: 'user-456',
        createdAt: new Date()
      });

      mockWhatsAppService.sendMaintenanceNotification.mockResolvedValue({
        success: true,
        message: 'WhatsApp notification sent successfully',
        response: { message_id: 'maint-123' }
      });

      const request = new NextRequest('http://localhost:3000/api/whatsapp/maintenance', {
        method: 'POST',
        body: JSON.stringify({
          maintenanceId: 1,
          phoneNumber: '081234567890'
        }),
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': 'auth-token=admin-token' 
        }
      });

      const response = await sendMaintenanceNotification(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toContain('sent successfully');
      expect(data.data.maintenanceId).toBe(1);
      expect(data.data.taskName).toBe('Server Maintenance');
      expect(mockWhatsAppService.sendMaintenanceNotification).toHaveBeenCalledWith(
        '6281234567890', // Formatted phone number
        expect.objectContaining({
          userName: 'technician',
          taskName: 'Server Maintenance',
          deviceName: 'Production Server 01'
        })
      );
    });

    test('should return 404 for non-existent maintenance', async () => {
      mockGetAuthFromCookie.mockResolvedValue({
        id: 'admin-123',
        email: 'admin@test.com',
        role: 'ADMIN'
      });

      mockPrisma.maintenance.findUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/whatsapp/maintenance', {
        method: 'POST',
        body: JSON.stringify({
          maintenanceId: 999,
          phoneNumber: '081234567890'
        }),
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': 'auth-token=admin-token' 
        }
      });

      const response = await sendMaintenanceNotification(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.message).toBe('Maintenance not found');
    });

    test('should get maintenance preview', async () => {
      mockGetAuthFromCookie.mockResolvedValue({
        id: 'admin-123',
        email: 'admin@test.com',
        role: 'ADMIN'
      });

      const mockMaintenance = {
        id: 1,
        name: 'Database Backup',
        description: 'Weekly backup routine',
        startTask: new Date('2025-01-20T02:00:00Z'),
        endTask: new Date('2025-01-20T04:00:00Z'),
        assignTo: 'user-456',
        targetId: 'device-789',
        status: 'Scheduled',
        assignedTo: {
          id: 'user-456',
          email: 'dba@test.com'
        },
        deviceTarget: {
          name: 'Database Server 01',
          topic: 'devices/db01'
        }
      };

      mockPrisma.maintenance.findUnique.mockResolvedValue(mockMaintenance);

      const request = new NextRequest('http://localhost:3000/api/whatsapp/maintenance?maintenanceId=1', {
        method: 'GET',
        headers: { 'Cookie': 'auth-token=admin-token' }
      });

      const response = await getMaintenancePreview(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.maintenance.name).toBe('Database Backup');
      expect(data.messagePreview).toContain('🔧 *MAINTENANCE NOTIFICATION*');
      expect(data.messagePreview).toContain('Database Backup');
      expect(data.messagePreview).toContain('dba');
    });
  });

  describe('Error Handling', () => {
    test('should handle database connection errors', async () => {
      mockGetAuthFromCookie.mockResolvedValue({
        id: 'admin-123',
        email: 'admin@test.com',
        role: 'ADMIN'
      });

      mockPrisma.maintenance.findUnique.mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost:3000/api/whatsapp/maintenance', {
        method: 'POST',
        body: JSON.stringify({
          maintenanceId: 1,
          phoneNumber: '081234567890'
        }),
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': 'auth-token=admin-token' 
        }
      });

      const response = await sendMaintenanceNotification(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.message).toContain('Failed to send maintenance notification');
      expect(data.error).toContain('Database connection failed');
    });

    test('should handle malformed JSON requests', async () => {
      mockGetAuthFromCookie.mockResolvedValue({
        id: 'admin-123',
        email: 'admin@test.com',
        role: 'ADMIN'
      });

      const request = new NextRequest('http://localhost:3000/api/whatsapp/send', {
        method: 'POST',
        body: 'invalid-json',
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await sendWhatsApp(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.message).toContain('Failed to send WhatsApp message');
    });
  });
});