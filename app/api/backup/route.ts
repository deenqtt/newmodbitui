// File: app/api/backup/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { backupService } from '@/lib/services/backup-service';
import {
  DatabaseBackupConfig,
  FilesystemBackupConfig,
  RetentionPolicy,
  BackupType
} from '@/lib/types/backup';

// =======================================================
// GET /api/backup - Get backup statistics and list backups
// =======================================================
export async function GET() {
  try {
    await backupService.initialize();

    // Get backup statistics
    const stats = await backupService.getBackupStats();

    // List recent backups (could be expanded to show more details)
    // For now, just return stats

    return NextResponse.json({
      stats,
      message: 'Backup statistics retrieved successfully'
    });

  } catch (error) {
    console.error('Error getting backup stats:', error);
    return NextResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// =======================================================
// POST /api/backup - Create backup (database or filesystem)
// =======================================================
export async function POST(request: NextRequest) {
  try {
    await backupService.initialize();

    const body = await request.json();
    const { type, config } = body;

    if (!type || !config) {
      return NextResponse.json(
        { message: 'Type and config are required' },
        { status: 400 }
      );
    }

    let result;

    switch (type) {
      case BackupType.DATABASE:
        // Validate database backup config
        if (!config.name) {
          return NextResponse.json(
            { message: 'Database backup name is required' },
            { status: 400 }
          );
        }

        const dbConfig: DatabaseBackupConfig = {
          name: config.name,
          type: BackupType.DATABASE,
          retentionDays: config.retentionDays || 30,
          compress: config.compress !== false, // Default true
          encrypt: config.encrypt || false,
          includeWal: config.includeWal || false,
          verifyIntegrity: config.verifyIntegrity !== false // Default true
        };

        result = await backupService.backupDatabase(dbConfig);
        break;

      case BackupType.FILESYSTEM:
        // Validate filesystem backup config
        if (!config.name || !config.paths || !Array.isArray(config.paths)) {
          return NextResponse.json(
            { message: 'Filesystem backup name and paths are required' },
            { status: 400 }
          );
        }

        const fsConfig: FilesystemBackupConfig = {
          name: config.name,
          type: BackupType.FILESYSTEM,
          retentionDays: config.retentionDays || 30,
          compress: config.compress !== false, // Default true
          encrypt: config.encrypt || false,
          paths: config.paths,
          excludePatterns: config.excludePatterns || [],
          incremental: config.incremental !== false // Default true
        };

        result = await backupService.backupFilesystem(fsConfig);
        break;

      default:
        return NextResponse.json(
          { message: `Unsupported backup type: ${type}` },
          { status: 400 }
        );
    }

    return NextResponse.json({
      result,
      message: `Backup ${result.status === 'completed' ? 'completed' : 'failed'}`
    }, { status: result.status === 'completed' ? 201 : 500 });

  } catch (error) {
    console.error('Error creating backup:', error);
    return NextResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// =======================================================
// PUT /api/backup/cleanup - Clean up old backups based on retention policy
// =======================================================
export async function PUT(request: NextRequest) {
  try {
    await backupService.initialize();

    const body = await request.json();
    const { type, days, maxBackups } = body;

    if (!type || (!days && !maxBackups)) {
      return NextResponse.json(
        { message: 'Type and either days or maxBackups are required' },
        { status: 400 }
      );
    }

    const policy: RetentionPolicy = {
      type,
      days: days || 30,
      maxBackups: maxBackups || 10,
      compress: false
    };

    const result = await backupService.cleanupBackups(policy);

    return NextResponse.json({
      result,
      message: `Cleanup completed: ${result.deletedCount} backups deleted`
    });

  } catch (error) {
    console.error('Error during cleanup:', error);
    return NextResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
