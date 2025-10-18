// File: app/api/backup/schedules/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { backupScheduler } from '@/lib/services/backup-scheduler';
import { BackupSchedule, BackupType, BackupFrequency } from '@/lib/types/backup';

// =======================================================
// GET /api/backup/schedules - Get all backup schedules
// =======================================================
export async function GET() {
  try {
    const schedules = await backupScheduler.getAllSchedules();
    const stats = await backupScheduler.getSchedulerStats();

    return NextResponse.json({
      schedules,
      stats,
      message: 'Backup schedules retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting backup schedules:', error);
    return NextResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// =======================================================
// POST /api/backup/schedules - Create new backup schedule
// =======================================================
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      type,
      frequency,
      time,
      daysOfWeek,
      daysOfMonth,
      enabled = false,
      config
    } = body;

    // Validate required fields
    if (!name || !type || !frequency || !time || !config) {
      return NextResponse.json(
        { message: 'Name, type, frequency, time, and config are required' },
        { status: 400 }
      );
    }

    // Validate backup type
    if (type !== BackupType.DATABASE && type !== BackupType.FILESYSTEM) {
      return NextResponse.json(
        { message: `Invalid backup type: ${type}` },
        { status: 400 }
      );
    }

    // Validate frequency
    if (!Object.values(BackupFrequency).includes(frequency)) {
      return NextResponse.json(
        { message: `Invalid frequency: ${frequency}` },
        { status: 400 }
      );
    }

    // Create schedule configuration
    const scheduleData: Omit<BackupSchedule, 'id' | 'createdAt' | 'updatedAt'> = {
      name,
      type,
      frequency,
      time,
      daysOfWeek: frequency === BackupFrequency.WEEKLY ? daysOfWeek : undefined,
      daysOfMonth: frequency === BackupFrequency.MONTHLY ? daysOfMonth : undefined,
      config,
      enabled
    };

    const schedule = await backupScheduler.createSchedule(scheduleData);

    return NextResponse.json({
      schedule,
      message: 'Backup schedule created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating backup schedule:', error);
    return NextResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
