// File: app/api/zigbee/coordinator/route.ts (UNIFIED - Replace both bridge and coordinator)
import { NextRequest, NextResponse } from "next/server";
import { getZigbeeListenerService } from "@/lib/services/zigbee-listener";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...params } = body;

    console.log(`🎯 [COORDINATOR] Action: ${action}`);

    const zigbeeService = getZigbeeListenerService();

    switch (action) {
      // ====== PAIRING ACTIONS ======
      case "enable_pairing":
      case "permit_join":
        const duration = params.duration || 254;
        console.log(`🔗 [PAIRING] Enabling pairing for ${duration}s`);

        try {
          await Promise.race([
            zigbeeService.enablePairing(duration),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error("Pairing timeout")), 10000)
            ),
          ]);

          return NextResponse.json({
            success: true,
            message: `Pairing enabled for ${Math.floor(duration / 60)} minutes`,
            duration: duration,
          });
        } catch (error) {
          console.error("Pairing failed:", error);
          return NextResponse.json(
            {
              success: false,
              error: "Failed to enable pairing mode",
              details: error instanceof Error ? error.message : "Unknown error",
              recommendation: "Try restarting the bridge first",
            },
            { status: 500 }
          );
        }

      case "disable_pairing":
        console.log(`🔗 [PAIRING] Disabling pairing`);

        try {
          // Use the new disablePairing method with proper error handling
          await Promise.race([
            zigbeeService.disablePairing(),
            new Promise((_, reject) =>
              setTimeout(
                () => reject(new Error("Disable pairing timeout")),
                5000
              )
            ),
          ]);

          return NextResponse.json({
            success: true,
            message: "Pairing disabled successfully",
          });
        } catch (error) {
          console.error("Failed to disable pairing:", error);
          return NextResponse.json(
            {
              success: false,
              error: "Failed to disable pairing",
              details: error instanceof Error ? error.message : "Unknown error",
              recommendation: "Try restarting bridge if pairing won't stop",
            },
            { status: 500 }
          );
        }

      // ====== BRIDGE MANAGEMENT ======
      case "restart":
        console.log(`🔄 [RESTART] Restarting bridge`);

        try {
          await Promise.race([
            zigbeeService.sendDeviceCommand("bridge/request/restart", {}),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error("Restart timeout")), 8000)
            ),
          ]);

          return NextResponse.json({
            success: true,
            message: "Bridge restart requested successfully",
            recommendation: "Bridge will restart in a few seconds",
          });
        } catch (error) {
          return NextResponse.json(
            {
              success: false,
              error: "Failed to restart bridge",
              details: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
          );
        }

      case "health_check":
        console.log(`📊 [HEALTH] Checking bridge health`);

        try {
          await zigbeeService.sendDeviceCommand(
            "bridge/request/bridge/info",
            {}
          );

          return NextResponse.json({
            success: true,
            message: "Health check completed",
            recommendation: "Check logs for detailed results",
          });
        } catch (error) {
          return NextResponse.json(
            {
              success: false,
              error: "Health check failed",
              details: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
          );
        }

      // ====== DEVICE MANAGEMENT ======
      case "refresh_devices":
        console.log(`🔄 [REFRESH] Requesting device list`);

        try {
          await zigbeeService.sendDeviceCommand("bridge/request/devices", {});

          return NextResponse.json({
            success: true,
            message: "Device refresh requested",
            recommendation: "Devices will update automatically",
          });
        } catch (error) {
          return NextResponse.json(
            {
              success: false,
              error: "Failed to refresh devices",
            },
            { status: 500 }
          );
        }

      case "clear_database":
        console.log(`🗑️ [CLEAR] Clearing device database`);

        const deletedCount = await prisma.zigbeeDevice.deleteMany({});

        return NextResponse.json({
          success: true,
          message: `Cleared ${deletedCount.count} devices from interface`,
          warning: true,
          recommendation: "Devices will reappear when they send data",
        });

      case "force_remove_all":
        console.log(`🗑️ [FORCE_ALL] Force removing all devices`);

        const devices = await prisma.zigbeeDevice.findMany();
        let successCount = 0;
        let failCount = 0;

        // Remove devices in batches to avoid timeout
        for (const device of devices) {
          try {
            await Promise.race([
              zigbeeService.sendDeviceCommand("bridge/request/device/remove", {
                id: device.deviceId,
                force: true,
              }),
              new Promise((_, reject) =>
                setTimeout(
                  () => reject(new Error("Device removal timeout")),
                  3000
                )
              ),
            ]);
            successCount++;
          } catch (error) {
            console.log(`Failed to remove ${device.friendlyName}:`, error);
            failCount++;
          }

          // Small delay between removals
          await new Promise((resolve) => setTimeout(resolve, 500));
        }

        // Clear database regardless
        await prisma.zigbeeDevice.deleteMany({});

        return NextResponse.json({
          success: true,
          message: `Removed ${successCount} devices, ${failCount} failed`,
          recommendation:
            failCount > 0
              ? "Some devices may still be in network"
              : "All devices removed",
        });

      case "reset_network":
        console.log(`⚠️ [RESET] DESTRUCTIVE: Resetting entire network`);

        try {
          // Step 1: Remove all devices
          const allDevices = await prisma.zigbeeDevice.findMany();

          for (const device of allDevices) {
            try {
              await zigbeeService.sendDeviceCommand(
                "bridge/request/device/remove",
                {
                  id: device.deviceId,
                  force: true,
                }
              );
              await new Promise((resolve) => setTimeout(resolve, 500));
            } catch (error) {
              console.log(`Failed to remove ${device.friendlyName}`);
            }
          }

          // Step 2: Clear database
          await prisma.zigbeeDevice.deleteMany({});

          // Step 3: Reset coordinator (if supported)
          try {
            await zigbeeService.sendDeviceCommand("bridge/request/reset", {});
          } catch (error) {
            console.log("Network reset command not supported");
          }

          return NextResponse.json({
            success: true,
            message: "Network reset completed",
            warning: "All devices have been unpaired",
            recommendation:
              "You may need to restart bridge and re-pair all devices",
          });
        } catch (error) {
          // Fallback: just clear database
          await prisma.zigbeeDevice.deleteMany({});

          return NextResponse.json({
            success: true,
            message: "Partial reset completed (database cleared)",
            warning: "Could not remove all devices from network",
            recommendation: "Manual intervention may be required",
          });
        }

      // ====== CONFIGURATION ======
      case "backup":
        console.log(`💾 [BACKUP] Creating configuration backup`);

        try {
          await zigbeeService.sendDeviceCommand("bridge/request/backup", {});

          return NextResponse.json({
            success: true,
            message: "Configuration backup requested",
            recommendation: "Check Zigbee2MQTT data directory for backup files",
          });
        } catch (error) {
          return NextResponse.json(
            {
              success: false,
              error: "Backup failed",
            },
            { status: 500 }
          );
        }

      case "set_log_level":
        const level = params.level || "info";
        console.log(`📋 [LOG] Setting log level to ${level}`);

        try {
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
        } catch (error) {
          return NextResponse.json(
            {
              success: false,
              error: "Failed to set log level",
            },
            { status: 500 }
          );
        }

      default:
        return NextResponse.json(
          { error: `Invalid coordinator action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Error in coordinator API:", error);

    let errorMessage = "Failed to execute coordinator command";
    let recommendation = "Check Zigbee2MQTT logs for more details";

    if (error instanceof Error) {
      if (error.message.includes("timeout")) {
        errorMessage = "Coordinator command timed out";
        recommendation = "Check if Zigbee2MQTT is running and responsive";
      } else if (error.message.includes("not connected")) {
        errorMessage = "Not connected to Zigbee2MQTT broker";
        recommendation = "Check MQTT broker connection";
      }
    }

    return NextResponse.json(
      {
        error: errorMessage,
        details: error instanceof Error ? error.message : "Unknown error",
        recommendation: recommendation,
      },
      { status: 500 }
    );
  }
}

// GET - Get coordinator status
export async function GET(request: NextRequest) {
  try {
    console.log(`📊 [STATUS] Getting coordinator status`);

    const totalDevices = await prisma.zigbeeDevice.count();
    const onlineDevices = await prisma.zigbeeDevice.count({
      where: { isOnline: true },
    });

    const deviceTypes = await prisma.zigbeeDevice.groupBy({
      by: ["deviceType"],
      _count: { deviceType: true },
    });

    const recentActivity = await prisma.zigbeeDevice.count({
      where: {
        lastSeen: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
    });

    return NextResponse.json({
      success: true,
      coordinator: {
        status: "connected",
        mqtt_broker: "52.74.91.79:1883",
        last_check: new Date().toISOString(),
      },
      network: {
        totalDevices,
        onlineDevices,
        offlineDevices: totalDevices - onlineDevices,
        recentActivity,
        deviceTypes: deviceTypes.map((dt) => ({
          type: dt.deviceType,
          count: dt._count.deviceType,
        })),
      },
    });
  } catch (error) {
    console.error("Error getting coordinator status:", error);
    return NextResponse.json(
      {
        error: "Failed to get coordinator status",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
