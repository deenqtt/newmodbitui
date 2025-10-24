import * as cron from 'node-cron';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '@/lib/prisma';
import { backupService } from './backup-service';
import {
  BackupSchedule,
  ScheduleExecution,
  SchedulerStats,
  BackupType,
  BackupFrequency,
  DatabaseBackupConfig,
  FilesystemBackupConfig
} from '@/lib/types/backup';

export class BackupScheduler {
  private static instance: BackupScheduler;
  private runningSchedules: Map<string, cron.ScheduledTask> = new Map();
  private runningExecutions: Map<string, ScheduleExecution> = new Map();

  constructor() {
    this.initializeExistingSchedules();
  }

  public static getInstance(): BackupScheduler {
    if (!BackupScheduler.instance) {
      BackupScheduler.instance = new BackupScheduler();
    }
    return BackupScheduler.instance;
  }

  /**
   * Initialize existing schedules from database
   */
  private async initializeExistingSchedules(): Promise<void> {
    try {
      const schedules = await this.getAllSchedules();
      console.log(`🔄 Initializing ${schedules.length} backup schedules...`);

      for (const schedule of schedules) {
        if (schedule.enabled) {
          await this.scheduleBackup(schedule);
        }
      }

      console.log('✅ Backup scheduler initialized');
    } catch (error) {
      console.error('❌ Failed to initialize backup scheduler:', error);
    }
  }

  /**
   * Schedule a backup operation
   */
  public async scheduleBackup(schedule: BackupSchedule): Promise<void> {
    if (!schedule.enabled) {
      this.unscheduleBackup(schedule.id!);
      return;
    }

    // Unschedule existing if any
    this.unscheduleBackup(schedule.id!);

    const cronExpression = this.buildCronExpression(schedule);
    const task = cron.schedule(cronExpression, async () => {
      await this.executeScheduledBackup(schedule.id!);
    }, {
      timezone: "Asia/Jakarta"
    });

    this.runningSchedules.set(schedule.id!, task);
    console.log(`📅 Scheduled backup "${schedule.name}": ${cronExpression}`);
  }

  /**
   * Unschedule a backup operation
   */
  public unscheduleBackup(scheduleId: string): void {
    const existingTask = this.runningSchedules.get(scheduleId);
    if (existingTask) {
      existingTask.destroy();
      this.runningSchedules.delete(scheduleId);
      console.log(`❌ Unscheduled backup: ${scheduleId}`);
    }
  }

  /**
   * Execute a scheduled backup
   */
  private async executeScheduledBackup(scheduleId: string): Promise<void> {
    try {
      const schedule = await this.getScheduleById(scheduleId);
      if (!schedule || !schedule.enabled) return;

      const executionId = uuidv4();
      const execution: ScheduleExecution = {
        id: executionId,
        scheduleId,
        startTime: new Date(),
        status: 'running',
        logs: [`Starting scheduled backup: ${schedule.name}`]
      };

      // Update schedule's lastRun
      await this.updateScheduleLastRun(scheduleId, new Date());

      // Store execution
      this.runningExecutions.set(executionId, execution);

      console.log(`🚀 Executing scheduled backup: ${schedule.name}`);

      let result;
      if (schedule.type === BackupType.DATABASE) {
        result = await backupService.backupDatabase(schedule.config as DatabaseBackupConfig);
      } else {
        result = await backupService.backupFilesystem(schedule.config as FilesystemBackupConfig);
      }

      // Update execution
      execution.endTime = new Date();
      execution.status = result.status === 'completed' ? 'completed' : 'failed';
      execution.result = result;

      if (result.error) {
        execution.error = result.error;
        execution.logs.push(`Error: ${result.error}`);
      }

      // Store execution in database (future enhancement)
      await this.storeExecution(execution);
      this.runningExecutions.delete(executionId);

      console.log(`✅ Scheduled backup completed: ${schedule.name} (${execution.status})`);

    } catch (error) {
      console.error(`❌ Scheduled backup failed: ${scheduleId}`, error);
      const execution = this.runningExecutions.get(scheduleId);
      if (execution) {
        execution.status = 'failed';
        execution.error = error instanceof Error ? error.message : 'Unknown error';
        execution.endTime = new Date();
        await this.storeExecution(execution);
        this.runningExecutions.delete(scheduleId);
      }
    }
  }

  /**
   * Build cron expression from schedule config
   */
  private buildCronExpression(schedule: BackupSchedule): string {
    const [hour, minute] = schedule.time.split(':');

    switch (schedule.frequency) {
      case BackupFrequency.DAILY:
        return `${minute} ${hour} * * *`; // Every day at specified time

      case BackupFrequency.WEEKLY:
        const dayOfWeek = schedule.daysOfWeek?.[0] ?? 0; // Default to Sunday
        return `${minute} ${hour} * * ${dayOfWeek}`;

      case BackupFrequency.MONTHLY:
        const dayOfMonth = schedule.daysOfMonth?.[0] ?? 1; // Default to 1st of month
        return `${minute} ${hour} ${dayOfMonth} * *`;

      default:
        return `${minute} ${hour} * * *`; // Daily as fallback
    }
  }

