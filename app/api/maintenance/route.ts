// File: app/api/maintenance/route.ts

import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromCookie } from "@/lib/auth";
import { Role } from "@prisma/client";
import { whatsappService } from "@/lib/services/whatsapp-service";
import { format } from "date-fns";

/**
 * GET: Mengambil semua jadwal maintenance.
 */
export async function GET(request: NextRequest) {
  const auth = await getAuthFromCookie(request);
  if (!auth) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const maintenances = await prisma.maintenance.findMany({
      include: {
        assignedTo: {
          select: {
            id: true,
            email: true,
            phoneNumber: true,
          },
        },
        // Tambahkan include ini untuk mengambil data perangkat yang terkait.
        deviceTarget: true,
      },
    });

    return NextResponse.json(maintenances);
  } catch (error: any) {
    return NextResponse.json(
      {
        message: "Failed to fetch maintenance schedules.",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * POST: Membuat jadwal maintenance baru.
 */
export async function POST(request: NextRequest) {
  const auth = await getAuthFromCookie(request);
  if (!auth || auth.role !== Role.ADMIN) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const {
      name,
      description,
      startTask,
      endTask,
      assignTo,
      targetType,
      targetId,
      status,
    } = body;

    // Pastikan targetId ada dan merupakan string yang valid
    if (!targetId) {
      return NextResponse.json(
        { message: "targetId is required." },
        { status: 400 }
      );
    }

    const newMaintenance = await prisma.maintenance.create({
      data: {
        name,
        description,
        startTask: new Date(startTask),
        endTask: new Date(endTask),
        assignTo,
        targetType,
        // targetId adalah string (cuid dari DeviceExternal)
        targetId: String(targetId),
        status,
        isActive: true, // Default
      },
      include: {
        assignedTo: {
          select: {
            id: true,
            email: true,
            phoneNumber: true,
          },
        },
        deviceTarget: {
          select: {
            name: true,
            topic: true,
          },
        },
      },
    });

    // Send WhatsApp notification if user has phone number
    try {
      if (newMaintenance.assignedTo.phoneNumber) {
        const notificationData = {
          userName: newMaintenance.assignedTo.email.split('@')[0],
          taskName: newMaintenance.name,
          deviceName: newMaintenance.deviceTarget?.name,
          startTime: format(new Date(newMaintenance.startTask), "PPpp"),
          endTime: format(new Date(newMaintenance.endTask), "PPpp"),
          status: newMaintenance.status,
          description: newMaintenance.description || undefined,
        };

        const whatsappResult = await whatsappService.sendMaintenanceNotification(
          newMaintenance.assignedTo.phoneNumber,
          notificationData
        );

        if (whatsappResult.success) {
          console.log(`[Maintenance API] WhatsApp notification sent to ${newMaintenance.assignedTo.phoneNumber}`);
          
          // Log notification in database
          await prisma.notification.create({
            data: {
              message: `WhatsApp notification sent for new maintenance task: ${newMaintenance.name}`,
              userId: newMaintenance.assignTo,
            },
          });
        } else {
          console.warn(`[Maintenance API] WhatsApp notification failed: ${whatsappResult.message}`);
        }
      } else {
        console.log(`[Maintenance API] No phone number for user ${newMaintenance.assignedTo.email}, skipping WhatsApp notification`);
      }
    } catch (whatsappError) {
      console.error("[Maintenance API] WhatsApp notification error:", whatsappError);
      // Don't fail the maintenance creation if WhatsApp fails
    }

    return NextResponse.json(newMaintenance, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      {
        message: "Failed to create maintenance schedule.",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * PUT: Memperbarui jadwal maintenance yang sudah ada.
 */
export async function PUT(request: NextRequest) {
  const auth = await getAuthFromCookie(request);
  if (!auth || auth.role !== Role.ADMIN) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    const { id, ...data } = await request.json();
    if (!id) {
      return NextResponse.json(
        { message: "Maintenance ID is required." },
        { status: 400 }
      );
    }

    const updatedMaintenance = await prisma.maintenance.update({
      where: { id: parseInt(id) },
      data: {
        ...data,
        startTask: data.startTask ? new Date(data.startTask) : undefined,
        endTask: data.endTask ? new Date(data.endTask) : undefined,
      },
    });

    return NextResponse.json(updatedMaintenance, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      {
        message: "Failed to update maintenance schedule.",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE: Menghapus jadwal maintenance.
 */
export async function DELETE(request: NextRequest) {
  const auth = await getAuthFromCookie(request);
  if (!auth || auth.role !== Role.ADMIN) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { message: "Maintenance ID is required." },
        { status: 400 }
      );
    }

    await prisma.maintenance.delete({
      where: { id: parseInt(id) },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    return NextResponse.json(
      {
        message: "Failed to delete maintenance schedule.",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
