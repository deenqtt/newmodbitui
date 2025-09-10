// File: app/api/zigbee/devices/[deviceId]/command/route.ts (Optimized)
import { NextRequest, NextResponse } from "next/server";
import { getZigbeeListenerService } from "@/lib/services/zigbee-listener";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: {
    deviceId: string;
  };
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { deviceId } = params;
    const command = await request.json();

    // Validate command
    if (!command || typeof command !== "object") {
      return NextResponse.json(
        { error: "Invalid command format" },
        { status: 400 }
      );
    }

    // Find device
    const device = await prisma.zigbeeDevice.findFirst({
      where: {
        OR: [{ deviceId }, { friendlyName: deviceId }],
      },
    });

    if (!device) {
      return NextResponse.json({ error: "Device not found" }, { status: 404 });
    }

    if (!device.isOnline) {
      return NextResponse.json({ error: "Device is offline" }, { status: 409 });
    }

    const zigbeeService = getZigbeeListenerService();

    try {
      // Send command using friendly name (Zigbee2MQTT prefers this)
      await zigbeeService.sendDeviceCommand(device.friendlyName, command);

      // Optimistic update in database
      if (Object.keys(command).length > 0) {
        const currentState = (device.currentState as any) || {};
        const newState = { ...currentState, ...command };

        await prisma.zigbeeDevice.update({
          where: { id: device.id },
          data: {
            currentState: newState,
            lastSeen: new Date(),
            updatedAt: new Date(),
          },
        });
      }

      // Log command for audit
      console.log(
        `📤 Command sent to ${device.friendlyName} (${device.deviceId}):`,
        command
      );

      return NextResponse.json({
        success: true,
        message: `Command sent to ${device.friendlyName}`,
        command,
        deviceId: device.deviceId,
      });
    } catch (commandError) {
      console.error(
        `❌ Failed to send command to ${device.friendlyName}:`,
        commandError
      );
      return NextResponse.json(
        {
          error: "Failed to send command to device",
          details:
            commandError instanceof Error
              ? commandError.message
              : "Unknown error",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in device command API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
