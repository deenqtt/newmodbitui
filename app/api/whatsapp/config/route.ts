// File: app/api/whatsapp/config/route.ts

import { NextResponse, NextRequest } from "next/server";
import { getAuthFromCookie } from "@/lib/auth";
import { Role } from "@prisma/client";
import { whatsappService } from "@/lib/services/whatsapp-service";

/**
 * GET: Get WhatsApp configuration status
 */
export async function GET(request: NextRequest) {
  const auth = await getAuthFromCookie(request);
  if (!auth || auth.role !== Role.ADMIN) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    const configStatus = whatsappService.getConfigStatus();
    
    return NextResponse.json({
      status: "success",
      data: configStatus
    });
  } catch (error: any) {
    console.error("[WhatsApp Config API] Get config error:", error);
    return NextResponse.json(
      { message: "Failed to get WhatsApp configuration", error: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT: Update WhatsApp configuration
 */
export async function PUT(request: NextRequest) {
  const auth = await getAuthFromCookie(request);
  if (!auth || auth.role !== Role.ADMIN) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { 
      apiUrl, 
      bearerToken, 
      channelIntegrationId, 
      messageTemplateId, 
      language 
    } = body;

    // Update configuration
    const configUpdate: any = {};
    
    if (apiUrl) configUpdate.apiUrl = apiUrl;
    if (bearerToken) configUpdate.bearerToken = bearerToken;
    if (channelIntegrationId) configUpdate.channelIntegrationId = channelIntegrationId;
    if (messageTemplateId) configUpdate.messageTemplateId = messageTemplateId;
    if (language) configUpdate.language = language;

    whatsappService.updateConfig(configUpdate);

    const updatedStatus = whatsappService.getConfigStatus();

    return NextResponse.json({
      message: "WhatsApp configuration updated successfully",
      data: updatedStatus
    });
  } catch (error: any) {
    console.error("[WhatsApp Config API] Update config error:", error);
    return NextResponse.json(
      { message: "Failed to update WhatsApp configuration", error: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST: Test WhatsApp connection
 */
export async function POST(request: NextRequest) {
  const auth = await getAuthFromCookie(request);
  if (!auth || auth.role !== Role.ADMIN) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { testPhoneNumber } = body;

    if (!testPhoneNumber) {
      return NextResponse.json(
        { message: "Test phone number is required" },
        { status: 400 }
      );
    }

    const testResult = await whatsappService.testConnection(testPhoneNumber);

    if (testResult.success) {
      return NextResponse.json({
        message: "WhatsApp connection test successful",
        data: testResult
      });
    } else {
      return NextResponse.json(
        { message: testResult.message },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("[WhatsApp Config API] Test connection error:", error);
    return NextResponse.json(
      { message: "Failed to test WhatsApp connection", error: error.message },
      { status: 500 }
    );
  }
}