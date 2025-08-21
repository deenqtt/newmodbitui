// File: lib/services/whatsapp-service.ts

import { whatsappLogger } from './whatsapp-logger';

interface QontakConfig {
  apiUrl: string;
  bearerToken: string;
  channelIntegrationId: string;
  messageTemplateId: string;
  language: string;
}

interface WhatsAppMessage {
  to_number: string;
  to_name: string;
  parameters: {
    body: Array<{
      key: string;
      value: string;
      value_text: string;
    }>;
  };
}

interface MaintenanceNotificationData {
  userName: string;
  taskName: string;
  deviceName?: string;
  startTime: string;
  endTime: string;
  status: string;
  description?: string;
}

interface AlarmNotificationData {
  userName: string;
  deviceName: string;
  alarmType: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  timestamp: string;
  location?: string;
}

interface SystemNotificationData {
  title: string;
  message: string;
  severity: 'INFO' | 'WARNING' | 'ERROR';
  timestamp: string;
  additionalInfo?: string;
}

export class WhatsAppService {
  private config: QontakConfig;

  constructor() {
    this.config = {
      apiUrl: process.env.QONTAK_API_URL || 'https://service-chat.qontak.com/api/open/v1/broadcasts/whatsapp/direct',
      bearerToken: process.env.QONTAK_BEARER_TOKEN || '',
      channelIntegrationId: process.env.QONTAK_CHANNEL_INTEGRATION_ID || '',
      messageTemplateId: process.env.QONTAK_MESSAGE_TEMPLATE_ID || '',
      language: process.env.QONTAK_LANGUAGE || 'id'
    };
  }

  /**
   * Send maintenance notification via WhatsApp
   */
  async sendMaintenanceNotification(
    phoneNumber: string,
    notificationData: MaintenanceNotificationData,
    userId?: string
  ): Promise<{ success: boolean; message: string; response?: any }> {
    try {
      if (!this.isConfigured()) {
        const errorMsg = 'WhatsApp service not properly configured';
        await whatsappLogger.log({
          level: 'ERROR',
          message: errorMsg,
          phoneNumber,
          userId,
          data: { notificationType: 'maintenance', taskName: notificationData.taskName }
        });
        return {
          success: false,
          message: errorMsg
        };
      }

      const message = this.buildMaintenanceMessage(phoneNumber, notificationData);
      const response = await this.sendMessage(message, userId);

      await whatsappLogger.log({
        level: 'INFO',
        message: 'Maintenance notification sent successfully',
        phoneNumber,
        userId,
        messageId: response.message_id,
        data: { 
          taskName: notificationData.taskName,
          deviceName: notificationData.deviceName,
          status: notificationData.status
        }
      });

      return {
        success: true,
        message: 'WhatsApp notification sent successfully',
        response
      };
    } catch (error: any) {
      await whatsappLogger.log({
        level: 'ERROR',
        message: 'Failed to send maintenance notification',
        phoneNumber,
        userId,
        data: { error: error.message, taskName: notificationData.taskName }
      });
      
      return {
        success: false,
        message: error.message || 'Failed to send WhatsApp notification'
      };
    }
  }

  /**
   * Send custom WhatsApp message
   */
  async sendCustomMessage(
    phoneNumber: string,
    recipientName: string,
    messageText: string,
    additionalParams: Array<{ key: string; value: string; value_text: string }> = [],
    userId?: string
  ): Promise<{ success: boolean; message: string; response?: any }> {
    try {
      if (!this.isConfigured()) {
        return {
          success: false,
          message: 'WhatsApp service not properly configured'
        };
      }

      const message: WhatsAppMessage = {
        to_number: this.formatPhoneNumber(phoneNumber),
        to_name: recipientName,
        parameters: {
          body: [
            {
              key: "1",
              value: "full_name",
              value_text: recipientName
            },
            {
              key: "2",
              value: "messagetext",
              value_text: messageText
            },
            ...additionalParams
          ]
        }
      };

      const response = await this.sendMessage(message, userId);

      return {
        success: true,
        message: 'WhatsApp message sent successfully',
        response
      };
    } catch (error: any) {
      await whatsappLogger.log({
        level: 'ERROR',
        message: 'Failed to send custom message',
        phoneNumber,
        userId,
        data: { error: error.message, recipientName }
      });
      
      return {
        success: false,
        message: error.message || 'Failed to send WhatsApp message'
      };
    }
  }

