// File: app/api/zigbee/devices/route.ts (Optimized)
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getZigbeeListenerService } from "@/lib/services/zigbee-listener";

export async function GET(request: NextRequest) {
  try {
    // Get devices with better ordering and select only needed fields for list view
    const devices = await prisma.zigbeeDevice.findMany({
      orderBy: [
        { isOnline: "desc" }, // Online devices first
        { lastSeen: "desc" }, // Recently seen first
        { friendlyName: "asc" },
      ],
      select: {
        id: true,
        deviceId: true,
        friendlyName: true,
        deviceType: true,
        manufacturer: true,
        modelId: true,
        capabilities: true,
        lastSeen: true,
        isOnline: true,
        currentState: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Transform data for frontend with error handling
    const transformedDevices = devices.map((device) => {
      try {
        return {
          ...device,
          capabilities:
            typeof device.capabilities === "string"
              ? JSON.parse(device.capabilities)
              : device.capabilities || {},
          currentState:
            typeof device.currentState === "string"
              ? JSON.parse(device.currentState)
              : device.currentState || {},
        };
      } catch (parseError) {
        console.error(
          `Error parsing device ${device.deviceId} data:`,
          parseError
        );
        return {
          ...device,
          capabilities: {},
          currentState: {},
        };
      }
    });

    // Add cache headers for better performance
    const response = NextResponse.json(transformedDevices);
    response.headers.set("Cache-Control", "private, max-age=15"); // Cache for 15 seconds
    return response;
  } catch (error) {
    console.error("Error fetching Zigbee devices:", error);
    return NextResponse.json(
      { error: "Failed to fetch Zigbee devices" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...actionData } = body;

    const zigbeeService = getZigbeeListenerService();

    switch (action) {
      case "refresh":
        // Force refresh from Zigbee2MQTT
        try {
          // Request fresh device list from bridge
          await zigbeeService.sendDeviceCommand("bridge/request/devices", {});

          // Get current devices from database
          const devices = await prisma.zigbeeDevice.findMany({
            orderBy: [{ isOnline: "desc" }, { friendlyName: "asc" }],
          });

          return NextResponse.json({
            success: true,
            message: `Refreshed ${devices.length} devices`,
            devices,
          });
        } catch (error) {
          return NextResponse.json(
            { error: "Failed to refresh devices" },
            { status: 500 }
          );
        }

      case "pair":
        // Enable pairing mode
        try {
          const duration = actionData.duration || 254; // Default ~4 minutes
          await zigbeeService.enablePairing(duration);

          return NextResponse.json({
            success: true,
            message: `Pairing mode enabled for ${Math.floor(
              duration / 60
            )} minutes`,
            duration,
          });
        } catch (error) {
          return NextResponse.json(
            { error: "Failed to enable pairing mode" },
            { status: 500 }
          );
        }

      case "health_check":
        // Check system health
        try {
          const deviceCount = await prisma.zigbeeDevice.count();
          const onlineCount = await prisma.zigbeeDevice.count({
            where: { isOnline: true },
          });

          // Check recent activity (last 10 minutes)
          const recentActivity = await prisma.zigbeeDevice.count({
            where: {
              lastSeen: {
                gte: new Date(Date.now() - 10 * 60 * 1000),
              },
            },
          });

          return NextResponse.json({
            success: true,
            health: {
              totalDevices: deviceCount,
              onlineDevices: onlineCount,
              recentActivity,
              healthPercentage:
                deviceCount > 0
                  ? Math.round((onlineCount / deviceCount) * 100)
                  : 100,
            },
          });
        } catch (error) {
          return NextResponse.json(
            { error: "Health check failed" },
            { status: 500 }
          );
        }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Error in Zigbee devices POST:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
