// File: app/api/whatsapp/test/route.ts

import { NextResponse, NextRequest } from "next/server";
import { getAuthFromCookie } from "@/lib/auth";
import { whatsappService } from "@/lib/services/whatsapp-service";

/**
 * POST: Test WhatsApp API with different notification types
 */
export async function POST(request: NextRequest) {
  const auth = await getAuthFromCookie(request);
  if (!auth) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { phoneNumber, recipientName, testType, customMessage } = body;

    if (!phoneNumber || !recipientName) {
      return NextResponse.json(
        { message: "Phone number and recipient name are required" },
        { status: 400 }
      );
    }

    let result;

    switch (testType) {
      case 'custom':
        if (!customMessage) {
          return NextResponse.json(
            { message: "Custom message is required" },
            { status: 400 }
          );
        }
        result = await whatsappService.sendCustomMessage(
          phoneNumber,
          recipientName,
          customMessage
        );
        break;

      case 'maintenance':
        const maintenanceData = {
          userName: recipientName,
          taskName: "TEST: Server Room Maintenance",
          deviceName: "Test AC Unit - Server Room",
          startTime: new Date().toLocaleString('id-ID'),
          endTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toLocaleString('id-ID'),
          status: "scheduled",
          description: "This is a test maintenance notification from MODBit system"
        };
        
        result = await whatsappService.sendMaintenanceNotification(
          phoneNumber,
          maintenanceData,
          auth.userId
        );
        break;

      case 'alarm':
        const alarmData = {
          userName: recipientName,
          deviceName: "TEST: Temperature Sensor #001",
          alarmType: "TEMPERATURE_HIGH",
          severity: "HIGH" as const,
          message: "Temperature exceeded safe limits (>35°C)",
          timestamp: new Date().toISOString(),
          location: "Server Room A - Rack 01"
        };
        
        result = await whatsappService.sendAlarmNotification(
          phoneNumber,
          alarmData,
          auth.userId
        );
        break;

      case 'system':
        const systemData = {
          title: "TEST: System Notification",
          message: "This is a test system notification from MODBit monitoring system",
          severity: "INFO" as const,
          timestamp: new Date().toISOString(),
          additionalInfo: "System status: All services are running normally"
        };
        
        result = await whatsappService.sendSystemNotification(
          phoneNumber,
          recipientName,
          systemData,
          auth.userId
        );
        break;

      default:
        return NextResponse.json(
          { message: "Invalid test type. Use: custom, maintenance, alarm, or system" },
          { status: 400 }
        );
    }

    if (result.success) {
      return NextResponse.json({
        message: `WhatsApp ${testType} message sent successfully`,
        data: {
          testType,
          recipient: recipientName,
          phoneNumber,
          sentAt: new Date().toISOString(),
          response: result.response
        }
      });
    } else {
      return NextResponse.json(
        { 
          message: `Failed to send ${testType} message`, 
          error: result.message 
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("[WhatsApp Test API] Error:", error);
    return NextResponse.json(
      { 
        message: "Failed to send WhatsApp test message", 
        error: error.message 
      },
      { status: 500 }
    );
  }
}

/**
 * GET: Check WhatsApp service configuration status
 */
export async function GET(request: NextRequest) {
  const auth = await getAuthFromCookie(request);
  if (!auth) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    // Check if service is configured
    const isConfigured = process.env.QONTAK_API_URL && 
                        process.env.QONTAK_BEARER_TOKEN && 
                        process.env.QONTAK_CHANNEL_INTEGRATION_ID;

    return NextResponse.json({
      configured: !!isConfigured,
      config: {
        apiUrl: !!process.env.QONTAK_API_URL,
        bearerToken: !!process.env.QONTAK_BEARER_TOKEN,
        channelId: !!process.env.QONTAK_CHANNEL_INTEGRATION_ID,
        templateId: !!process.env.QONTAK_MESSAGE_TEMPLATE_ID,
        language: process.env.QONTAK_LANGUAGE || 'id'
      },
      endpoints: [
        'POST /api/whatsapp/test - Test different message types',
        'POST /api/whatsapp/send - Send custom message',
        'POST /api/whatsapp/alarm - Send alarm notification',
        'POST /api/whatsapp/maintenance - Send maintenance notification',
        'POST /api/whatsapp/bulk - Send bulk messages'
      ]
    });
  } catch (error: any) {
    console.error("[WhatsApp Test API] Configuration check error:", error);
    return NextResponse.json(
      { message: "Failed to check configuration", error: error.message },
      { status: 500 }
    );
  }
}