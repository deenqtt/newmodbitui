import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateRackDeviceSchema = z.object({
  deviceId: z.string().min(1).optional(),
  positionU: z.number().int().min(1).max(100).optional(),
  sizeU: z.number().int().min(1).max(100).optional(),
  deviceType: z.enum(["SERVER", "SWITCH", "STORAGE", "PDU", "SENSOR"]).optional(),
  status: z.enum(["PLANNED", "INSTALLED", "MAINTENANCE", "REMOVED"]).optional(),
});

// PUT /api/racks/[id]/devices/[deviceId] - Update device in rack
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; deviceId: string } }
) {
  try {
    const { id, deviceId } = params;
    const body = await request.json();
    const validatedData = updateRackDeviceSchema.parse(body);

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

    // Check if rack device exists
    const existingRackDevice = await prisma.rackDevice.findUnique({
      where: {
        rackId_deviceId: {
          rackId: id,
          deviceId: deviceId
        }
      }
    });

    if (!existingRackDevice) {
      return NextResponse.json(
        { error: "Device not found in this rack" },
        { status: 404 }
      );
    }

    // If position is being updated, check for conflicts (bottom-up positioning)
    // Skip position conflict check for sensor devices as they don't occupy significant physical space
    if (validatedData.positionU && validatedData.positionU !== existingRackDevice.positionU && existingRackDevice.deviceType !== "SENSOR") {
      const positionU = validatedData.positionU;
      const sizeU = validatedData.sizeU || existingRackDevice.sizeU;
      const newDeviceStart = positionU;
      const newDeviceEnd = positionU + sizeU - 1;

      // Get all existing devices in this rack (excluding current device and sensors)
      const existingDevices = await prisma.rackDevice.findMany({
        where: {
          rackId: id,
          deviceId: { not: deviceId }, // Exclude current device
          deviceType: { not: "SENSOR" } // Exclude sensors from conflict check
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
            message: `Position ${positionU} to ${newDeviceEnd}U is already occupied`
          },
          { status: 400 }
        );
      }
    }

    // If deviceId is being updated, we need to handle device change
    if (validatedData.deviceId && validatedData.deviceId !== deviceId) {
      // Check if new device exists
      const newDevice = await prisma.deviceExternal.findUnique({
        where: { uniqId: validatedData.deviceId }
      });

      if (!newDevice) {
        return NextResponse.json(
          { error: "New device not found" },
          { status: 404 }
        );
      }

      // Check if new device is already assigned to this rack
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

      // Check position conflicts for new device (skip for sensors)
      const sizeU = validatedData.sizeU || existingRackDevice.sizeU;
      const positionU = validatedData.positionU || existingRackDevice.positionU;

      if (validatedData.deviceType !== "SENSOR" && existingRackDevice.deviceType !== "SENSOR") {
        const newDeviceStart = positionU;
        const newDeviceEnd = positionU + sizeU - 1;

        // Get all existing devices in this rack (excluding current device and sensors)
        const existingDevices = await prisma.rackDevice.findMany({
          where: {
            rackId: id,
            deviceId: { not: deviceId }, // Exclude current device
            deviceType: { not: "SENSOR" } // Exclude sensors from conflict check
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
              message: `Position ${positionU} to ${newDeviceEnd}U is already occupied`
            },
            { status: 400 }
          );
        }
      }

      // Check capacity for new device (skip for sensors as they don't consume significant capacity)
      if (validatedData.deviceType !== "SENSOR") {
        const currentUsedU = await prisma.rackDevice.aggregate({
          where: {
            rackId: id,
            deviceType: { not: "SENSOR" } // Only count non-sensor devices for capacity
          },
          _sum: { sizeU: true }
        });

        const newTotalUsedU = (currentUsedU._sum.sizeU || 0) - (existingRackDevice.deviceType !== "SENSOR" ? existingRackDevice.sizeU : 0) + sizeU;

        if (newTotalUsedU > rack.capacityU) {
          return NextResponse.json(
            {
              error: "Capacity exceeded",
              message: `Changing device would exceed rack capacity (${newTotalUsedU}/${rack.capacityU}U)`
            },
            { status: 400 }
          );
        }
      }
    }

    // If size is being updated, check capacity (skip for sensors)
    if (validatedData.sizeU && validatedData.sizeU !== existingRackDevice.sizeU && existingRackDevice.deviceType !== "SENSOR") {
      const currentUsedU = await prisma.rackDevice.aggregate({
        where: {
          rackId: id,
          deviceType: { not: "SENSOR" } // Only count non-sensor devices for capacity
        },
        _sum: { sizeU: true }
      });

      const newTotalUsedU = (currentUsedU._sum.sizeU || 0) - existingRackDevice.sizeU + validatedData.sizeU;

      if (newTotalUsedU > rack.capacityU) {
        return NextResponse.json(
          {
            error: "Capacity exceeded",
            message: `Updating device size would exceed rack capacity (${newTotalUsedU}/${rack.capacityU}U)`
          },
          { status: 400 }
        );
      }
    }

    const updatedRackDevice = await prisma.rackDevice.update({
      where: {
        rackId_deviceId: {
          rackId: id,
          deviceId: deviceId
        }
      },
      data: validatedData,
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

    return NextResponse.json(updatedRackDevice);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Error updating rack device:", error);
    return NextResponse.json(
      { error: "Failed to update device in rack" },
      { status: 500 }
    );
  }
}

// DELETE /api/racks/[id]/devices/[deviceId] - Remove device from rack
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; deviceId: string } }
) {
  try {
    const { id, deviceId } = params;

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

    // Check if rack device exists
    const existingRackDevice = await prisma.rackDevice.findUnique({
      where: {
        rackId_deviceId: {
          rackId: id,
          deviceId: deviceId
        }
      }
    });

    if (!existingRackDevice) {
      return NextResponse.json(
        { error: "Device not found in this rack" },
        { status: 404 }
      );
    }

    await prisma.rackDevice.delete({
      where: {
        rackId_deviceId: {
          rackId: id,
          deviceId: deviceId
        }
      }
    });

    return NextResponse.json({ message: "Device removed from rack successfully" });
  } catch (error) {
    console.error("Error removing device from rack:", error);
    return NextResponse.json(
      { error: "Failed to remove device from rack" },
      { status: 500 }
    );
  }
}
