// File: app/api/backup/schedules/[scheduleId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { backupScheduler } from '@/lib/services/backup-scheduler';
import { BackupType, BackupFrequency } from '@/lib/types/backup';

interface RouteParams {
  params: {
    scheduleId: string;
  };
}

// =======================================================
// GET /api/backup/schedules/[scheduleId] - Get specific schedule
// =======================================================
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const scheduleId = params.scheduleId;
    const schedule = await backupScheduler.getScheduleById(scheduleId);

    if (!schedule) {
      return NextResponse.json(
        { message: 'Backup schedule not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      schedule,
      message: 'Backup schedule retrieved successfully'
    });

  } catch (error) {
    console.error('Error getting backup schedule:', error);
    return NextResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// =======================================================
// PUT /api/backup/schedules/[scheduleId] - Update backup schedule
// =======================================================
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const scheduleId = params.scheduleId;
    const body = await request.json();

    const {
      name,
      type,
      frequency,
      time,
      daysOfWeek,
      daysOfMonth,
      enabled,
      config
    } = body;

    // Prepare update data
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (type !== undefined) {
      if (type !== BackupType.DATABASE && type !== BackupType.FILESYSTEM) {
        return NextResponse.json(
          { message: `Invalid backup type: ${type}` },
          { status: 400 }
        );
      }
      updateData.type = type;
    }
    if (frequency !== undefined) {
      if (!Object.values(BackupFrequency).includes(frequency)) {
        return NextResponse.json(
          { message: `Invalid frequency: ${frequency}` },
          { status: 400 }
        );
      }
      updateData.frequency = frequency;
    }
    if (time !== undefined) updateData.time = time;
    if (daysOfWeek !== undefined) updateData.daysOfWeek = daysOfWeek;
    if (daysOfMonth !== undefined) updateData.daysOfMonth = daysOfMonth;
    if (enabled !== undefined) updateData.enabled = enabled;
    if (config !== undefined) updateData.config = config;

    const updatedSchedule = await backupScheduler.updateSchedule(scheduleId, updateData);

    if (!updatedSchedule) {
      return NextResponse.json(
        { message: 'Backup schedule not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      schedule: updatedSchedule,
      message: 'Backup schedule updated successfully'
    });

  } catch (error) {
    console.error('Error updating backup schedule:', error);
    return NextResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// =======================================================
// DELETE /api/backup/schedules/[scheduleId] - Delete backup schedule
// =======================================================
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const scheduleId = params.scheduleId;
    const success = await backupScheduler.deleteSchedule(scheduleId);

    if (!success) {
      return NextResponse.json(
        { message: 'Backup schedule not found or could not be deleted' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Backup schedule deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting backup schedule:', error);
    return NextResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
