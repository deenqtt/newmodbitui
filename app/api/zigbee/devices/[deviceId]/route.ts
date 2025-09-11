// File: app/api/zigbee/devices/[deviceId]/route.ts (FIXED)
import { NextRequest, NextResponse } from "next/server";
import { getZigbeeListenerService } from "@/lib/services/zigbee-listener";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: {
    deviceId: string;
  };
}

// DELETE - Fixed dengan timeout handling yang lebih baik
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { deviceId } = params;
    const { searchParams } = new URL(request.url);
    const method = searchParams.get("method") || "smart";

    console.log(`🗑️ [DELETE] Device: ${deviceId}, Method: ${method}`);

    // Find device by deviceId OR friendlyName
    const device = await prisma.zigbeeDevice.findFirst({
      where: {
        OR: [{ deviceId }, { friendlyName: deviceId }],
      },
    });

    if (!device) {
      return NextResponse.json(
        {
          error: "Device not found",
          recommendation: "Device may have been already removed",
        },
        { status: 404 }
      );
    }

    const zigbeeService = getZigbeeListenerService();

    // METHOD 1: Database-only removal (instant response)
    if (method === "database-only") {
      await prisma.zigbeeDevice.delete({
        where: { id: device.id },
      });

      return NextResponse.json({
        success: true,
        message: `Device "${device.friendlyName}" removed from interface`,
        warning: true,
        recommendation: "Device may still be in Zigbee network",
      });
    }

    // METHOD 2 & 3: Smart/Force removal dengan timeout protection
    if (method === "smart" || method === "force") {
      console.log(`🎯 [${method.toUpperCase()}] Starting removal process`);

      // STEP 1: Immediately remove from database untuk UI responsiveness
      await prisma.zigbeeDevice.delete({
        where: { id: device.id },
      });
      console.log(`🗑️ [DB] Device removed from database first`);

      // STEP 2: Send Zigbee removal command dengan timeout protection
      const removeFromZigbee = async () => {
        try {
          const forceMode = method === "force";

          // Try dengan friendly name first
          await Promise.race([
            zigbeeService.sendDeviceCommand("bridge/request/device/remove", {
              id: device.friendlyName,
              force: forceMode,
            }),
            new Promise((_, reject) =>
              setTimeout(
                () => reject(new Error("Zigbee command timeout")),
                5000
              )
            ),
          ]);

          console.log(`✅ [ZIGBEE] Device removed from network successfully`);
          return { success: true, method: "zigbee_success" };
        } catch (error) {
          console.log(`⚠️ [ZIGBEE] Removal failed: ${error}`);

          // Try backup method with IEEE address
          try {
            await Promise.race([
              zigbeeService.sendDeviceCommand("bridge/request/device/remove", {
                id: device.deviceId,
                force: true,
              }),
              new Promise((_, reject) =>
                setTimeout(
                  () => reject(new Error("Backup method timeout")),
                  5000
                )
              ),
            ]);
            console.log(`✅ [ZIGBEE] Backup removal succeeded`);
            return { success: true, method: "backup_success" };
          } catch (backupError) {
            console.log(`❌ [ZIGBEE] All removal attempts failed`);
            return { success: false, error: backupError };
          }
        }
      };

      // Execute Zigbee removal in background (non-blocking)
      removeFromZigbee()
        .then((result) => {
          if (result.success) {
            console.log(
              `🎉 [BACKGROUND] Zigbee removal completed: ${result.method}`
            );
          } else {
            console.log(
              `⚠️ [BACKGROUND] Zigbee removal failed but UI already updated`
            );
          }
        })
        .catch((error) => {
          console.log(
            `❌ [BACKGROUND] Unexpected error in background removal:`,
            error
          );
        });

      // STEP 3: Return immediate success response
      return NextResponse.json({
        success: true,
        message: `Device "${device.friendlyName}" removed successfully`,
        note: "Device removed from interface immediately, network removal in progress",
        method: method,
      });
    }

    return NextResponse.json(
      { error: "Invalid removal method" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error in device DELETE:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// PUT - Enhanced rename dengan timeout protection
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { deviceId } = params;
    const body = await request.json();
    const { action, ...updateData } = body;

    console.log(`✏️ [PUT] Device: ${deviceId}, Action: ${action}`);

    const device = await prisma.zigbeeDevice.findFirst({
      where: {
        OR: [{ deviceId }, { friendlyName: deviceId }],
      },
    });

    if (!device) {
      return NextResponse.json({ error: "Device not found" }, { status: 404 });
    }

    const zigbeeService = getZigbeeListenerService();

    if (action === "rename" && updateData.friendlyName) {
      const newName = updateData.friendlyName.trim();

      if (!newName) {
        return NextResponse.json(
          { error: "Friendly name cannot be empty" },
          { status: 400 }
        );
      }

      // Check if name already exists
      const existing = await prisma.zigbeeDevice.findFirst({
        where: {
          friendlyName: newName,
          deviceId: { not: device.deviceId },
        },
      });

      if (existing) {
        return NextResponse.json(
          { error: "Device name already exists" },
          { status: 409 }
        );
      }

      try {
        console.log(`📤 [RENAME] ${device.friendlyName} -> ${newName}`);

        // Send rename command dengan timeout protection
        await Promise.race([
          zigbeeService.sendDeviceCommand("bridge/request/device/rename", {
            from: device.friendlyName,
            to: newName,
          }),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Rename command timeout")), 8000)
          ),
        ]);

        // Update database optimistically
        const updatedDevice = await prisma.zigbeeDevice.update({
          where: { id: device.id },
          data: {
            friendlyName: newName,
            updatedAt: new Date(),
          },
        });

        console.log(`✅ [RENAME] Successfully renamed to ${newName}`);

        return NextResponse.json({
          success: true,
          message: `Device renamed to "${newName}"`,
          device: updatedDevice,
        });
      } catch (error) {
        console.error("Error renaming device:", error);

        // Check if error is just timeout but rename might have worked
        if (error instanceof Error && error.message.includes("timeout")) {
          return NextResponse.json({
            success: true,
            message: `Rename command sent (may take a moment to reflect)`,
            warning: "Command timeout but rename may have succeeded",
            recommendation: "Refresh the page in a few seconds to check",
          });
        }

        return NextResponse.json(
          {
            error: "Failed to rename device",
            details: error instanceof Error ? error.message : "Unknown error",
          },
          { status: 500 }
        );
      }
    }

    // Handle local updates only
    if (action === "update") {
      const allowedFields = ["deviceType", "manufacturer", "modelId"];
      const updateFields: any = {};

      allowedFields.forEach((field) => {
        if (updateData[field] !== undefined) {
          updateFields[field] = updateData[field];
        }
      });

      if (Object.keys(updateFields).length === 0) {
        return NextResponse.json(
          { error: "No valid fields to update" },
          { status: 400 }
        );
      }

      updateFields.updatedAt = new Date();

      const updatedDevice = await prisma.zigbeeDevice.update({
        where: { id: device.id },
        data: updateFields,
      });

      return NextResponse.json({
        success: true,
        message: "Device updated successfully",
        device: updatedDevice,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error updating device:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// GET - Get specific device (unchanged)
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { deviceId } = params;

    const device = await prisma.zigbeeDevice.findFirst({
      where: {
        OR: [{ deviceId }, { friendlyName: deviceId }],
      },
    });

    if (!device) {
      return NextResponse.json({ error: "Device not found" }, { status: 404 });
    }

    const transformedDevice = {
      ...device,
      capabilities:
        typeof device.capabilities === "string"
          ? JSON.parse(device.capabilities)
          : device.capabilities,
      currentState:
        typeof device.currentState === "string"
          ? JSON.parse(device.currentState)
          : device.currentState,
    };

    const response = NextResponse.json(transformedDevice);
    response.headers.set("Cache-Control", "private, max-age=30");
    return response;
  } catch (error) {
    console.error("Error fetching device:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
