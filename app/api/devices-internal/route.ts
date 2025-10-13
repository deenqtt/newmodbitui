import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const deviceInternalSchema = z.object({
  name: z.string().min(1).max(100),
  deviceType: z.string().min(1).max(50), // Server, Sensor, Switch, Router, NAS, Storage, etc
  manufacturer: z.string().max(100).optional(),
  modelId: z.string().max(100).optional(),
  firmware: z.string().max(100).optional(),
  rackId: z.string().nullable().optional(),
  positionU: z.number().int().nullable().optional(),
  sizeU: z.number().int().min(1).max(42).default(1),
  powerWatt: z.number().int().nullable().optional(),
  notes: z.string().max(1000).optional(),
  ipAddress: z.string().max(45).optional(), // IPv4/IPv6 support
});

// GET /api/devices-internal - Get all internal devices with rack info
export async function GET() {
  try {
    const devices = await prisma.deviceInternal.findMany({
      include: {
        rack: {
          select: {
            id: true,
            name: true,
            capacityU: true
          }
        }
      },
      orderBy: [
        { rackId: 'asc' },
        { positionU: 'desc' },
        { name: 'asc' }
      ]
    });

    return NextResponse.json(devices);
  } catch (error) {
    console.error("Error fetching internal devices:", error);
    return NextResponse.json(
      { error: "Failed to fetch internal devices" },
      { status: 500 }
    );
  }
}

// POST /api/devices-internal - Create new internal device
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = deviceInternalSchema.parse(body);

    // Validate rack position if specified
    if (validatedData.rackId && validatedData.positionU) {
      await validateRackPosition(validatedData.rackId, validatedData.positionU, validatedData.sizeU, undefined);
    }

    const device = await prisma.deviceInternal.create({
      data: {
        ...validatedData,
        status: 'offline' // Default status
      },
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

    return NextResponse.json(device, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message.includes('Position conflict')) {
      return NextResponse.json(
        { error: error.message },
        { status: 409 }
      );
    }

    console.error("Error creating internal device:", error);
    return NextResponse.json(
      { error: "Failed to create internal device" },
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
