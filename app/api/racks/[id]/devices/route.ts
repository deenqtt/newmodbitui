import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const rackDeviceSchema = z.object({
  deviceId: z.string().min(1),
  positionU: z.number().int().min(1).max(100),
  sizeU: z.number().int().min(1).max(100).default(1),
  deviceType: z.enum(["SERVER", "SWITCH", "STORAGE", "PDU", "SENSOR"]).default("SERVER"),
  status: z.enum(["PLANNED", "INSTALLED", "MAINTENANCE", "REMOVED"]).default("PLANNED"),
});

// GET /api/racks/[id]/devices - Get all devices in a rack
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Check if rack exists
    const rack = await prisma.rack.findUnique({
      where: { id }
    });

    if (!rack) {
      return NextResponse.json(
        { error: "Rack not found" },
        { status: 404 }
      );
    }

    const rackDevices = await prisma.rackDevice.findMany({
      where: { rackId: id },
      include: {
        device: {
          select: {
            id: true,
            uniqId: true,
            name: true,
            topic: true,
            address: true,
            lastPayload: true,
            lastUpdatedByMqtt: true
          }
        }
      },
      orderBy: { positionU: 'desc' }
    });

    return NextResponse.json(rackDevices);
  } catch (error) {
    console.error("Error fetching rack devices:", error);
    return NextResponse.json(
      { error: "Failed to fetch rack devices" },
      { status: 500 }
    );
  }
}

// POST /api/racks/[id]/devices - Add device to rack
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const validatedData = rackDeviceSchema.parse(body);

    // Check if rack exists
    const rack = await prisma.rack.findUnique({
      where: { id }
    });

    if (!rack) {
      return NextResponse.json(
        { error: "Rack not found" },
        { status: 404 }
      );
    }

    // Check if device exists
    const device = await prisma.deviceExternal.findUnique({
      where: { uniqId: validatedData.deviceId }
    });

    if (!device) {
      return NextResponse.json(
        { error: "Device not found" },
        { status: 404 }
      );
    }

    // Check if device is already in this rack
    const existingAssignment = await prisma.rackDevice.findUnique({
      where: {
        rackId_deviceId: {
          rackId: id,
          deviceId: validatedData.deviceId
        }
      }
    });

    if (existingAssignment) {
      return NextResponse.json(
        { error: "Device is already assigned to this rack" },
        { status: 400 }
      );
    }

    // Check if position is available (considering device size with bottom-up positioning)
    // Skip position conflict check for sensor devices as they don't occupy significant physical space
    if (validatedData.deviceType !== "SENSOR") {
      // Device occupies from positionU to positionU + sizeU - 1
      // We need to check if any existing device overlaps with this range
      const newDeviceStart = validatedData.positionU;
      const newDeviceEnd = validatedData.positionU + validatedData.sizeU - 1;

      // Get all existing devices in this rack (excluding sensors for conflict check)
      const existingDevices = await prisma.rackDevice.findMany({
        where: {
          rackId: id,
          deviceType: { not: "SENSOR" } // Only check conflicts with non-sensor devices
        },
        select: { positionU: true, sizeU: true }
      });

      // Check for position conflicts by calculating actual ranges
      const hasConflict = existingDevices.some(device => {
        const existingStart = device.positionU;
        const existingEnd = device.positionU + device.sizeU - 1;

        // Check if the new device range overlaps with existing device range
        return newDeviceStart <= existingEnd && newDeviceEnd >= existingStart;
      });

      if (hasConflict) {
        return NextResponse.json(
          {
            error: "Position conflict",
            message: `Position ${validatedData.positionU} to ${validatedData.positionU + validatedData.sizeU - 1}U is already occupied`
          },
          { status: 400 }
        );
      }
    }

    // Check rack capacity (skip for sensor devices as they don't consume significant rack space)
    if (validatedData.deviceType !== "SENSOR") {
      const currentUsedU = await prisma.rackDevice.aggregate({
        where: {
          rackId: id,
          deviceType: { not: "SENSOR" } // Only count non-sensor devices for capacity
        },
        _sum: { sizeU: true }
      });

      const totalUsedU = (currentUsedU._sum.sizeU || 0) + validatedData.sizeU;

      if (totalUsedU > rack.capacityU) {
        return NextResponse.json(
          {
            error: "Capacity exceeded",
            message: `Adding this device would exceed rack capacity (${totalUsedU}/${rack.capacityU}U)`
          },
          { status: 400 }
        );
      }
    }

    const rackDevice = await prisma.rackDevice.create({
      data: {
        rackId: id,
        deviceId: validatedData.deviceId,
        positionU: validatedData.positionU,
        sizeU: validatedData.sizeU,
        deviceType: validatedData.deviceType,
        status: validatedData.status,
      },
      include: {
        device: {
          select: {
            id: true,
            uniqId: true,
            name: true,
            topic: true,
            address: true,
            lastPayload: true,
            lastUpdatedByMqtt: true
          }
        }
      }
    });

    return NextResponse.json(rackDevice, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Error adding device to rack:", error);
    return NextResponse.json(
      { error: "Failed to add device to rack" },
      { status: 500 }
    );
  }
}