  /**
   * Build maintenance-specific message
   */
  private buildMaintenanceMessage(
    phoneNumber: string,
    data: MaintenanceNotificationData
  ): WhatsAppMessage {
    const messageText = this.generateMaintenanceMessageText(data);

    return {
      to_number: this.formatPhoneNumber(phoneNumber),
      to_name: data.userName,
      parameters: {
        body: [
          {
            key: "1",
            value: "full_name",
            value_text: data.userName
          },
          {
            key: "2",
            value: "messagetext",
            value_text: messageText
          },
          {
            key: "3",
            value: "task_name",
            value_text: data.taskName
          },
          {
            key: "4",
            value: "device_name",
            value_text: data.deviceName || "N/A"
          },
          {
            key: "5",
            value: "start_time",
            value_text: data.startTime
          },
          {
            key: "6",
            value: "status",
            value_text: data.status
          }
        ]
      }
    };
  }

  /**
   * Generate maintenance message text
   */
  private generateMaintenanceMessageText(data: MaintenanceNotificationData): string {
    let message = `🔧 *MAINTENANCE NOTIFICATION*\n\n`;
    message += `Hello ${data.userName},\n\n`;
    message += `You have been assigned a maintenance task:\n`;
    message += `📋 *Task:* ${data.taskName}\n`;
    
    if (data.deviceName) {
      message += `🔌 *Device:* ${data.deviceName}\n`;
    }
    
    message += `📅 *Start Time:* ${data.startTime}\n`;
    message += `📅 *End Time:* ${data.endTime}\n`;
    message += `📊 *Status:* ${data.status}\n`;
    
    if (data.description) {
      message += `📝 *Description:* ${data.description}\n`;
    }
    
    message += `\nPlease ensure you complete this task on time.\n`;
    message += `For any questions, contact your supervisor.\n\n`;
    message += `*Modbo Monitoring System*`;

    return message;
  }

  /**
   * Send message to Qontak API
   */
  private async sendMessage(message: WhatsAppMessage, userId?: string): Promise<any> {
    const startTime = Date.now();
    
    const payload = {
      ...message,
      message_template_id: this.config.messageTemplateId,
      channel_integration_id: this.config.channelIntegrationId,
      language: {
        code: this.config.language
      }
    };

    await whatsappLogger.log({
      level: 'DEBUG',
      message: 'Sending WhatsApp message',
      phoneNumber: message.to_number,
      userId,
      data: { recipientName: message.to_name, hasParameters: !!message.parameters }
    });

    try {
      const response = await fetch(this.config.apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.bearerToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const duration = Date.now() - startTime;
      const responseData = await response.json();

      if (!response.ok) {
        const errorMessage = `WhatsApp API error: ${response.status} - ${JSON.stringify(responseData)}`;
        
        await whatsappLogger.logMessageFailed(
          message.to_number,
          errorMessage,
          response.status.toString(),
          userId,
          { payload: payload, response: responseData }
        );
        
        throw new Error(errorMessage);
      }

      await whatsappLogger.logMessageSent(
        message.to_number,
        responseData.message_id || 'unknown',
        userId,
        duration,
        { recipientName: message.to_name, responseData }
      );

      return responseData;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      if (!error.message.includes('WhatsApp API error')) {
        await whatsappLogger.logMessageFailed(
          message.to_number,
          error.message,
          'NETWORK_ERROR',
          userId,
          { duration, error: error.toString() }
        );
      }
      
      throw error;
    }
  }

  /**
   * Format phone number to international format
   */
  private formatPhoneNumber(phoneNumber: string): string {
    // Remove all non-digits
    let cleaned = phoneNumber.replace(/\D/g, '');
    
    // If starts with 0, replace with 62 (Indonesia)
    if (cleaned.startsWith('0')) {
      cleaned = '62' + cleaned.substring(1);
    }
    
    // If doesn't start with 62, add it
    if (!cleaned.startsWith('62')) {
      cleaned = '62' + cleaned;
    }
    
    return cleaned;
  }

  /**
   * Check if service is properly configured
   */
  private isConfigured(): boolean {
    return !!(
      this.config.bearerToken &&
      this.config.channelIntegrationId &&
      this.config.messageTemplateId &&
      this.config.apiUrl
    );
  }

  /**
   * Get configuration status
   */
  public getConfigStatus() {
    return {
      configured: this.isConfigured(),
      apiUrl: !!this.config.apiUrl,
      bearerToken: !!this.config.bearerToken,
      channelIntegrationId: !!this.config.channelIntegrationId,
      messageTemplateId: !!this.config.messageTemplateId,
      language: this.config.language
    };
  }

  /**
   * Update configuration dynamically
   */
  public updateConfig(newConfig: Partial<QontakConfig>, userId?: string) {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...newConfig };
    
    // Log configuration change
    whatsappLogger.logConfigurationChange(
      userId || 'system',
      {
        before: {
          configured: this.isConfiguredForConfig(oldConfig),
          language: oldConfig.language
        },
        after: {
          configured: this.isConfigured(),
          language: this.config.language
        },
        changes: Object.keys(newConfig)
      }
    ).catch(error => {
      console.warn('Failed to log configuration change:', error);
    });
  }

