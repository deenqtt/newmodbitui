import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '@/lib/prisma';
import {
  BackupConfig,
  BackupResult,
  BackupStatus,
  BackupType,
  DatabaseBackupConfig,
  FilesystemBackupConfig,
  RetentionPolicy,
  RetentionCleanupResult,
  BackupStats
} from '@/lib/types/backup';

const execAsync = promisify(exec);
const mkdirAsync = promisify(fs.mkdir);
const readdirAsync = promisify(fs.readdir);
const statAsync = promisify(fs.stat);
const unlinkAsync = promisify(fs.unlink);
const rmdirAsync = promisify(fs.rmdir);

export class BackupService {
  private static instance: BackupService;
  private backupRootDir: string;
  private initialized: boolean = false;

  constructor() {
    this.backupRootDir = path.join(process.cwd(), 'backups');
  }

  public static getInstance(): BackupService {
    if (!BackupService.instance) {
      BackupService.instance = new BackupService();
    }
    return BackupService.instance;
  }

  /**
   * Initialize backup directory structure
   */
  public async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Create main backup directory
      if (!fs.existsSync(this.backupRootDir)) {
        await mkdirAsync(this.backupRootDir, { recursive: true });
      }

      // Create subdirectories
      const subDirs = ['database', 'filesystem', 'logs', 'temp'];
      for (const subDir of subDirs) {
        const dirPath = path.join(this.backupRootDir, subDir);
        if (!fs.existsSync(dirPath)) {
          await mkdirAsync(dirPath, { recursive: true });
        }
      }

