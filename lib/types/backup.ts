export interface BackupConfig {
  name: string;
  type: BackupType;
  retentionDays: number;
  schedule?: BackupSchedule;
  compress: boolean;
  encrypt: boolean;
  encryptionKey?: string;
}

export interface BackupResult {
  id: string;
  configId: string;
  type: BackupType;
  status: BackupStatus;
  size: number;
  path: string;
  startedAt: Date;
  completedAt?: Date;
  error?: string;
  metadata?: Record<string, any>;
}

export interface RetentionPolicy {
  type: BackupType;
  days: number;
  maxBackups: number;
  compress: boolean;
}

export enum BackupType {
  DATABASE = 'database',
  FILESYSTEM = 'filesystem',
  FULL = 'full'
}

export enum BackupStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export enum BackupFrequency {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  MANUAL = 'manual'
}

export interface DatabaseBackupConfig extends BackupConfig {
  type: BackupType.DATABASE;
  includeWal: boolean;
  verifyIntegrity: boolean;
}

export interface FilesystemBackupConfig extends BackupConfig {
  type: BackupType.FILESYSTEM;
  paths: string[];
  excludePatterns: string[];
  incremental: boolean;
}

export interface BackupSchedule {
  id?: string;
  name: string;
  type: BackupType;
  frequency: BackupFrequency;
  time: string; // HH:MM format
  daysOfWeek?: number[]; // 0-6 for Sunday-Saturday
  daysOfMonth?: number[]; // 1-31
  config: DatabaseBackupConfig | FilesystemBackupConfig;
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface SchedulerStats {
  totalSchedules: number;
  activeSchedules: number;
  runningCount: number;
  lastExecution?: Date;
  nextExecution?: Date;
}

export interface ScheduleExecution {
  id: string;
  scheduleId: string;
  startTime: Date;
  endTime?: Date;
  status: 'running' | 'completed' | 'failed';
  result?: BackupResult;
  error?: string;
  logs: string[];
}

export interface GranularRestoreOptions {
  pointInTime?: Date;
  tables?: string[];
  columns?: { [tableName: string]: string[] };
  whereClause?: string;
  limit?: number;
  offset?: number;
  skipTableValidation?: boolean;
}

export interface RestoreValidation {
  canRestore: boolean;
  warnings: string[];
  errors: string[];
  schemaDiff?: {
    addedTables: string[];
    removedTables: string[];
    changedTables: string[];
    details: string[];
  };
  compatibility: {
    version: string;
    compatible: boolean;
  };
}

export interface BackupStats {
  totalBackups: number;
  totalSize: number;
  lastBackup?: Date;
  successRate: number;
  spaceUsed: number;
  spaceAvailable: number;
}

export interface RetentionCleanupResult {
  deletedCount: number;
  spaceFreed: number;
  errors: string[];
}
