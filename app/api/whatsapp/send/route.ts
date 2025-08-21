// File: app/api/whatsapp/send/route.ts

import { NextResponse, NextRequest } from "next/server";
import { getAuthFromCookie } from "@/lib/auth";
import { Role } from "@prisma/client";
import { whatsappService } from "@/lib/services/whatsapp-service";

/**
 * POST: Send custom WhatsApp message
 */
export async function POST(request: NextRequest) {
  const auth = await getAuthFromCookie(request);
  if (!auth) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { phoneNumber, recipientName, message, additionalParams } = body;

    if (!phoneNumber || !recipientName || !message) {
      return NextResponse.json(
        { message: "Phone number, recipient name, and message are required" },
        { status: 400 }
      );
    }

    const result = await whatsappService.sendCustomMessage(
      phoneNumber,
      recipientName,
      message,
      additionalParams || []
    );

    if (result.success) {
      return NextResponse.json({
        message: "WhatsApp message sent successfully",
        data: result.response
      });
    } else {
      return NextResponse.json(
        { message: result.message },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("[WhatsApp API] Send message error:", error);
    return NextResponse.json(
      { message: "Failed to send WhatsApp message", error: error.message },
      { status: 500 }
    );
  }
}