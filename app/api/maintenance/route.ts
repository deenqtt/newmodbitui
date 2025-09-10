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

    // Prepare the data object
    const maintenanceData: any = {
      name,
      description,
      startTask: new Date(startTask),
      endTask: new Date(endTask),
      assignTo,
      targetType,
      targetId: String(targetId), // Selalu simpan targetId
      status,
      isActive: true,
    };

    // If targetType is Device, validate that the device exists and set the relation
    if (targetType === "Device") {
      // Check if the device exists in DeviceExternal
      const deviceExists = await prisma.deviceExternal.findUnique({
        where: { id: String(targetId) },
      });

      if (deviceExists) {
        maintenanceData.deviceTargetId = String(targetId);
      } else {
        return NextResponse.json(
          { message: "Device not found." },
          { status: 400 }
        );
      }
    }
    // For Rack type, deviceTargetId remains null (default)

    const newMaintenance = await prisma.maintenance.create({
      data: maintenanceData,
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
        const deviceName =
          newMaintenance.deviceTarget?.name || `${targetType} (${targetId})`;

        const notificationData = {
          userName: newMaintenance.assignedTo.email.split("@")[0],
          taskName: newMaintenance.name,
          deviceName,
          startTime: format(new Date(newMaintenance.startTask), "PPpp"),
          endTime: format(new Date(newMaintenance.endTask), "PPpp"),
          status: newMaintenance.status,
          description: newMaintenance.description || undefined,
        };

        const whatsappResult =
          await whatsappService.sendMaintenanceNotification(
            newMaintenance.assignedTo.phoneNumber,
            notificationData
          );

        if (whatsappResult.success) {
          console.log(
            `[Maintenance API] WhatsApp notification sent to ${newMaintenance.assignedTo.phoneNumber}`
          );

          // Log notification in database
          await prisma.notification.create({
            data: {
              message: `WhatsApp notification sent for new maintenance task: ${newMaintenance.name}`,
              userId: newMaintenance.assignTo,
            },
          });
        } else {
          console.warn(
            `[Maintenance API] WhatsApp notification failed: ${whatsappResult.message}`
          );
        }
      } else {
        console.log(
          `[Maintenance API] No phone number for user ${newMaintenance.assignedTo.email}, skipping WhatsApp notification`
        );
      }
    } catch (whatsappError) {
      console.error(
        "[Maintenance API] WhatsApp notification error:",
        whatsappError
      );
      // Don't fail the maintenance creation if WhatsApp fails
    }

    return NextResponse.json(newMaintenance, { status: 201 });
  } catch (error: any) {
    console.error("[Maintenance POST] Error:", error);
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
    const body = await request.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json(
        { message: "Maintenance ID is required." },
        { status: 400 }
      );
    }

    // Filter hanya field yang bisa diupdate
    const allowedFields = [
      "name",
      "description",
      "startTask",
      "endTask",
      "assignTo",
      "targetType",
      "targetId",
      "status",
      "isActive",
      "deviceTargetId",
    ];

    const updateData: any = {};

    // Hanya ambil field yang diizinkan
    for (const field of allowedFields) {
      if (data.hasOwnProperty(field)) {
        if (field === "startTask" || field === "endTask") {
          updateData[field] = data[field] ? new Date(data[field]) : undefined;
        } else {
          updateData[field] = data[field];
        }
      }
    }

    // Handle device relation logic
    if (data.targetType === "Device" && data.targetId) {
      // Check if device exists
      const deviceExists = await prisma.deviceExternal.findUnique({
        where: { id: String(data.targetId) },
      });

      if (deviceExists) {
        updateData.deviceTargetId = String(data.targetId);
      } else {
        updateData.deviceTargetId = null;
      }
    } else {
      // For Rack or when no device, clear the device relation
      updateData.deviceTargetId = null;
    }

    const updatedMaintenance = await prisma.maintenance.update({
      where: { id: parseInt(id) },
      data: updateData,
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

    return NextResponse.json(updatedMaintenance, { status: 200 });
  } catch (error: any) {
    console.error("[Maintenance PUT] Error:", error);
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
