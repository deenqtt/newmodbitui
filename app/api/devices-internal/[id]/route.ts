import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const deviceInternalUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  deviceType: z.string().min(1).max(50).optional(),
  manufacturer: z.string().max(100).nullable().optional(),
  modelId: z.string().max(100).nullable().optional(),
  firmware: z.string().max(100).nullable().optional(),
  rackId: z.string().nullable().optional(),
  positionU: z.number().int().nullable().optional(),
  sizeU: z.number().int().min(1).max(42).optional(),
  powerWatt: z.number().int().nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
  ipAddress: z.string().max(45).nullable().optional(),
  status: z.string().optional(),
});

// GET /api/devices-internal/[id] - Get device by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const device = await prisma.deviceInternal.findUnique({
      where: { id },
      include: {
        rack: {
          select: {
            id: true,
            name: true,
            capacityU: true
          }
        }
      }
    });

    if (!device) {
      return NextResponse.json(
        { error: "Device not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(device);
  } catch (error) {
    console.error("Error fetching internal device:", error);
    return NextResponse.json(
      { error: "Failed to fetch internal device" },
      { status: 500 }
    );
  }
}

// PUT /api/devices-internal/[id] - Update device
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const validatedData = deviceInternalUpdateSchema.parse(body);

    // Check if device exists
    const existingDevice = await prisma.deviceInternal.findUnique({
      where: { id },
      include: {
        rack: { select: { id: true, capacityU: true } }
      }
    });

    if (!existingDevice) {
      return NextResponse.json(
        { error: "Device not found" },
        { status: 404 }
      );
    }

    // Validate rack position if being updated
    if ((validatedData.rackId !== undefined || validatedData.positionU !== undefined || validatedData.sizeU !== undefined)) {
      const rackId = validatedData.rackId !== undefined ? validatedData.rackId : existingDevice.rackId;
      const positionU = validatedData.positionU !== undefined ? validatedData.positionU : existingDevice.positionU;
      const sizeU = validatedData.sizeU !== undefined ? validatedData.sizeU : existingDevice.sizeU;

      if (rackId && positionU !== null) {
        await validateRackPosition(rackId, positionU, sizeU || 1, id);
      }
    }

    const updatedDevice = await prisma.deviceInternal.update({
      where: { id },
      data: validatedData,
      include: {
        rack: {
          select: {
            id: true,
            name: true,
            capacityU: true
          }
        }
      }
    });

    return NextResponse.json(updatedDevice);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }

    if (error instanceof Error && (error.message.includes('Position conflict') || error.message.includes('Position U must'))) {
      return NextResponse.json(
        { error: error.message },
        { status: 409 }
      );
    }

    console.error("Error updating internal device:", error);
    return NextResponse.json(
      { error: "Failed to update internal device" },
      { status: 500 }
    );
  }
}

// DELETE /api/devices-internal/[id] - Delete device
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Check if device exists
    const device = await prisma.deviceInternal.findUnique({
      where: { id }
    });

    if (!device) {
      return NextResponse.json(
        { error: "Device not found" },
        { status: 404 }
      );
    }

    await prisma.deviceInternal.delete({
      where: { id }
    });

    return NextResponse.json({ message: "Device deleted successfully" });
  } catch (error) {
    console.error("Error deleting internal device:", error);
    return NextResponse.json(
      { error: "Failed to delete internal device" },
      { status: 500 }
    );
  }
}

// Helper function to validate rack position
async function validateRackPosition(rackId: string, positionU: number, sizeU: number, excludeDeviceId?: string) {
  // Validate U position range
  if (positionU < 1) {
    throw new Error('Position U must be 1 or greater');
  }

  // Check if rack exists and position is within capacity
  const rack = await prisma.rack.findUnique({
    where: { id: rackId },
    select: {
      capacityU: true,
      devices: {
        where: {
          ...(excludeDeviceId && { id: { not: excludeDeviceId } })
        },
        select: {
          positionU: true,
          sizeU: true
        }
      }
    }
  });

  if (!rack) {
    throw new Error('Rack not found');
  }

  const maxPosition = rack.capacityU - sizeU + 1;
  if (positionU > maxPosition) {
    throw new Error(`Position U must be ${maxPosition} or lower for a ${sizeU}U device in a ${rack.capacityU}U rack`);
  }

  // Check for position conflicts
  const startPosition = positionU;
  const endPosition = positionU + sizeU - 1;

  for (const device of rack.devices) {
    if (!device.positionU) continue;

    const deviceStart = device.positionU;
    const deviceEnd = device.positionU + Math.max(1, device.sizeU || 1) - 1;

    // Check overlap
    if (startPosition <= deviceEnd && endPosition >= deviceStart) {
      throw new Error('Position conflict: This position overlaps with another device');
    }
  }

  return rack;
}
