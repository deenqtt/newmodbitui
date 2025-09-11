// File: app/api/zigbee/bridge/route.ts (Enhanced)
import { NextRequest, NextResponse } from "next/server";
import { getZigbeeListenerService } from "@/lib/services/zigbee-listener";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...params } = body;

    const zigbeeService = getZigbeeListenerService();

    switch (action) {
      case "permit_join":
        const duration = params.duration || 254; // Default 4+ minutes
        await zigbeeService.enablePairing(duration);
        return NextResponse.json({
          success: true,
          message: `Pairing enabled for ${Math.floor(duration / 60)} minutes`,
          duration,
        });

      case "restart":
        await zigbeeService.sendDeviceCommand("bridge/request/restart", {});
        return NextResponse.json({
          success: true,
          message: "Bridge restart requested",
        });

      case "backup":
        await zigbeeService.sendDeviceCommand("bridge/request/backup", {});
        return NextResponse.json({
          success: true,
          message: "Configuration backup requested",
        });

      case "health_check":
        await zigbeeService.sendDeviceCommand(
          "bridge/request/health_check",
          {}
        );
        return NextResponse.json({
          success: true,
          message: "Health check requested",
        });

      case "log_level":
        const level = params.level || "info";
        await zigbeeService.sendDeviceCommand(
          "bridge/request/config/log_level",
          {
            value: level,
          }
        );
        return NextResponse.json({
          success: true,
          message: `Log level set to ${level}`,
        });

      case "coordinator_check":
        await zigbeeService.sendDeviceCommand(
          "bridge/request/coordinator_check",
          {}
        );
        return NextResponse.json({
          success: true,
          message: "Coordinator check requested",
        });

      default:
        return NextResponse.json(
          { error: "Invalid bridge action" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Error in bridge API:", error);

    // More specific error messages
    let errorMessage = "Failed to execute bridge command";
    if (error instanceof Error) {
      if (error.message.includes("timeout")) {
        errorMessage = "Bridge command timed out";
      } else if (error.message.includes("not connected")) {
        errorMessage = "Not connected to Zigbee2MQTT broker";
      }
    }

    return NextResponse.json(
      {
        error: errorMessage,
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