  /**
   * Check if a specific config object is configured
   */
  private isConfiguredForConfig(config: QontakConfig): boolean {
    return !!(
      config.bearerToken &&
      config.channelIntegrationId &&
      config.messageTemplateId &&
      config.apiUrl
    );
  }

  /**
   * Send alarm notification via WhatsApp
   */
  async sendAlarmNotification(
    phoneNumber: string,
    notificationData: AlarmNotificationData
  ): Promise<{ success: boolean; message: string; response?: any }> {
    try {
      if (!this.isConfigured()) {
        return {
          success: false,
          message: 'WhatsApp service not properly configured'
        };
      }

      const messageText = this.generateAlarmMessageText(notificationData);
      const message: WhatsAppMessage = {
        to_number: this.formatPhoneNumber(phoneNumber),
        to_name: notificationData.userName,
        parameters: {
          body: [
            {
              key: "1",
              value: "full_name",
              value_text: notificationData.userName
            },
            {
              key: "2",
              value: "messagetext",
              value_text: messageText
            },
            {
              key: "3",
              value: "device_name",
              value_text: notificationData.deviceName
            },
            {
              key: "4",
              value: "alarm_type",
              value_text: notificationData.alarmType
            },
            {
              key: "5",
              value: "severity",
              value_text: notificationData.severity
            },
            {
              key: "6",
              value: "timestamp",
              value_text: notificationData.timestamp
            }
          ]
        }
      };

      const response = await this.sendMessage(message);

      return {
        success: true,
        message: 'WhatsApp alarm notification sent successfully',
        response
      };
    } catch (error: any) {
      console.error('[WhatsApp Service] Failed to send alarm notification:', error);
      return {
        success: false,
        message: error.message || 'Failed to send WhatsApp alarm notification'
      };
    }
  }

  /**
   * Send system notification via WhatsApp
   */
  async sendSystemNotification(
    phoneNumber: string,
    recipientName: string,
    notificationData: SystemNotificationData
  ): Promise<{ success: boolean; message: string; response?: any }> {
    try {
      if (!this.isConfigured()) {
        return {
          success: false,
          message: 'WhatsApp service not properly configured'
        };
      }

      const messageText = this.generateSystemMessageText(notificationData);
      const result = await this.sendCustomMessage(
        phoneNumber,
        recipientName,
        messageText,
        [
          {
            key: "3",
            value: "title",
            value_text: notificationData.title
          },
          {
            key: "4",
            value: "severity",
            value_text: notificationData.severity
          },
          {
            key: "5",
            value: "timestamp",
            value_text: notificationData.timestamp
          }
        ]
      );

      return {
        success: result.success,
        message: result.success ? 'WhatsApp system notification sent successfully' : result.message,
        response: result.response
      };
    } catch (error: any) {
      console.error('[WhatsApp Service] Failed to send system notification:', error);
      return {
        success: false,
        message: error.message || 'Failed to send WhatsApp system notification'
      };
    }
  }

