// File: lib/services/whatsapp-logger.ts

import { prisma } from "@/lib/prisma";

export interface WhatsAppLogEntry {
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
  message: string;
  data?: any;
  userId?: string;
  phoneNumber?: string;
  messageId?: string;
  errorCode?: string;
  duration?: number;
  metadata?: Record<string, any>;
}

export interface WhatsAppLogFilter {
  level?: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
  userId?: string;
  phoneNumber?: string;
  startDate?: Date;
  endDate?: Date;
  messageId?: string;
  errorCode?: string;
}

export class WhatsAppLogger {
  private static instance: WhatsAppLogger;
  
  private constructor() {}

  public static getInstance(): WhatsAppLogger {
    if (!WhatsAppLogger.instance) {
      WhatsAppLogger.instance = new WhatsAppLogger();
    }
    return WhatsAppLogger.instance;
  }

  /**
   * Log WhatsApp service events
   */
  async log(entry: WhatsAppLogEntry): Promise<void> {
    try {
      // Console logging for development
      const timestamp = new Date().toISOString();
      const logMessage = `[${timestamp}] [WhatsApp] [${entry.level}] ${entry.message}`;
      
      switch (entry.level) {
        case 'ERROR':
          console.error(logMessage, entry.data || '');
          break;
        case 'WARN':
          console.warn(logMessage, entry.data || '');
          break;
        case 'DEBUG':
          console.debug(logMessage, entry.data || '');
          break;
        default:
          console.info(logMessage, entry.data || '');
      }

      // Database logging (optional - only for important events)
      if (entry.level === 'ERROR' || entry.level === 'WARN' || entry.metadata?.persistent) {
        await this.persistLog(entry);
      }

    } catch (error) {
      // Fallback to console if database logging fails
      console.error('[WhatsApp Logger] Failed to log entry:', error);
      console.error('[WhatsApp Logger] Original log entry:', entry);
    }
  }

  /**
   * Log successful message sending
   */
  async logMessageSent(
    phoneNumber: string, 
    messageId: string, 
    userId?: string, 
    duration?: number,
    additionalData?: any
  ): Promise<void> {
    await this.log({
      level: 'INFO',
      message: `WhatsApp message sent successfully`,
      phoneNumber,
      messageId,
      userId,
      duration,
      data: additionalData,
      metadata: { persistent: true }
    });
  }

  /**
   * Log message sending failure
   */
  async logMessageFailed(
    phoneNumber: string, 
    errorMessage: string, 
    errorCode?: string, 
    userId?: string,
    additionalData?: any
  ): Promise<void> {
    await this.log({
      level: 'ERROR',
      message: `WhatsApp message failed to send: ${errorMessage}`,
      phoneNumber,
      errorCode,
      userId,
      data: additionalData,
      metadata: { persistent: true }
    });
  }

  /**
   * Log configuration changes
   */
  async logConfigurationChange(
    userId: string, 
    changes: Record<string, any>
  ): Promise<void> {
    await this.log({
      level: 'INFO',
      message: 'WhatsApp configuration updated',
      userId,
      data: {
        changedFields: Object.keys(changes),
        timestamp: new Date().toISOString()
      },
      metadata: { persistent: true, configChange: true }
    });
  }

  /**
   * Log connection test results
   */
  async logConnectionTest(
    testPhoneNumber: string, 
    success: boolean, 
    responseTime?: number, 
    userId?: string,
    errorDetails?: any
  ): Promise<void> {
    await this.log({
      level: success ? 'INFO' : 'WARN',
      message: `WhatsApp connection test ${success ? 'succeeded' : 'failed'}`,
      phoneNumber: testPhoneNumber,
      userId,
      duration: responseTime,
      data: success ? { responseTime } : { errorDetails },
      metadata: { persistent: true, connectionTest: true }
    });
  }

  /**
   * Log bulk operation results
   */
  async logBulkOperation(
    recipientCount: number, 
    successCount: number, 
    failureCount: number, 
    userId?: string,
    operationType?: string
  ): Promise<void> {
    await this.log({
      level: failureCount > 0 ? 'WARN' : 'INFO',
      message: `Bulk WhatsApp operation completed`,
      userId,
      data: {
        operationType: operationType || 'bulk_send',
        totalRecipients: recipientCount,
        successful: successCount,
        failed: failureCount,
        successRate: recipientCount > 0 ? ((successCount / recipientCount) * 100).toFixed(2) + '%' : '0%'
      },
      metadata: { persistent: true, bulkOperation: true }
    });
  }

  /**
   * Log rate limiting events
   */
  async logRateLimit(
    phoneNumber: string, 
    limitType: 'per_minute' | 'per_hour' | 'per_day', 
    currentCount: number, 
    limit: number
  ): Promise<void> {
    await this.log({
      level: 'WARN',
      message: `WhatsApp rate limit reached`,
      phoneNumber,
      data: {
        limitType,
        currentCount,
        limit,
        exceededBy: currentCount - limit
      },
      metadata: { persistent: true, rateLimit: true }
    });
  }

