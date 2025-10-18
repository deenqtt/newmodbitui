// File: app/api/backup/restore/granular/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { backupService } from '@/lib/services/backup-service';
import { GranularRestoreOptions } from '@/lib/types/backup';

// =======================================================
// POST /api/backup/restore/granular - Perform granular database restore
// =======================================================
export async function POST(request: NextRequest) {
  try {
    await backupService.initialize();

    const body = await request.json();
    const {
      backupPath,
      tables,
      pointInTime,
      skipTableValidation = false
    } = body;

    if (!backupPath) {
      return NextResponse.json(
        { message: 'Backup path is required' },
        { status: 400 }
      );
    }

    const options: GranularRestoreOptions = {
      tables,
      pointInTime: pointInTime ? new Date(pointInTime) : undefined,
      skipTableValidation
    };

    // Validate options
    if (options.tables && !Array.isArray(options.tables)) {
      return NextResponse.json(
        { message: 'Tables must be an array of table names' },
        { status: 400 }
      );
    }

    if (options.pointInTime && isNaN(options.pointInTime.getTime())) {
      return NextResponse.json(
        { message: 'Invalid point-in-time format' },
        { status: 400 }
      );
    }

    console.log(`🔄 Starting granular restore with options:`, options);

    // Note: Point-in-time recovery is complex for SQLite and would require
    // WAL mode and transaction log analysis. For now, we'll focus on
    // selective table restore.
    if (options.pointInTime) {
      return NextResponse.json(
        {
          message: 'Point-in-time recovery is not yet implemented for SQLite databases',
          feature: 'point-in-time-recovery',
          status: 'not-implemented'
        },
        { status: 501 }
      );
    }

    const result = await backupService.restoreGranular(backupPath, { tables: options.tables });

    const status = result.status === 'completed' ? 200 : 500;

    return NextResponse.json({
      result,
      message: result.status === 'completed'
        ? 'Granular restore completed successfully'
        : 'Granular restore failed'
    }, { status });

  } catch (error) {
    console.error('Error during granular restore:', error);
    return NextResponse.json(
      {
        message: 'Granular restore failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// =======================================================
// POST /api/backup/restore/granular/schema-diff - Analyze schema differences
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

    const schemaDiff = await backupService.analyzeSchemaDifference(backupPath);

    return NextResponse.json({
      schemaDiff,
      message: 'Schema analysis completed successfully'
    });

  } catch (error) {
    console.error('Error during schema analysis:', error);
    return NextResponse.json(
      {
        message: 'Schema analysis failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
