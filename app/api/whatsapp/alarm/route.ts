// File: app/api/whatsapp/alarm/route.ts

import { NextResponse, NextRequest } from "next/server";
import { getAuthFromCookie } from "@/lib/auth";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { whatsappService } from "@/lib/services/whatsapp-service";
import { format } from "date-fns";

/**
 * POST: Send alarm notification via WhatsApp
 */
export async function POST(request: NextRequest) {
  const auth = await getAuthFromCookie(request);
  if (!auth || auth.role !== Role.ADMIN) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { 
      phoneNumber, 
      userName, 
      deviceName, 
      alarmType, 
      severity, 
      message, 
      location,
      alarmId 
    } = body;

    if (!phoneNumber || !userName || !deviceName || !alarmType || !severity || !message) {
      return NextResponse.json(
        { 
          message: "Phone number, user name, device name, alarm type, severity, and message are required" 
        },
        { status: 400 }
      );
    }

    // Validate severity level
    const validSeverities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
    if (!validSeverities.includes(severity)) {
      return NextResponse.json(
        { message: "Invalid severity level. Must be: LOW, MEDIUM, HIGH, or CRITICAL" },
        { status: 400 }
      );
    }

    // Prepare alarm notification data
    const alarmData = {
      userName,
      deviceName,
      alarmType,
      severity: severity as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
      message,
      timestamp: format(new Date(), "PPpp"),
      location
    };

    // Send alarm notification
    const result = await whatsappService.sendAlarmNotification(
      phoneNumber,
      alarmData
    );

    if (result.success) {
      // Log the notification if alarm ID is provided
      if (alarmId) {
        try {
          await prisma.notification.create({
            data: {
              message: `WhatsApp alarm notification sent: ${alarmType} on ${deviceName}`,
              userId: auth.id,
            },
          });
        } catch (notifError) {
          console.warn("[WhatsApp Alarm API] Failed to log notification:", notifError);
        }
      }

      return NextResponse.json({
        message: "Alarm notification sent successfully",
        data: {
          deviceName,
          alarmType,
          severity,
          recipient: userName,
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
    console.error("[WhatsApp Alarm API] Send alarm notification error:", error);
    return NextResponse.json(
      { message: "Failed to send alarm notification", error: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET: Get alarm notification templates and severity levels
 */
export async function GET(request: NextRequest) {
  const auth = await getAuthFromCookie(request);
  if (!auth) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    return NextResponse.json({
      severityLevels: [
        { value: 'LOW', label: 'Low', emoji: '🟡', description: 'Minor issues that can be addressed during normal hours' },
        { value: 'MEDIUM', label: 'Medium', emoji: '🟠', description: 'Moderate issues requiring attention within hours' },
        { value: 'HIGH', label: 'High', emoji: '🔴', description: 'Serious issues requiring immediate attention' },
        { value: 'CRITICAL', label: 'Critical', emoji: '🚨', description: 'Critical issues requiring immediate emergency response' }
      ],
      commonAlarmTypes: [
        'Temperature High',
        'Temperature Low',
        'Humidity High',
        'Humidity Low',
        'Power Failure',
        'Network Disconnection',
        'Sensor Malfunction',
        'Fire Alarm',
        'Security Breach',
        'System Overload',
        'Battery Low',
        'Communication Error'
      ],
      messageTemplate: {
        structure: "🚨 *ALARM NOTIFICATION*\n\nHello {userName},\n\nAn alarm has been triggered:\n🏷️ *Type:* {alarmType}\n🔌 *Device:* {deviceName}\n⚠️ *Severity:* {severity}\n📅 *Time:* {timestamp}\n📍 *Location:* {location}\n\n📄 *Details:*\n{message}\n\nPlease investigate and take necessary action immediately.\n\n*Modbo Monitoring System*",
        variables: [
          'userName', 'alarmType', 'deviceName', 'severity', 'timestamp', 'location', 'message'
        ]
      }
    });
  } catch (error: any) {
    console.error("[WhatsApp Alarm API] Get alarm info error:", error);
    return NextResponse.json(
      { message: "Failed to get alarm information", error: error.message },
      { status: 500 }
    );
  }
}