// File: lib/services/whatsapp-service.ts

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
    notificationData: MaintenanceNotificationData
  ): Promise<{ success: boolean; message: string; response?: any }> {
    try {
      if (!this.isConfigured()) {
        return {
          success: false,
          message: 'WhatsApp service not properly configured'
        };
      }

      const message = this.buildMaintenanceMessage(phoneNumber, notificationData);
      const response = await this.sendMessage(message);

      return {
        success: true,
        message: 'WhatsApp notification sent successfully',
        response
      };
    } catch (error: any) {
      console.error('[WhatsApp Service] Failed to send maintenance notification:', error);
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
    additionalParams: Array<{ key: string; value: string; value_text: string }> = []
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

      const response = await this.sendMessage(message);

      return {
        success: true,
        message: 'WhatsApp message sent successfully',
        response
      };
    } catch (error: any) {
      console.error('[WhatsApp Service] Failed to send custom message:', error);
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
  private async sendMessage(message: WhatsAppMessage): Promise<any> {
    const payload = {
      ...message,
      message_template_id: this.config.messageTemplateId,
      channel_integration_id: this.config.channelIntegrationId,
      language: {
        code: this.config.language
      }
    };

    console.log('[WhatsApp Service] Sending message:', JSON.stringify(payload, null, 2));

    const response = await fetch(this.config.apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.bearerToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`WhatsApp API error: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    return await response.json();
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
  public updateConfig(newConfig: Partial<QontakConfig>) {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Test WhatsApp service connectivity
   */
  async testConnection(testPhoneNumber: string): Promise<{ success: boolean; message: string }> {
    try {
      const result = await this.sendCustomMessage(
        testPhoneNumber,
        'Test User',
        'This is a test message from Modbo Monitoring System. WhatsApp integration is working properly! 🎉'
      );
      
      return result;
    } catch (error: any) {
      return {
        success: false,
        message: `Connection test failed: ${error.message}`
      };
    }
  }
}

// Export singleton instance
export const whatsappService = new WhatsAppService();