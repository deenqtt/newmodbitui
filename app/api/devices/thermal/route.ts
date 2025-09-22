// File: app/api/devices/thermal/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import {
  getAllActiveThermalDevices,
  getThermalListenerStatus,
} from "@/lib/services/thermal-listener";

const prisma = new PrismaClient();

export async function GET() {
  try {
    // Get all thermal devices from database
    const dbDevices = await prisma.deviceExternal.findMany({
      where: {
        OR: [
          { topic: { contains: "thermal" } },
          { name: { contains: "Thermal" } },
          { name: { contains: "thermal" } },
        ],
      },
      orderBy: [{ lastUpdatedByMqtt: "desc" }, { updatedAt: "desc" }],
      select: {
        id: true,
        name: true,
        topic: true,
        address: true,
        lastUpdatedByMqtt: true,
        lastPayload: true,
        createdAt: true,
      },
    });

    // Get currently active devices from listener cache
    const activeDevices = getAllActiveThermalDevices();
    const listenerStatus = getThermalListenerStatus();

    // Merge database devices with real-time status
    const devices = dbDevices.map((device) => {
      // Find corresponding active device
      const activeDevice = activeDevices.find(
        (active) =>
          active.topic === device.topic || active.deviceId === device.address
      );

      // Parse latest payload for additional info
      let latestData = null;
      try {
        latestData = device.lastPayload ? JSON.parse(device.lastPayload) : null;
      } catch (error) {
        console.warn(`Failed to parse payload for device ${device.id}`);
      }

      return {
        id: device.id,
        name: device.name,
        topic: device.topic,
        deviceId: device.address,
        isActive: !!activeDevice,
        lastSeen: activeDevice?.lastSeen || device.lastUpdatedByMqtt,
        interface:
          activeDevice?.interface || latestData?.interface || "unknown",
        location: activeDevice?.location || latestData?.location || null,
        createdAt: device.createdAt,
        status: activeDevice ? "online" : "offline",
        lastTemperature: latestData?.thermal_data?.statistics
          ? {
              min: latestData.thermal_data.statistics.min_temp,
              max: latestData.thermal_data.statistics.max_temp,
              avg: latestData.thermal_data.statistics.avg_temp,
            }
          : null,
      };
    });

    // Separate active and inactive devices
    const activeDevicesList = devices.filter((d) => d.isActive);
    const inactiveDevices = devices.filter((d) => !d.isActive);

    // Sort: active devices first (by last seen), then inactive (by last update)
    const sortedDevices = [
      ...activeDevicesList.sort(
        (a, b) =>
          new Date(b.lastSeen || 0).getTime() -
          new Date(a.lastSeen || 0).getTime()
      ),
      ...inactiveDevices.sort(
        (a, b) =>
          new Date(b.lastSeen || 0).getTime() -
          new Date(a.lastSeen || 0).getTime()
      ),
    ];

    return NextResponse.json({
      success: true,
      devices: sortedDevices,
      summary: {
        totalDevices: devices.length,
        activeDevices: activeDevicesList.length,
        inactiveDevices: inactiveDevices.length,
        listenerConnected: listenerStatus.connected,
        autoDiscovery: listenerStatus.autoDiscovery,
      },
      listener: listenerStatus,
    });
  } catch (error) {
    console.error("Error fetching thermal devices:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch thermal devices",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// POST endpoint for manual device registration
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, topic, deviceId } = body;

    // Validation
    if (!name || !topic) {
      return NextResponse.json(
        { success: false, error: "Name and topic are required" },
        { status: 400 }
      );
    }

    // Check if device with this topic already exists
    const existingDevice = await prisma.deviceExternal.findFirst({
      where: { topic: topic },
    });

    if (existingDevice) {
      return NextResponse.json(
        { success: false, error: "Device with this topic already exists" },
        { status: 409 }
      );
    }

    // Create new thermal device
    const device = await prisma.deviceExternal.create({
      data: {
        name,
        topic,
        address: deviceId || topic.split("/").pop() || "unknown",
      },
    });

    // Try to register with listener service
    try {
      const { registerThermalDevice } = await import(
        "@/lib/services/thermal-listener"
      );
      await registerThermalDevice(name, topic, deviceId);
    } catch (listenerError) {
      console.warn("Failed to register with listener service:", listenerError);
      // Device still created in database, just log the warning
    }

    return NextResponse.json({
      success: true,
      message: "Thermal device registered successfully",
      device: {
        id: device.id,
        name: device.name,
        topic: device.topic,
        deviceId: device.address,
        isActive: false,
        status: "offline",
      },
    });
  } catch (error) {
    console.error("Error registering thermal device:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to register thermal device",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// DELETE endpoint for removing thermal device
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get("id");

    if (!deviceId) {
      return NextResponse.json(
        { success: false, error: "Device ID is required" },
        { status: 400 }
      );
    }

    // Delete device and related thermal data
    const deletedDevice = await prisma.deviceExternal.delete({
      where: { id: deviceId },
    });

    return NextResponse.json({
      success: true,
      message: `Thermal device '${deletedDevice.name}' deleted successfully`,
      deletedDevice: {
        id: deletedDevice.id,
        name: deletedDevice.name,
        topic: deletedDevice.topic,
      },
    });
  } catch (error) {
    console.error("Error deleting thermal device:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete thermal device",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// PUT endpoint for updating thermal device
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, name, topic } = body;

    if (!id || !name || !topic) {
      return NextResponse.json(
        { success: false, error: "ID, name, and topic are required" },
        { status: 400 }
      );
    }

    // Update device
    const updatedDevice = await prisma.deviceExternal.update({
      where: { id },
      data: {
        name,
        topic,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Thermal device updated successfully",
      device: {
        id: updatedDevice.id,
        name: updatedDevice.name,
        topic: updatedDevice.topic,
        deviceId: updatedDevice.address,
      },
    });
  } catch (error) {
    console.error("Error updating thermal device:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update thermal device",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