      console.log('✅ Backup service initialized, directories created');
      this.initialized = true;
    } catch (error) {
      console.error('❌ Failed to initialize backup service:', error);
      throw error;
    }
  }

  /**
   * Perform database backup using SQLite WAL mode
   */
  public async backupDatabase(config: DatabaseBackupConfig): Promise<BackupResult> {
    const backupId = uuidv4();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(
      this.backupRootDir,
      'database',
      `backup-${config.name}-${timestamp}.db`
    );

    const result: BackupResult = {
      id: backupId,
      configId: config.name,
      type: BackupType.DATABASE,
      status: BackupStatus.RUNNING,
      size: 0,
      path: backupPath,
      startedAt: new Date(),
      metadata: {
        includeWal: config.includeWal,
        verifyIntegrity: config.verifyIntegrity
      }
    };

    try {
      console.log(`🔄 Starting database backup: ${config.name}`);

      // Get database path from Prisma config
      const dbPath = path.join(process.cwd(), 'prisma', 'iot_dashboard.db');

      if (!fs.existsSync(dbPath)) {
        throw new Error('Database file not found');
      }

      // Create backup using sqlite3 command with WAL checkpoint
      await execAsync(`sqlite3 "${dbPath}" ".backup '${backupPath}'"`);

      // If WAL is included, copy WAL file as well
      if (config.includeWal) {
        const walPath = `${dbPath}-wal`;
        const shmPath = `${dbPath}-shm`;

        if (fs.existsSync(walPath)) {
          const walBackupPath = `${backupPath}-wal`;
          fs.copyFileSync(walPath, walBackupPath);
        }

        if (fs.existsSync(shmPath)) {
          const shmBackupPath = `${backupPath}-shm`;
          fs.copyFileSync(shmPath, shmBackupPath);
        }
      }

      // Verify integrity if requested
      if (config.verifyIntegrity) {
        await execAsync(`sqlite3 "${backupPath}" "PRAGMA integrity_check;"`);
      }

      // Compress backup if enabled
      if (config.compress) {
        await this.compressFile(backupPath, `${backupPath}.gz`);
        fs.unlinkSync(backupPath);
        result.path = `${backupPath}.gz`;
      }

      // Get final file size
      const stats = fs.statSync(result.path);
      result.size = stats.size;
      result.status = BackupStatus.COMPLETED;
      result.completedAt = new Date();

      console.log(`✅ Database backup completed: ${config.name}, Size: ${(result.size / 1024 / 1024).toFixed(2)} MB`);

    } catch (error) {
      console.error('❌ Database backup failed:', error);
      result.status = BackupStatus.FAILED;
      result.error = error instanceof Error ? error.message : 'Unknown error';
    }

    return result;
  }

  /**
   * Perform incremental filesystem backup
   */
  public async backupFilesystem(config: FilesystemBackupConfig): Promise<BackupResult> {
    const backupId = uuidv4();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupBasePath = path.join(this.backupRootDir, 'filesystem', config.name);

    const result: BackupResult = {
      id: backupId,
      configId: config.name,
      type: BackupType.FILESYSTEM,
      status: BackupStatus.RUNNING,
      size: 0,
      path: backupBasePath,
      startedAt: new Date(),
      metadata: {
        paths: config.paths,
        incremental: config.incremental,
        excludePatterns: config.excludePatterns
      }
    };

    try {
      console.log(`🔄 Starting filesystem backup: ${config.name}`);

      let totalSize = 0;

      for (const sourcePath of config.paths) {
        const resolvedPath = path.resolve(sourcePath);
        const backupDir = path.join(backupBasePath, timestamp, path.basename(resolvedPath));

        // Create backup directory
        await mkdirAsync(backupDir, { recursive: true });

        // Use rsync for efficient incremental backup
        const excludeOpts = config.excludePatterns.map(pattern => `--exclude='${pattern}'`).join(' ');

        const rsyncCmd = `rsync -av --delete ${excludeOpts} "${resolvedPath}/" "${backupDir}/"`;

        await execAsync(rsyncCmd);

        // Calculate size
        const sizeResult = await execAsync(`du -sb "${backupDir}" | cut -f1`);
        totalSize += parseInt(sizeResult.stdout.trim());
      }

      // Compress the entire backup if enabled
      if (config.compress) {
        const compressedPath = `${backupBasePath}-${timestamp}.tar.gz`;
        const tarCmd = `tar -czf "${compressedPath}" -C "${backupBasePath}" "${timestamp}"`;

        await execAsync(tarCmd);

        // Remove uncompressed directory
        await this.removeDirectory(path.join(backupBasePath, timestamp));

        result.path = compressedPath;
        const stats = fs.statSync(compressedPath);
        result.size = stats.size;
      } else {
        result.size = totalSize;
      }

      result.status = BackupStatus.COMPLETED;
      result.completedAt = new Date();

      console.log(`✅ Filesystem backup completed: ${config.name}, Size: ${(result.size / 1024 / 1024).toFixed(2)} MB`);

    } catch (error) {
      console.error('❌ Filesystem backup failed:', error);
      result.status = BackupStatus.FAILED;
      result.error = error instanceof Error ? error.message : 'Unknown error';
    }

    return result;
  }

  /**
   * Clean up old backups based on retention policies
   */
  public async cleanupBackups(policy: RetentionPolicy): Promise<RetentionCleanupResult> {
    const result: RetentionCleanupResult = {
      deletedCount: 0,
      spaceFreed: 0,
      errors: []
    };

    try {
      const backupDir = path.join(this.backupRootDir, policy.type);

      if (!fs.existsSync(backupDir)) {
        return result;
      }

      const items = await readdirAsync(backupDir);
      const filesWithStats = await Promise.all(
        items
          .filter(item => !item.startsWith('.'))
          .map(async (item) => {
            const itemPath = path.join(backupDir, item);
            const stats = await statAsync(itemPath);
            return {
              name: item,
              path: itemPath,
              size: stats.size,
              mtime: stats.mtime,
              isDirectory: stats.isDirectory()
            };
          })
      );

      // Sort by modification time (oldest first)
      filesWithStats.sort((a, b) => a.mtime.getTime() - b.mtime.getTime());

      // Find backups older than retention period
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - policy.days);

      const oldBackups = filesWithStats.filter(item => item.mtime < cutoffDate);

      // Also consider max backups limit
      let backupsToDelete = oldBackups;
      if (filesWithStats.length > policy.maxBackups) {
        const keepCount = policy.maxBackups;
        backupsToDelete = filesWithStats.slice(0, filesWithStats.length - keepCount);
      }

      // Delete old backups
      for (const backup of backupsToDelete) {
        try {
          if (backup.isDirectory) {
            await this.removeDirectory(backup.path);
          } else {
            await unlinkAsync(backup.path);
          }
          result.deletedCount++;
          result.spaceFreed += backup.size;
        } catch (error) {
          const errorMsg = `Failed to delete ${backup.name}: ${error}`;
          result.errors.push(errorMsg);
          console.error(`❌ ${errorMsg}`);
        }
      }

      console.log(`🧹 Cleanup completed: ${result.deletedCount} backups deleted, ${(result.spaceFreed / 1024 / 1024).toFixed(2)} MB freed`);

    } catch (error) {
      console.error('❌ Cleanup failed:', error);
      result.errors.push(`Cleanup failed: ${error}`);
    }

    return result;
  }

  /**
   * Clean up logged data based on retention policy for logging configs
   */
  public async cleanupLoggedData(retentionDays: number): Promise<RetentionCleanupResult> {
    const result: RetentionCleanupResult = {
      deletedCount: 0,
      spaceFreed: 0,
      errors: []
    };

    try {
      console.log(`🧹 Starting cleanup of logged data older than ${retentionDays} days`);

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      // Delete old logged data
      const deleteResult = await prisma.loggedData.deleteMany({
        where: {
          timestamp: {
            lt: cutoffDate
          }
        }
      });

      result.deletedCount = deleteResult.count;

      // Also cleanup old bill logs
      const billDeleteResult = await prisma.billLog.deleteMany({
        where: {
          timestamp: {
            lt: cutoffDate
          }
        }
      });

      result.deletedCount += billDeleteResult.count;

      // Cleanup old alarm logs older than a week (configurable)
      const alarmCutoff = new Date();
      alarmCutoff.setDate(alarmCutoff.getDate() - 7); // Keep alarm logs for 7 days by default

      const alarmDeleteResult = await prisma.alarmLog.deleteMany({
        where: {
          timestamp: {
            lt: alarmCutoff
          }
        }
      });

      result.deletedCount += alarmDeleteResult.count;

      console.log(`✅ Data cleanup completed: ${result.deletedCount} records deleted`);

      // Optimize database after cleanup
      await this.optimizeDatabase();

    } catch (error) {
      console.error('❌ Data cleanup failed:', error);
      result.errors.push(`Data cleanup failed: ${error}`);
    }

    return result;
  }

  /**
   * Restore database from backup file
   */
  public async restoreDatabase(backupPath: string): Promise<BackupResult> {
    const restoreId = uuidv4();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    const result: BackupResult = {
      id: restoreId,
      configId: `restore-${timestamp}`,
      type: BackupType.DATABASE,
      status: BackupStatus.RUNNING,
      size: 0,
      path: backupPath,
      startedAt: new Date(),
      metadata: {
        operation: 'restore',
        sourcePath: backupPath
      }
    };

    try {
      console.log(`🔄 Starting database restore from: ${backupPath}`);

      if (!fs.existsSync(backupPath)) {
        throw new Error('Backup file not found');
      }

      // Get current database path
      const dbPath = path.join(process.cwd(), 'prisma', 'iot_dashboard.db');

      // First, create a backup of current database as safety measure
      const emergencyBackup = path.join(
        this.backupRootDir,
        'emergency-restore-backup.db'
      );

      if (fs.existsSync(dbPath)) {
        fs.copyFileSync(dbPath, emergencyBackup);
        console.log('🛡️  Emergency backup created before restore');
      }

      // Handle compressed backup files
      let actualBackupPath = backupPath;
      if (backupPath.endsWith('.gz')) {
        const decompressedPath = path.join(this.backupRootDir, 'temp', `restore-db-${timestamp}`);
        await this.decompressFile(backupPath, decompressedPath);
        actualBackupPath = decompressedPath;
        console.log('📦 Backup file decompressed');
      }

      // Stop current database connections (this is important for SQLite)
      console.log('⚠️  Closing database connections...');
      await prisma.$disconnect();

      // Wait a bit for connections to close
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Restore from backup
      console.log('🔄 Restoring database...');
      fs.copyFileSync(actualBackupPath, dbPath);

      // Verify restored database integrity
      try {
        console.log('✅ Verifying restored database...');
        await execAsync(`sqlite3 "${dbPath}" "PRAGMA integrity_check;"`);
        console.log('✅ Database integrity verified');
      } catch (error) {
        console.error('❌ Database integrity check failed:', error);
        // Restore from emergency backup if integrity check fails
        if (fs.existsSync(emergencyBackup)) {
          console.log('⚠️  Restoring from emergency backup...');
          fs.copyFileSync(emergencyBackup, dbPath);
          throw new Error('Restore failed - database corrupted, reverted to emergency backup');
        }
        throw new Error('Restore failed - database integrity check failed');
      }

      // Clean up temporary files
      if (actualBackupPath.includes('temp')) {
        try { fs.unlinkSync(actualBackupPath); } catch {}
      }

      // Reconnect to database
      await this.reconnectToDatabase();

      // Get final file size
      const stats = fs.statSync(dbPath);
      result.size = stats.size;
      result.status = BackupStatus.COMPLETED;
      result.completedAt = new Date();

      console.log(`✅ Database restore completed successfully, Size: ${(result.size / 1024 / 1024).toFixed(2)} MB`);

    } catch (error) {
      console.error('❌ Database restore failed:', error);
      result.status = BackupStatus.FAILED;
      result.error = error instanceof Error ? error.message : 'Unknown error';

      // Try to restore from emergency backup
      const emergencyBackup = path.join(this.backupRootDir, 'emergency-restore-backup.db');
      const dbPath = path.join(process.cwd(), 'prisma', 'iot_dashboard.db');

      if (fs.existsSync(emergencyBackup)) {
        try {
          console.log('🚨 Emergency rollback initiated...');
          fs.copyFileSync(emergencyBackup, dbPath);
          await this.reconnectToDatabase();
          console.log('✅ Emergency rollback completed');
        } catch (rollbackError) {
          console.error('❌ Emergency rollback failed:', rollbackError);
        }
      }
    }

    return result;
  }

  /**
   * Get list of available database backups for restore
   */
  public async getAvailableBackups(type: BackupType = BackupType.DATABASE): Promise<Array<{
    name: string;
    path: string;
    size: number;
    created: Date;
    isCompressed: boolean;
  }>> {
    const backupDir = path.join(this.backupRootDir, type);

    if (!fs.existsSync(backupDir)) {
      return [];
    }

    const files = await readdirAsync(backupDir);
    const backups: Array<{
      name: string;
      path: string;
      size: number;
      created: Date;
      isCompressed: boolean;
    }> = [];

    for (const file of files) {
      if (file.startsWith('.') || !file.includes('backup-')) continue;

      const filePath = path.join(backupDir, file);
      const stats = await statAsync(filePath);

      backups.push({
        name: file,
        path: filePath,
        size: stats.size,
        created: stats.mtime,
        isCompressed: file.endsWith('.gz')
      });
    }

    // Sort by creation date (newest first)
    backups.sort((a, b) => b.created.getTime() - a.created.getTime());

    return backups;
  }

  /**
   * Reconnect to database after restore operations
   */
  private async reconnectToDatabase(): Promise<void> {
    try {
      // Force reconnection by creating new instance
      await prisma.$connect();
      console.log('🔗 Database reconnected');
    } catch (error) {
      console.error('❌ Database reconnection failed:', error);
    }
  }

  /**
   * Decompress gzip file
   */
  private async decompressFile(inputPath: string, outputPath: string): Promise<void> {
    await execAsync(`gunzip -c "${inputPath}" > "${outputPath}"`);
  }

  /**
   * Verify database backup before restore
   */
  public async verifyBackupForRestore(backupPath: string): Promise<{
    valid: boolean;
    message: string;
    metadata?: any;
  }> {
    try {
      if (!fs.existsSync(backupPath)) {
        return { valid: false, message: 'Backup file not found' };
      }

      // Handle compressed files
      let actualPath = backupPath;
      if (backupPath.endsWith('.gz')) {
        const tempFile = `${backupPath}.temp`;
        await this.decompressFile(backupPath, tempFile);
        actualPath = tempFile;
      }

      // Check if it's a valid SQLite database
      try {
        await execAsync(`sqlite3 "${actualPath}" "PRAGMA integrity_check;"`, { timeout: 30000 });
      } catch (error) {
        if (actualPath !== backupPath) {
          try { fs.unlinkSync(actualPath); } catch {}
        }
        return { valid: false, message: 'Backup file is not a valid SQLite database' };
      }

      // Get basic metadata
      const stats = fs.statSync(backupPath);
      const fileSize = stats.size;

      if (actualPath !== backupPath) {
        try { fs.unlinkSync(actualPath); } catch {}
      }

      return {
        valid: true,
        message: 'Backup file is valid and ready for restore',
        metadata: {
          size: fileSize,
          compressed: backupPath.endsWith('.gz')
        }
      };

    } catch (error) {
      return {
        valid: false,
        message: `Backup verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Get detailed database analysis and statistics
   */
  public async getDatabaseAnalysis(): Promise<{
    tableStats: Array<{
      tableName: string;
      rowCount: number;
      sizeBytes: number;
      lastModified?: Date;
    }>;
    summary: {
      totalTables: number;
      totalRows: number;
      totalSizeBytes: number;
      databasePath: string;
      createdDate?: Date;
      lastModified?: Date;
    };
  }> {
    try {
      console.log('🔍 Analyzing database structure and statistics...');

      // Query untuk mendapatkan info tabel dan jumlah rows
      const tableInfo = await prisma.$queryRaw<
        Array<{
          name: string;
          type: string;
          sql: string;
        }>
      >`
        SELECT name, type, sql
        FROM sqlite_master
        WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
        ORDER BY name
      `;

      const tableStats: Array<{
        tableName: string;
        rowCount: number;
        sizeBytes: number;
        lastModified?: Date;
      }> = [];

      let totalRows = 0;
      let totalSize = 0;

      // Untuk setiap tabel, hitung jumlah rows dan ukuran
      for (const table of tableInfo) {
        try {
          // Hitung jumlah rows menggunakan Prisma Client proper method
          let rowCount = 0;
          try {
            // First try with Prisma client method
            const modelName = this.getPrismaModelName(table.name);
            if (modelName) {
              // Use Prisma client for known models
              const result = await (prisma as any)[this.camelCase(modelName)].count();
              rowCount = result;
              console.log(`   📊 Counted ${rowCount} records in ${table.name} using Prisma client`);
            } else {
              // Fallback to raw SQL if model not found
              const rowCountResult = await prisma.$queryRaw<Array<{ count: bigint }>>`
                SELECT COUNT(*) as count FROM \`${table.name}\`
              `;
              rowCount = Number(rowCountResult[0]?.count || 0);
              console.log(`   📊 Counted ${rowCount} records in ${table.name} using raw SQL`);
            }
          } catch (countError) {
            console.warn(`   ⚠️  Could not count records in ${table.name}:`, countError);
            rowCount = 0;
          }

          const finalRowCount = Number(rowCount || 0);

          // Hitung ukuran tabel menggunakan metode SQLite yang lebih reliable
          let tableSize = 0;
          try {
            // Method 1: Gunakan sqlite_stat1 untuk estimasi size
            const statResult = await prisma.$queryRaw<Array<{ stat: string }>>`
              SELECT stat FROM sqlite_stat1 WHERE tbl = ${table.name} LIMIT 1
            `;
            if (statResult[0]?.stat) {
              // Parse stat untuk estimasi size (approximated)
              // stat format: "rowcount size"
              const parts = statResult[0].stat.split(' ');
              if (parts.length >= 2) {
                tableSize = Number(parts[1]) || 0;
              }
            }
          } catch (e) {
            // Fallback: gunakan approximation berdasarkan row count
            // Approximate 1KB per row untuk estimasi
            tableSize = Math.max(rowCount * 1024, 1024);
          }

          // Jika masih 0, gunakan approximate berdasarkan table complexity
          if (tableSize === 0) {
            // Basic estimation: minimum 4KB + row data
            tableSize = 4096 + (rowCount * 256);
          }

          // Dapatkan last modified (approximated by newest record)
          let lastModified: Date | undefined;
          try {
            const dateResult = await prisma.$queryRaw<Array<{ latest: Date }>>`
              SELECT MAX(createdAt) as latest FROM \`${table.name}\`
              WHERE createdAt IS NOT NULL
              UNION ALL
              SELECT MAX(updatedAt) as latest FROM \`${table.name}\`
              WHERE updatedAt IS NOT NULL
            `;
            if (dateResult[0]?.latest) {
              lastModified = dateResult[0].latest as Date;
            }
          } catch (e) {
            // Skip jika tabel tidak punya createdAt column
          }

          tableStats.push({
            tableName: table.name,
            rowCount,
            sizeBytes: tableSize,
            lastModified
          });

          totalRows += rowCount;
          totalSize += tableSize;

        } catch (error) {
          // Some tables might not be queryable, skip them
          console.warn(`⚠️  Could not analyze table ${table.name}:`, error);
          tableStats.push({
            tableName: table.name,
            rowCount: 0,
            sizeBytes: 0
          });
        }
      }

      // Database file statistics
      const currentDbPath = path.join(process.cwd(), 'prisma', 'iot_dashboard.db');
      const currentDbStats = fs.statSync(currentDbPath);

      const analysis = {
        tableStats: tableStats.sort((a, b) => b.rowCount - a.rowCount), // Sort by row count descending
        summary: {
          totalTables: tableStats.length,
          totalRows,
          totalSizeBytes: totalSize,
          databasePath: currentDbPath,
          createdDate: currentDbStats.birthtime,
          lastModified: currentDbStats.mtime
        }
      };

      console.log(`✅ Database analysis complete: ${totalRows} total rows across ${tableStats.length} tables`);
      return analysis;

    } catch (error) {
      console.error('❌ Database analysis failed:', error);
      throw new Error(`Database analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get backup statistics
   */
  public async getBackupStats(): Promise<BackupStats> {
    const stats: BackupStats = {
      totalBackups: 0,
      totalSize: 0,
      lastBackup: undefined,
      successRate: 0,
      spaceUsed: 0,
      spaceAvailable: 0
    };

    try {
      // Calculate space usage for backup directory
      try {
        console.log(`📊 Calculating space used for backup directory: ${this.backupRootDir}`);
        const { stdout } = await execAsync(`du -sb "${this.backupRootDir}" 2>/dev/null | cut -f1`);
        const spaceUsedBytes = parseInt(stdout.trim()) || 0;
        stats.spaceUsed = spaceUsedBytes;
        console.log(`✅ Space used: ${(spaceUsedBytes / 1024 / 1024).toFixed(2)} MB`);
      } catch (error) {
        console.error('❌ Error calculating space used:', error);
        stats.spaceUsed = 0;
      }

      // Get available space
      try {
        const { stdout } = await execAsync(`df "${this.backupRootDir}" | tail -1 | awk '{print $4}'`);
        const availableKB = parseInt(stdout.trim()) || 0;
        stats.spaceAvailable = availableKB * 1024; // Convert to bytes
        console.log(`✅ Space available: ${(availableKB / 1024).toFixed(2)} MB`);
      } catch (error) {
        console.error('❌ Error calculating space available:', error);
        stats.spaceAvailable = 0;
      }

      // Count total backups and get last backup time
      let lastBackup: Date | undefined;
      let totalSize = 0;
      let totalBackups = 0;

      for (const subDir of ['database', 'filesystem']) {
        const dirPath = path.join(this.backupRootDir, subDir);
        if (fs.existsSync(dirPath)) {
          try {
            const items = await readdirAsync(dirPath);
            for (const item of items.filter((i: string) => !i.startsWith('.') && !i.endsWith('.tmp') && !i.includes('temp'))) {
              const itemPath = path.join(dirPath, item);
              const itemStats = fs.statSync(itemPath);
              totalSize += itemStats.size;
              totalBackups++;

              if (!lastBackup || itemStats.mtime > lastBackup) {
                lastBackup = itemStats.mtime;
              }
            }
          } catch (error) {
            console.error(`❌ Error reading directory ${dirPath}:`, error);
          }
        } else {
          console.log(`⚠️  Directory ${dirPath} does not exist, creating...`);
          try {
            fs.mkdirSync(dirPath, { recursive: true });
          } catch (error) {
            console.error(`❌ Error creating directory ${dirPath}:`, error);
          }
        }
      }

      stats.totalBackups = totalBackups;
      stats.totalSize = totalSize;
      stats.lastBackup = lastBackup;
      stats.successRate = 100; // Placeholder - would need to track individual backup results

      console.log(`📊 Backup stats complete: ${totalBackups} backups, total size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
      return stats;

    } catch (error) {
      console.error('❌ Failed to get backup stats:', error);
      return stats;
    }
  }

  /**
   * Optimize database after cleanup
   */
  private async optimizeDatabase(): Promise<void> {
    try {
      await execAsync(`sqlite3 "${path.join(process.cwd(), 'prisma', 'iot_dashboard.db')}" "VACUUM;"`);
      await execAsync(`sqlite3 "${path.join(process.cwd(), 'prisma', 'iot_dashboard.db')}" "REINDEX;"`);
      console.log('🗜️ Database optimized after cleanup');
    } catch (error) {
      console.warn('⚠️ Database optimization failed:', error);
    }
  }

  /**
   * Compress a file using gzip
   */
  private async compressFile(inputPath: string, outputPath: string): Promise<void> {
    await execAsync(`gzip -c "${inputPath}" > "${outputPath}"`);
  }

  /**
   * Get Prisma model name from table name
   */
  private getPrismaModelName(tableName: string): string | null {
    // Map SQLite table names to Prisma model names (camelCase)
    const tableToModelMap: Record<string, string> = {
      'AccessController': 'accessController',
      'ActivityLog': 'activityLog',
      'AlarmBitConfiguration': 'alarmBitConfiguration',
      'AlarmConfiguration': 'alarmConfiguration',
      'AlarmLog': 'alarmLog',
      'BillConfiguration': 'billConfiguration',
      'BillLog': 'billLog',
      'Cctv': 'cctv',
      'DashboardLayout': 'dashboardLayout',
      'DeviceData': 'deviceData',
      'DeviceExternal': 'deviceExternal',
      'EnergyTarget': 'energyTarget',
      'GatewayStats': 'gatewayStats',
      'Layout2D': 'layout2D',
      'Layout2DDataPoint': 'layout2DDataPoint',
      'Layout2DFlowIndicator': 'layout2DFlowIndicator',
      'Layout2DTextLabel': 'layout2DTextLabel',
      'LoggedData': 'loggedData',
      'LoggingConfiguration': 'loggingConfiguration',
      'LoraDevice': 'loraDevice',
      'LoraGateway': 'loraGateway',
      'Maintenance': 'maintenance',
      'MenuConfiguration': 'menuConfiguration',
      'MenuGroup': 'menuGroup',
      'MenuItem': 'menuItem',
      'NodeTenantLocation': 'nodeTenantLocation',
      'Notification': 'notification',
      'Permission': 'permission',
      'PowerAnalyzerConfiguration': 'powerAnalyzerConfiguration',
      'PueConfiguration': 'pueConfiguration',
      'Rack': 'rack',
      'Role': 'role',
      'RoleMenuPermission': 'roleMenuPermission',
      'RolePermission': 'rolePermission',
      'Tenant': 'tenant',
      'User': 'user',
      'ZkTecoDevice': 'zkTecoDevice',
      'ZkTecoUser': 'zkTecoUser',
      '_RolePermissions': '', // Relation table - don't count via Prisma
      '_prisma_migrations': '', // System table - don't count via Prisma
      'ec25_alerts': 'ec25Alert',
      'ec25_command_logs': 'ec25CommandLog',
      'ec25_gps_data': 'ec25GpsData',
      'ec25_modems': 'ec25Modem',
      'ec25_network_data': 'ec25NetworkData',
      'ec25_service_health': 'ec25ServiceHealth',
      'ec25_service_logs': 'ec25ServiceLog',
      'zigbee_devices': 'zigbeeDevice'
    };

    return tableToModelMap[tableName] || null;
  }

  /**
   * Convert string to camelCase
   */
  private camelCase(str: string): string {
    return str
      .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) =>
        index === 0 ? word.toLowerCase() : word.toUpperCase()
      )
      .replace(/\s+/g, '');
  }

  /**
   * Analyze schema differences between backup and current database
   */
  public async analyzeSchemaDifference(backupPath: string): Promise<{
    compatible: boolean;
    differences: {
      addedTables: string[];
      removedTables: string[];
      changedTables: string[];
      details: Array<{
        table: string;
        type: 'added' | 'removed' | 'changed';
        description: string;
      }>;
    };
    warnings: string[];
    recommendations: string[];
  }> {
    try {
      console.log(`🔍 Analyzing schema differences for backup: ${backupPath}`);

      // Get current schema
      const currentAnalysis = await this.getDatabaseAnalysis();
      const currentTables = new Set(currentAnalysis.tableStats.map(t => t.tableName));

      // Analyze backup file schema
      let backupTables: string[] = [];
      let backupTableDetails: Array<{ name: string; rowCount: number }> = [];

      if (backupPath.endsWith('.gz')) {
        // For compressed files, we'd need to extract first
        // This is a simplified version
        const decompressedPath = path.join(this.backupRootDir, 'temp', `schema-analysis-${Date.now()}`);
        await this.decompressFile(backupPath, decompressedPath);

        try {
          backupTableDetails = await this.getBackupSchemaInfo(decompressedPath);
        } finally {
          try { fs.unlinkSync(decompressedPath); } catch {}
        }
      } else {
        backupTableDetails = await this.getBackupSchemaInfo(backupPath);
      }

      backupTables = backupTableDetails.map(t => t.name);
      const backupTablesSet = new Set(backupTables);

      // Compare schemas
      const addedTables = backupTables.filter(table => !currentTables.has(table));
      const removedTables = Array.from(currentTables).filter(table => !backupTablesSet.has(table));
      const commonTables = backupTables.filter(table => currentTables.has(table));

      const changedTables: string[] = [];
      const details: Array<{
        table: string;
        type: 'added' | 'removed' | 'changed';
        description: string;
      }> = [];

      // Check for table changes (simplified - row count difference)
      for (const tableName of commonTables) {
        const currentTable = currentAnalysis.tableStats.find(t => t.tableName === tableName);
        const backupTable = backupTableDetails.find(t => t.name === tableName);

        if (currentTable && backupTable && Math.abs(currentTable.rowCount - backupTable.rowCount) > 10) {
          changedTables.push(tableName);
          details.push({
            table: tableName,
            type: 'changed',
            description: `Row count changed from ${backupTable.rowCount} to ${currentTable.rowCount}`
          });
        }
      }

      // Add details for added/removed tables
      addedTables.forEach(table => {
        const backupInfo = backupTableDetails.find(t => t.name === table);
        details.push({
          table,
          type: 'added',
          description: `${backupInfo?.rowCount || 'unknown'} rows will be restored`
        });
      });

      removedTables.forEach(table => {
        const currentInfo = currentAnalysis.tableStats.find(t => t.tableName === table);
        details.push({
          table,
          type: 'removed',
          description: `${currentInfo?.rowCount || 'unknown'} rows will be lost`
        });
      });

      // Generate warnings and recommendations
      const warnings: string[] = [];
      const recommendations: string[] = [];

      if (addedTables.length > 0) {
        warnings.push(`${addedTables.length} new table(s) will be restored: ${addedTables.join(', ')}`);
        recommendations.push('Review new tables before restore');
      }

      if (removedTables.length > 0) {
        warnings.push(`${removedTables.length} existing table(s) will be removed: ${removedTables.join(', ')}`);
        recommendations.push('Consider backing up current data separately');
      }

      if (changedTables.length > 0) {
        warnings.push(`${changedTables.length} table(s) have significant data changes: ${changedTables.join(', ')}`);
        recommendations.push('Consider partial restore for changed tables');
      }

      const compatible = removedTables.length === 0 || !this.hasCriticalTables(removedTables);

      return {
        compatible,
        differences: {
          addedTables,
          removedTables,
          changedTables,
          details
        },
        warnings,
        recommendations
      };

    } catch (error) {
      console.error('❌ Schema analysis failed:', error);
      throw new Error(`Schema analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if removed tables contain critical system tables
   */
  private hasCriticalTables(tableNames: string[]): boolean {
    const criticalTables = ['user', 'permission', 'role', 'tenant']; // Add more as needed
    return tableNames.some(name => criticalTables.includes(name.toLowerCase()));
  }

  /**
   * Get schema information from backup file
   */
  private async getBackupSchemaInfo(backupPath: string): Promise<Array<{ name: string; rowCount: number }>> {
    try {
      const result = await execAsync(`sqlite3 "${backupPath}" ".tables"`);
      const tables = result.stdout.trim().split(/\s+/).filter(t => t);

      const tableDetails: Array<{ name: string; rowCount: number }> = [];

      for (const table of tables) {
        try {
          const countResult = await execAsync(`sqlite3 "${backupPath}" "SELECT COUNT(*) FROM \`${table}\`"`);
          const rowCount = parseInt(countResult.stdout.trim()) || 0;
          tableDetails.push({ name: table, rowCount });
        } catch (error) {
          // Skip tables that can't be queried
          tableDetails.push({ name: table, rowCount: 0 });
        }
      }

      return tableDetails;
    } catch (error) {
      console.error('Failed to get backup schema info:', error);
      return [];
    }
  }

  /**
   * Perform granular restore with selective options
   */
  public async restoreGranular(
    backupPath: string,
    options: {
      tables?: string[];
      pointInTime?: Date;
      skipTableValidation?: boolean;
    }
  ): Promise<BackupResult> {
    const restoreId = uuidv4();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    const result: BackupResult = {
      id: restoreId,
      configId: `granular-restore-${timestamp}`,
      type: BackupType.DATABASE,
      status: BackupStatus.RUNNING,
      size: 0,
      path: backupPath,
      startedAt: new Date(),
      metadata: {
        operation: 'granular-restore',
        sourcePath: backupPath,
        options
      }
    };

    try {
      console.log(`🔄 Starting granular database restore from: ${backupPath}`);
      console.log(`Options:`, options);

      // Validate restore options
      if (options.tables && options.tables.length === 0) {
        throw new Error('No tables specified for granular restore');
      }

      // Create temporary database for selective restore
      const dbPath = path.join(process.cwd(), 'prisma', 'iot_dashboard.db');
      const tempDbPath = path.join(this.backupRootDir, 'temp', `granular-restore-${timestamp}.db`);
      const backupDbPath = path.join(this.backupRootDir, 'temp', `backup-source-${timestamp}.db`);

      // Ensure temp directory exists
      await mkdirAsync(path.dirname(tempDbPath), { recursive: true });

      // Copy backup to temporary location
      if (backupPath.endsWith('.gz')) {
        await this.decompressFile(backupPath, backupDbPath);
      } else {
        fs.copyFileSync(backupPath, backupDbPath);
      }

      // Create new temporary database with WAL mode
      await execAsync(`sqlite3 "${tempDbPath}" "PRAGMA journal_mode=WAL;"`);

      // Perform selective table restore
      if (options.tables && options.tables.length > 0) {
        await this.restoreSelectiveTables(backupDbPath, tempDbPath, options.tables);
      } else {
        // Full restore to temp database
        await execAsync(`sqlite3 "${tempDbPath}" ".restore '${backupDbPath}'"`);
      }

      // Backup current database
      const emergencyBackup = path.join(
        this.backupRootDir,
        'emergency-backup-granular.db'
      );

      if (fs.existsSync(dbPath)) {
        fs.copyFileSync(dbPath, emergencyBackup);
        console.log('🛡️  Emergency backup created before granular restore');
      }

      // Disconnect from current database
      await prisma.$disconnect();

      // Wait and stop database connections
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Replace database with restored version
      fs.copyFileSync(tempDbPath, dbPath);

      // Verify restored database
      try {
        await execAsync(`sqlite3 "${dbPath}" "PRAGMA integrity_check;"`);
        console.log('✅ Granular restore database integrity verified');
      } catch (error) {
        console.error('❌ Database integrity check failed:', error);
        // Restore from emergency backup
        if (fs.existsSync(emergencyBackup)) {
          fs.copyFileSync(emergencyBackup, dbPath);
          throw new Error('Restore failed - database corrupted, reverted to emergency backup');
        }
        throw new Error('Restore failed - database integrity check failed');
      }

      // Reconnect and optimize
      await this.reconnectToDatabase();
      await this.optimizeDatabase();

      // Clean up temporary files
      try {
        fs.unlinkSync(tempDbPath);
        fs.unlinkSync(backupDbPath);
      } catch (cleanupError) {
        console.warn('⚠️ Cleanup warning:', cleanupError);
      }

      // Get final file size
      const stats = fs.statSync(dbPath);
      result.size = stats.size;
      result.status = BackupStatus.COMPLETED;
      result.completedAt = new Date();

      console.log(`✅ Granular restore completed successfully, Size: ${(result.size / 1024 / 1024).toFixed(2)} MB`);

    } catch (error) {
      console.error('❌ Granular restore failed:', error);
      result.status = BackupStatus.FAILED;
      result.error = error instanceof Error ? error.message : 'Unknown error';

      // Try emergency rollback
      const emergencyBackup = path.join(this.backupRootDir, 'emergency-backup-granular.db');
      const dbPath = path.join(process.cwd(), 'prisma', 'iot_dashboard.db');

      if (fs.existsSync(emergencyBackup)) {
        try {
          console.log('🚨 Emergency rollback initiated...');
          fs.copyFileSync(emergencyBackup, dbPath);
          await this.reconnectToDatabase();
        } catch (rollbackError) {
          console.error('❌ Emergency rollback failed:', rollbackError);
        }
      }
    }

    return result;
  }

  /**
   * Restore selective tables from backup
   */
  private async restoreSelectiveTables(backupPath: string, targetPath: string, tables: string[]): Promise<void> {
    console.log(`Restoring selective tables: ${tables.join(', ')}`);

    for (const table of tables) {
      try {
        console.log(`Restoring table: ${table}`);

        // Get table schema from backup
        const schemaResult = await execAsync(`sqlite3 "${backupPath}" "SELECT sql FROM sqlite_master WHERE type='table' AND name='${table}';"`);
        const createTableSQL = schemaResult.stdout.trim();

        if (!createTableSQL) {
          console.warn(`⚠️ Table ${table} not found in backup, skipping`);
          continue;
        }

        // Create table in target database
        await execAsync(`sqlite3 "${targetPath}" "${createTableSQL}"`);

        // Copy data (using .dump and filtering)
        const dumpResult = await execAsync(`sqlite3 "${backupPath}" ".dump '${table}'"`);

        // Parse the dump and apply to target
        const lines = dumpResult.stdout.split('\n').filter(line =>
          !line.includes('PRAGMA') &&
          !line.includes('BEGIN') &&
          !line.includes('COMMIT') &&
          line.trim() !== ''
        );

        // Insert the data into target database
        const insertSQL = lines.join('\n');
        if (insertSQL) {
          await execAsync(`sqlite3 "${targetPath}" "${insertSQL}"`);
        }

        console.log(`✅ Table ${table} restored successfully`);

      } catch (error) {
        console.error(`❌ Failed to restore table ${table}:`, error);
        throw new Error(`Failed to restore table ${table}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    console.log(`✅ Selective table restore completed`);
  }

  /**
   * Remove directory recursively
   */
  private async removeDirectory(dirPath: string): Promise<void> {
    try {
      const items = await readdirAsync(dirPath);
      for (const item of items) {
        const itemPath = path.join(dirPath, item);
        const stats = await statAsync(itemPath);
        if (stats.isDirectory()) {
          await this.removeDirectory(itemPath);
        } else {
          await unlinkAsync(itemPath);
        }
      }
      await rmdirAsync(dirPath);
    } catch (error) {
      console.error(`Failed to remove directory ${dirPath}:`, error);
      throw error;
    }
  }
}

export const backupService = BackupService.getInstance();