  /**
   * Calculate next run time for schedule
   */
  private calculateNextRun(schedule: BackupSchedule): Date {
    const [scheduleHour, scheduleMinute] = schedule.time.split(':').map(Number);
    const now = new Date();

    switch (schedule.frequency) {
      case BackupFrequency.DAILY:
        const nextDaily = new Date(now);
        nextDaily.setHours(scheduleHour, scheduleMinute, 0, 0);
        if (nextDaily <= now) {
          nextDaily.setDate(nextDaily.getDate() + 1);
        }
        return nextDaily;

      case BackupFrequency.WEEKLY:
        const nextWeekly = new Date(now);
        const targetDay = schedule.daysOfWeek?.[0] ?? 0;
        const currentDay = now.getDay();
        const daysUntilTarget = (targetDay - currentDay + 7) % 7;
        nextWeekly.setDate(now.getDate() + daysUntilTarget);
        nextWeekly.setHours(scheduleHour, scheduleMinute, 0, 0);
        if (nextWeekly <= now) {
          nextWeekly.setDate(nextWeekly.getDate() + 7);
        }
        return nextWeekly;

      case BackupFrequency.MONTHLY:
        const nextMonthly = new Date(now);
        const targetDate = schedule.daysOfMonth?.[0] ?? 1;
        nextMonthly.setDate(targetDate);
        nextMonthly.setHours(scheduleHour, scheduleMinute, 0, 0);
        if (nextMonthly <= now) {
          nextMonthly.setMonth(nextMonthly.getMonth() + 1);
        }
        return nextMonthly;

      default:
        return now;
    }
  }

  /**
   * Get scheduler statistics
   */
  public async getSchedulerStats(): Promise<SchedulerStats> {
    const schedules = await this.getAllSchedules();
    const activeSchedules = schedules.filter(s => s.enabled);
    const runningCount = this.runningExecutions.size;

    const executions = await this.getRecentExecutions();
    const lastExecution = executions.length > 0 ? executions[0].startTime : undefined;

    // Find next execution time
    const nextExecution = activeSchedules.length > 0
      ? new Date(Math.min(...activeSchedules
          .filter(s => s.nextRun)
          .map(s => s.nextRun!.getTime())))
      : undefined;

    return {
      totalSchedules: schedules.length,
      activeSchedules: activeSchedules.length,
      runningCount,
      lastExecution,
      nextExecution
    };
  }

  /**
   * Create a new backup schedule
   */
  public async createSchedule(schedule: Omit<BackupSchedule, 'id' | 'createdAt' | 'updatedAt'>): Promise<BackupSchedule> {
    const newSchedule: BackupSchedule = {
      ...schedule,
      id: uuidv4(),
      nextRun: this.calculateNextRun(schedule),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Here we would store in database, but for now using in-memory
    // In a real implementation, you'd save to Prisma model

    if (schedule.enabled) {
      await this.scheduleBackup(newSchedule);
    }

    return newSchedule;
  }

  /**
   * Update an existing schedule
   */
  public async updateSchedule(scheduleId: string, updates: Partial<BackupSchedule>): Promise<BackupSchedule | null> {
    // In a real implementation, you'd update the database record
    const schedule = await this.getScheduleById(scheduleId);
    if (!schedule) return null;

    const updatedSchedule = { ...schedule, ...updates, updatedAt: new Date() };
    updatedSchedule.nextRun = this.calculateNextRun(updatedSchedule);

    if (updates.enabled !== undefined || JSON.stringify(updates) !== '{}') {
      await this.scheduleBackup(updatedSchedule);
    }

    return updatedSchedule;
  }

  /**
   * Delete a schedule
   */
  public async deleteSchedule(scheduleId: string): Promise<boolean> {
    this.unscheduleBackup(scheduleId);
    // In a real implementation, you'd delete from database
    return true;
  }

  /**
   * Get all schedules
   */
  public async getAllSchedules(): Promise<BackupSchedule[]> {
    // In a real implementation, you'd fetch from database
    // For now, return empty array
    return [];
  }

  /**
   * Get schedule by ID
   */
  public async getScheduleById(scheduleId: string): Promise<BackupSchedule | null> {
    // In a real implementation, you'd fetch from database
    return null;
  }

  /**
   * Update schedule's last run time
   */
  private async updateScheduleLastRun(scheduleId: string, lastRun: Date): Promise<void> {
    const nextRun = this.calculateNextRun(await this.getScheduleById(scheduleId) as BackupSchedule);
    // Update database record
  }

  /**
   * Store execution in database
   */
  private async storeExecution(execution: ScheduleExecution): Promise<void> {
    // In a real implementation, you'd store execution logs in database
    console.log(`📝 Execution log: ${execution.id} - ${execution.status}`);
  }

  /**
   * Get recent executions
   */
  public async getRecentExecutions(limit: number = 10): Promise<ScheduleExecution[]> {
    // In a real implementation, you'd fetch from database
    return [];
  }

  /**
   * Execute backup immediately (for testing)
   */
  public async executeNow(scheduleId: string): Promise<ScheduleExecution | null> {
    const schedule = await this.getScheduleById(scheduleId);
    if (!schedule) return null;

    return new Promise((resolve) => {
      this.executeScheduledBackup(scheduleId).then(() => {
        const executions = this.runningExecutions.get(scheduleId);
        resolve(executions || null);
      });
    });
  }

  /**
   * Shutdown all running schedules
   */
  public shutdown(): void {
    for (const [scheduleId, task] of this.runningSchedules) {
      task.destroy();
      console.log(`🛑 Shutdown schedule: ${scheduleId}`);
    }
    this.runningSchedules.clear();
    this.runningExecutions.clear();
  }
}

export const backupScheduler = BackupScheduler.getInstance();
