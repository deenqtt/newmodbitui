// File: app/api/whatsapp/maintenance/route.ts

import { NextResponse, NextRequest } from "next/server";
import { getAuthFromCookie } from "@/lib/auth";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { whatsappService } from "@/lib/services/whatsapp-service";
import { format } from "date-fns";

/**
 * POST: Send maintenance notification via WhatsApp
 */
export async function POST(request: NextRequest) {
  const auth = await getAuthFromCookie(request);
  if (!auth || auth.role !== Role.ADMIN) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { maintenanceId, phoneNumber, customMessage } = body;

    if (!maintenanceId) {
      return NextResponse.json(
        { message: "Maintenance ID is required" },
        { status: 400 }
      );
    }

    // Fetch maintenance data with relations
    const maintenance = await prisma.maintenance.findUnique({
      where: { id: parseInt(maintenanceId) },
      include: {
        assignedTo: {
          select: {
            id: true,
            email: true,
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

    if (!maintenance) {
      return NextResponse.json(
        { message: "Maintenance not found" },
        { status: 404 }
      );
    }

    // Use provided phone number or try to extract from user email
    let targetPhoneNumber = phoneNumber;
    if (!targetPhoneNumber) {
      // You might want to add phone number field to User model
      // For now, we'll return an error
      return NextResponse.json(
        { message: "Phone number is required" },
        { status: 400 }
      );
    }

    // Prepare notification data
    const notificationData = {
      userName: maintenance.assignedTo.email.split('@')[0], // Use email username as name
      taskName: maintenance.name,
      deviceName: maintenance.deviceTarget?.name,
      startTime: format(new Date(maintenance.startTask), "PPpp"),
      endTime: format(new Date(maintenance.endTask), "PPpp"),
      status: maintenance.status,
      description: maintenance.description || undefined,
    };

    // Send notification
    const result = await whatsappService.sendMaintenanceNotification(
      targetPhoneNumber,
      notificationData
    );

    if (result.success) {
      // Log the notification (optional - you can create a notification log table)
      try {
        await prisma.notification.create({
          data: {
            message: `WhatsApp notification sent for maintenance: ${maintenance.name}`,
            userId: maintenance.assignTo,
          },
        });
      } catch (notifError) {
        console.warn("[WhatsApp API] Failed to log notification:", notifError);
      }

      return NextResponse.json({
        message: "Maintenance notification sent successfully",
        data: {
          maintenanceId: maintenance.id,
          taskName: maintenance.name,
          recipientEmail: maintenance.assignedTo.email,
          sentAt: new Date().toISOString(),
          response: result.response
        }
      });
    } else {
      return NextResponse.json(
        { message: result.message },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("[WhatsApp API] Maintenance notification error:", error);
    return NextResponse.json(
      { message: "Failed to send maintenance notification", error: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET: Get maintenance data for WhatsApp notification preview
 */
export async function GET(request: NextRequest) {
  const auth = await getAuthFromCookie(request);
  if (!auth || auth.role !== Role.ADMIN) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const maintenanceId = searchParams.get("maintenanceId");

    if (!maintenanceId) {
      return NextResponse.json(
        { message: "Maintenance ID is required" },
        { status: 400 }
      );
    }

    const maintenance = await prisma.maintenance.findUnique({
      where: { id: parseInt(maintenanceId) },
      include: {
        assignedTo: {
          select: {
            id: true,
            email: true,
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

    if (!maintenance) {
      return NextResponse.json(
        { message: "Maintenance not found" },
        { status: 404 }
      );
    }

    // Generate preview data
    const notificationData = {
      userName: maintenance.assignedTo.email.split('@')[0],
      taskName: maintenance.name,
      deviceName: maintenance.deviceTarget?.name,
      startTime: format(new Date(maintenance.startTask), "PPpp"),
      endTime: format(new Date(maintenance.endTask), "PPpp"),
      status: maintenance.status,
      description: maintenance.description || undefined,
    };

    // Generate message preview
    const messagePreview = `🔧 *MAINTENANCE NOTIFICATION*

Hello ${notificationData.userName},

You have been assigned a maintenance task:
📋 *Task:* ${notificationData.taskName}
${notificationData.deviceName ? `🔌 *Device:* ${notificationData.deviceName}\n` : ''}📅 *Start Time:* ${notificationData.startTime}
📅 *End Time:* ${notificationData.endTime}
📊 *Status:* ${notificationData.status}
${notificationData.description ? `📝 *Description:* ${notificationData.description}\n` : ''}
Please ensure you complete this task on time.
For any questions, contact your supervisor.

*Modbo Monitoring System*`;

    return NextResponse.json({
      maintenance: {
        id: maintenance.id,
        name: maintenance.name,
        assignedTo: maintenance.assignedTo.email,
        deviceName: maintenance.deviceTarget?.name,
        startTask: maintenance.startTask,
        endTask: maintenance.endTask,
        status: maintenance.status,
        description: maintenance.description,
      },
      messagePreview,
      notificationData
    });
  } catch (error: any) {
    console.error("[WhatsApp API] Get maintenance preview error:", error);
    return NextResponse.json(
      { message: "Failed to get maintenance data", error: error.message },
      { status: 500 }
    );
  }
}