  /**
   * Persist important logs to database
   */
  private async persistLog(entry: WhatsAppLogEntry): Promise<void> {
    try {
      // Create notification entry for important WhatsApp events
      if (entry.userId) {
        await prisma.notification.create({
          data: {
            message: `[WhatsApp ${entry.level}] ${entry.message}`,
            userId: entry.userId,
          }
        });
      }

      // For production, you might want to create a dedicated WhatsApp log table
      // await prisma.whatsAppLog.create({
      //   data: {
      //     level: entry.level,
      //     message: entry.message,
      //     phoneNumber: entry.phoneNumber,
      //     messageId: entry.messageId,
      //     userId: entry.userId,
      //     errorCode: entry.errorCode,
      //     duration: entry.duration,
      //     data: entry.data ? JSON.stringify(entry.data) : null,
      //     metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
      //     createdAt: new Date()
      //   }
      // });
    } catch (error) {
      console.error('[WhatsApp Logger] Failed to persist log:', error);
    }
  }

  /**
   * Get WhatsApp logs with filtering
   */
  async getLogs(
    filter: WhatsAppLogFilter = {}, 
    limit: number = 50, 
    offset: number = 0
  ): Promise<any[]> {
    try {
      // For now, return from notifications table
      // In production, implement proper WhatsApp log table
      const whereClause: any = {
        message: {
          contains: '[WhatsApp'
        }
      };

      if (filter.userId) {
        whereClause.userId = filter.userId;
      }

      if (filter.startDate || filter.endDate) {
        whereClause.createdAt = {};
        if (filter.startDate) {
          whereClause.createdAt.gte = filter.startDate;
        }
        if (filter.endDate) {
          whereClause.createdAt.lte = filter.endDate;
        }
      }

      const logs = await prisma.notification.findMany({
        where: whereClause,
        orderBy: {
          createdAt: 'desc'
        },
        take: limit,
        skip: offset,
        include: {
          user: {
            select: {
              email: true
            }
          }
        }
      });

      return logs.map(log => ({
        id: log.id,
        level: this.extractLogLevel(log.message),
        message: log.message,
        userId: log.userId,
        userEmail: log.user?.email,
        createdAt: log.createdAt
      }));

    } catch (error) {
      console.error('[WhatsApp Logger] Failed to get logs:', error);
      return [];
    }
  }

  /**
   * Extract log level from message
   */
  private extractLogLevel(message: string): string {
    const match = message.match(/\[WhatsApp (INFO|WARN|ERROR|DEBUG)\]/);
    return match ? match[1] : 'INFO';
  }

  /**
   * Get log statistics
   */
  async getLogStatistics(days: number = 7): Promise<{
    totalLogs: number;
    errorCount: number;
    warningCount: number;
    infoCount: number;
    errorRate: string;
    topErrors: Array<{ message: string; count: number }>;
  }> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const logs = await prisma.notification.findMany({
        where: {
          message: {
            contains: '[WhatsApp'
          },
          createdAt: {
            gte: startDate
          }
        },
        select: {
          message: true
        }
      });

      const stats = logs.reduce((acc, log) => {
        acc.totalLogs++;
        if (log.message.includes('[WhatsApp ERROR]')) {
          acc.errorCount++;
          acc.errorMessages.push(log.message);
        } else if (log.message.includes('[WhatsApp WARN]')) {
          acc.warningCount++;
        } else {
          acc.infoCount++;
        }
        return acc;
      }, {
        totalLogs: 0,
        errorCount: 0,
        warningCount: 0,
        infoCount: 0,
        errorMessages: [] as string[]
      });

      // Count top errors
      const errorCounts = stats.errorMessages.reduce((acc: Record<string, number>, msg) => {
        const cleanMsg = msg.replace(/\[WhatsApp ERROR\]/, '').trim();
        acc[cleanMsg] = (acc[cleanMsg] || 0) + 1;
        return acc;
      }, {});

      const topErrors = Object.entries(errorCounts)
        .map(([message, count]) => ({ message, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      return {
        totalLogs: stats.totalLogs,
        errorCount: stats.errorCount,
        warningCount: stats.warningCount,
        infoCount: stats.infoCount,
        errorRate: stats.totalLogs > 0 
          ? ((stats.errorCount / stats.totalLogs) * 100).toFixed(2) + '%'
          : '0%',
        topErrors
      };

    } catch (error) {
      console.error('[WhatsApp Logger] Failed to get statistics:', error);
      return {
        totalLogs: 0,
        errorCount: 0,
        warningCount: 0,
        infoCount: 0,
        errorRate: '0%',
        topErrors: []
      };
    }
  }

  /**
   * Clean old logs
   */
  async cleanOldLogs(days: number = 30): Promise<{ deletedCount: number }> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const result = await prisma.notification.deleteMany({
        where: {
          message: {
            contains: '[WhatsApp'
          },
          createdAt: {
            lt: cutoffDate
          }
        }
      });

      await this.log({
        level: 'INFO',
        message: `Cleaned ${result.count} old WhatsApp log entries`,
        data: { deletedCount: result.count, cutoffDate: cutoffDate.toISOString() }
      });

      return { deletedCount: result.count };

    } catch (error) {
      console.error('[WhatsApp Logger] Failed to clean old logs:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const whatsappLogger = WhatsAppLogger.getInstance();