  /**
   * Send bulk notifications to multiple recipients
   */
  async sendBulkNotifications(
    recipients: Array<{ phoneNumber: string; name: string }>,
    messageText: string,
    notificationType: 'maintenance' | 'alarm' | 'system' | 'custom' = 'custom',
    userId?: string
  ): Promise<{ 
    success: boolean; 
    results: Array<{ phoneNumber: string; success: boolean; message: string; response?: any }>;
    summary: { total: number; successful: number; failed: number };
  }> {
    const results = [];
    let successful = 0;
    let failed = 0;

    await whatsappLogger.log({
      level: 'INFO',
      message: `Starting bulk notification to ${recipients.length} recipients`,
      userId,
      data: { notificationType, recipientCount: recipients.length }
    });

    for (const recipient of recipients) {
      try {
        const result = await this.sendCustomMessage(
          recipient.phoneNumber,
          recipient.name,
          messageText,
          [],
          userId
        );

        results.push({
          phoneNumber: recipient.phoneNumber,
          success: result.success,
          message: result.message,
          response: result.response
        });

        if (result.success) {
          successful++;
        } else {
          failed++;
        }
      } catch (error: any) {
        results.push({
          phoneNumber: recipient.phoneNumber,
          success: false,
          message: error.message || 'Failed to send message'
        });
        failed++;
      }

      // Add delay between messages to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    await whatsappLogger.logBulkOperation(
      recipients.length,
      successful,
      failed,
      userId,
      notificationType
    );

    return {
      success: successful > 0,
      results,
      summary: {
        total: recipients.length,
        successful,
        failed
      }
    };
  }

  /**
   * Generate alarm message text
   */
  private generateAlarmMessageText(data: AlarmNotificationData): string {
    const severityEmoji = {
      LOW: '🟡',
      MEDIUM: '🟠',
      HIGH: '🔴',
      CRITICAL: '🚨'
    };

    let message = `${severityEmoji[data.severity]} *ALARM NOTIFICATION*\n\n`;
    message += `Hello ${data.userName},\n\n`;
    message += `An alarm has been triggered:\n`;
    message += `🏷️ *Type:* ${data.alarmType}\n`;
    message += `🔌 *Device:* ${data.deviceName}\n`;
    message += `⚠️ *Severity:* ${data.severity}\n`;
    message += `📅 *Time:* ${data.timestamp}\n`;
    
    if (data.location) {
      message += `📍 *Location:* ${data.location}\n`;
    }
    
    message += `\n📄 *Details:*\n${data.message}\n\n`;
    message += `Please investigate and take necessary action immediately.\n\n`;
    message += `*Modbo Monitoring System*`;

    return message;
  }

  /**
   * Generate system message text
   */
  private generateSystemMessageText(data: SystemNotificationData): string {
    const severityEmoji = {
      INFO: 'ℹ️',
      WARNING: '⚠️',
      ERROR: '❌'
    };

    let message = `${severityEmoji[data.severity]} *${data.title.toUpperCase()}*\n\n`;
    message += `📄 ${data.message}\n`;
    message += `📅 *Time:* ${data.timestamp}\n`;
    
    if (data.additionalInfo) {
      message += `\n📋 *Additional Information:*\n${data.additionalInfo}\n`;
    }
    
    message += `\n*Modbo Monitoring System*`;

    return message;
  }

  /**
   * Test WhatsApp service connectivity
   */
  async testConnection(testPhoneNumber: string, userId?: string): Promise<{ success: boolean; message: string; response?: any }> {
    const startTime = Date.now();
    
    try {
      const result = await this.sendCustomMessage(
        testPhoneNumber,
        'Test User',
        'This is a test message from Modbo Monitoring System. WhatsApp integration is working properly! 🎉',
        [],
        userId
      );
      
      const duration = Date.now() - startTime;
      
      await whatsappLogger.logConnectionTest(
        testPhoneNumber,
        result.success,
        duration,
        userId,
        result.success ? undefined : { error: result.message }
      );
      
      return result;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      await whatsappLogger.logConnectionTest(
        testPhoneNumber,
        false,
        duration,
        userId,
        { error: error.message }
      );
      
      return {
        success: false,
        message: `Connection test failed: ${error.message}`
      };
    }
  }

  /**
   * Get service statistics
   */
  public getServiceStats() {
    return {
      serviceName: 'WhatsApp Service',
      version: '1.0.0',
      provider: 'Qontak API',
      configured: this.isConfigured(),
      lastConfigUpdate: new Date().toISOString(),
      supportedNotificationTypes: ['maintenance', 'alarm', 'system', 'custom', 'bulk']
    };
  }
}

// Export singleton instance
export const whatsappService = new WhatsAppService();