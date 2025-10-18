// File: app/api/backup/restore/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { backupService } from '@/lib/services/backup-service';
import { BackupType } from '@/lib/types/backup';

// =======================================================
// GET /api/backup/restore - Get available backups for restore
// =======================================================
export async function GET(request: NextRequest) {
  try {
    await backupService.initialize();

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'database';
    const includeSchemaInfo = searchParams.get('schema') === 'true';

    let backupType: BackupType;
    switch (type.toLowerCase()) {
      case 'database':
        backupType = BackupType.DATABASE;
        break;
      case 'filesystem':
        backupType = BackupType.FILESYSTEM;
        break;
      default:
        backupType = BackupType.DATABASE;
    }

    const backups = await backupService.getAvailableBackups(backupType);

    let currentSchema;
    if (includeSchemaInfo && backupType === BackupType.DATABASE) {
      try {
        const analysis = await backupService.getDatabaseAnalysis();
        currentSchema = {
          tables: analysis.tableStats.map(t => ({ name: t.tableName, rowCount: t.rowCount, lastModified: t.lastModified })),
          totalRows: analysis.summary.totalRows
        };
      } catch (error) {
        console.warn('Could not get current schema info:', error);
      }
    }

    return NextResponse.json({
      backups,
      currentSchema,
      message: `Available ${type} backups retrieved`
    });

  } catch (error) {
    console.error('Error getting available backups:', error);
    return NextResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// =======================================================
// POST /api/backup/restore - Restore database from backup
// =======================================================
export async function POST(request: NextRequest) {
  try {
    await backupService.initialize();

    const body = await request.json();
    const { backupPath, verifyBeforeRestore = true } = body;

    if (!backupPath) {
      return NextResponse.json(
        { message: 'Backup path is required' },
        { status: 400 }
      );
    }

    // Verify backup integrity before restore if requested
    if (verifyBeforeRestore) {
      console.log('🔍 Verifying backup before restore...');
      const verification = await backupService.verifyBackupForRestore(backupPath);

      if (!verification.valid) {
        return NextResponse.json(
          {
            message: 'Backup verification failed',
            verification
          },
          { status: 400 }
        );
      }
    }

    console.log(`🔄 Starting database restore from: ${backupPath}`);

    const result = await backupService.restoreDatabase(backupPath);

    const status = result.status === 'completed' ? 200 : 500;

    return NextResponse.json({
      result,
      message: result.status === 'completed'
        ? 'Database restore completed successfully'
        : 'Database restore failed'
    }, { status });

  } catch (error) {
    console.error('Error during database restore:', error);
    return NextResponse.json(
      {
        message: 'Database restore failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// =======================================================
// PUT /api/backup/restore/verify - Verify backup file
// =======================================================
export async function PUT(request: NextRequest) {
  try {
    await backupService.initialize();

    const body = await request.json();
    const { backupPath } = body;

    if (!backupPath) {
      return NextResponse.json(
        { message: 'Backup path is required' },
        { status: 400 }
      );
    }

    const verification = await backupService.verifyBackupForRestore(backupPath);

    return NextResponse.json({
      verification,
      message: verification.valid
        ? 'Backup verification successful'
        : 'Backup verification failed'
    });

  } catch (error) {
    console.error('Error verifying backup:', error);
    return NextResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
