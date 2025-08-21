// File: app/api/whatsapp/bulk/route.ts

import { NextResponse, NextRequest } from "next/server";
import { getAuthFromCookie } from "@/lib/auth";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { whatsappService } from "@/lib/services/whatsapp-service";

/**
 * POST: Send bulk WhatsApp notifications
 */
export async function POST(request: NextRequest) {
  const auth = await getAuthFromCookie(request);
  if (!auth || auth.role !== Role.ADMIN) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { 
      recipients, 
      message, 
      notificationType = 'custom',
      scheduleTime 
    } = body;

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return NextResponse.json(
        { message: "Recipients array is required and must not be empty" },
        { status: 400 }
      );
    }

    if (!message || message.trim().length === 0) {
      return NextResponse.json(
        { message: "Message is required" },
        { status: 400 }
      );
    }

    // Validate recipients format
    const invalidRecipients = recipients.filter(r => 
      !r.phoneNumber || !r.name || 
      typeof r.phoneNumber !== 'string' || 
      typeof r.name !== 'string'
    );

    if (invalidRecipients.length > 0) {
      return NextResponse.json(
        { 
          message: "Invalid recipients format. Each recipient must have phoneNumber and name",
          invalidCount: invalidRecipients.length
        },
        { status: 400 }
      );
    }

    // Check if this is a scheduled notification
    if (scheduleTime) {
      const scheduledTime = new Date(scheduleTime);
      if (scheduledTime <= new Date()) {
        return NextResponse.json(
          { message: "Schedule time must be in the future" },
          { status: 400 }
        );
      }

      // For now, we'll send immediately. In production, you'd want to implement a job queue
      // like Bull/BullMQ or use a cron service to handle scheduled messages
      return NextResponse.json(
        { message: "Scheduled notifications are not yet implemented" },
        { status: 501 }
      );
    }

    // Limit bulk size to prevent abuse
    const MAX_BULK_SIZE = 100;
    if (recipients.length > MAX_BULK_SIZE) {
      return NextResponse.json(
        { 
          message: `Bulk size limited to ${MAX_BULK_SIZE} recipients. Current: ${recipients.length}` 
        },
        { status: 400 }
      );
    }

    // Send bulk notifications
    const result = await whatsappService.sendBulkNotifications(
      recipients,
      message,
      notificationType
    );

    // Log the bulk notification
    try {
      await prisma.notification.create({
        data: {
          message: `Bulk WhatsApp notification sent to ${recipients.length} recipients (${result.summary.successful} successful, ${result.summary.failed} failed)`,
          userId: auth.id,
        },
      });
    } catch (notifError) {
      console.warn("[WhatsApp Bulk API] Failed to log notification:", notifError);
    }

    // Return detailed results
    return NextResponse.json({
      message: "Bulk notification processing completed",
      summary: result.summary,
      details: {
        notificationType,
        totalRecipients: recipients.length,
        processedAt: new Date().toISOString(),
        initiatedBy: auth.email
      },
      results: result.results,
      success: result.success
    });

  } catch (error: any) {
    console.error("[WhatsApp Bulk API] Send bulk notification error:", error);
    return NextResponse.json(
      { message: "Failed to send bulk notifications", error: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET: Get bulk notification history and statistics
 */
export async function GET(request: NextRequest) {
  const auth = await getAuthFromCookie(request);
  if (!auth || auth.role !== Role.ADMIN) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "10");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Get recent bulk notifications from the notification log
    const recentNotifications = await prisma.notification.findMany({
      where: {
        message: {
          contains: "Bulk WhatsApp notification"
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit,
      skip: offset,
      include: {
        user: {
          select: {
            email: true
          }
        }
      }
    });

    // Get total count for pagination
    const totalCount = await prisma.notification.count({
      where: {
        message: {
          contains: "Bulk WhatsApp notification"
        }
      }
    });

    // Parse notification messages to extract statistics
    const parsedNotifications = recentNotifications.map(notification => {
      const message = notification.message;
      const recipientMatch = message.match(/sent to (\d+) recipients/);
      const successMatch = message.match(/\((\d+) successful/);
      const failedMatch = message.match(/(\d+) failed\)/);

      return {
        id: notification.id,
        createdAt: notification.createdAt,
        initiatedBy: notification.user?.email || 'Unknown',
        totalRecipients: recipientMatch ? parseInt(recipientMatch[1]) : 0,
        successful: successMatch ? parseInt(successMatch[1]) : 0,
        failed: failedMatch ? parseInt(failedMatch[1]) : 0
      };
    });

    // Calculate overall statistics
    const overallStats = parsedNotifications.reduce((acc, notif) => {
      acc.totalNotifications += 1;
      acc.totalRecipients += notif.totalRecipients;
      acc.totalSuccessful += notif.successful;
      acc.totalFailed += notif.failed;
      return acc;
    }, {
      totalNotifications: 0,
      totalRecipients: 0,
      totalSuccessful: 0,
      totalFailed: 0
    });

    return NextResponse.json({
      history: parsedNotifications,
      pagination: {
        limit,
        offset,
        total: totalCount,
        hasMore: offset + limit < totalCount
      },
      statistics: {
        ...overallStats,
        successRate: overallStats.totalRecipients > 0 
          ? ((overallStats.totalSuccessful / overallStats.totalRecipients) * 100).toFixed(2) + '%'
          : '0%'
      },
      limits: {
        maxBulkSize: 100,
        rateLimitPerMinute: 60,
        rateLimitPerHour: 1000
      }
    });

  } catch (error: any) {
    console.error("[WhatsApp Bulk API] Get bulk history error:", error);
    return NextResponse.json(
      { message: "Failed to get bulk notification history", error: error.message },
      { status: 500 }
    );
  }
}