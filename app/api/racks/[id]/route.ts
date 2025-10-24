import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const rackUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  capacityU: z.number().int().min(1).max(100).optional(),
  location: z.string().max(255).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
});

// GET /api/racks/[id] - Get rack by ID with full details and device relationships
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const rack = await prisma.rack.findUnique({
      where: { id },
      include: {
        devices: {
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
          orderBy: [
            { positionU: 'desc' }, // Sort by position (higher U first)
            { createdAt: 'desc' }
          ]
        }
      }
    });

    if (!rack) {
      return NextResponse.json(
        { error: "Rack not found" },
        { status: 404 }
      );
    }

    // Calculate capacity information - exclude sensor devices from capacity calculation
    const usedU = rack.devices.reduce((total, rackDevice) => {
      // Sensor devices don't occupy physical rack space, so they don't count towards capacity
      if (rackDevice.deviceType === "SENSOR") {
        return total; // Don't add sensor devices to used capacity
      }
      return total + rackDevice.sizeU;
    }, 0);

    const rackWithCapacity = {
      ...rack,
      usedU,
      availableU: rack.capacityU - usedU,
      utilizationPercent: Math.round((usedU / rack.capacityU) * 100),
    };

    return NextResponse.json(rackWithCapacity);
  } catch (error) {
    console.error("Error fetching rack:", error);
    return NextResponse.json(
      { error: "Failed to fetch rack" },
      { status: 500 }
    );
  }
}

// PUT /api/racks/[id] - Update rack
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const validatedData = rackUpdateSchema.parse(body);

    // Check if rack exists
    const existingRack = await prisma.rack.findUnique({
      where: { id }
    });

    if (!existingRack) {
      return NextResponse.json(
        { error: "Rack not found" },
        { status: 404 }
      );
    }

    // If name is being updated, check for conflicts
    if (validatedData.name && validatedData.name !== existingRack.name) {
      const nameConflict = await prisma.rack.findUnique({
        where: { name: validatedData.name }
      });

      if (nameConflict) {
        return NextResponse.json(
          { error: "Rack name already exists" },
          { status: 400 }
        );
      }
    }

    const updatedRack = await prisma.rack.update({
      where: { id },
      data: validatedData,
      include: {
        devices: {
          select: {
            id: true,
            positionU: true,
            sizeU: true,
            status: true
          }
        },
        _count: {
          select: { devices: true }
        }
      }
    });

    return NextResponse.json(updatedRack);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Error updating rack:", error);
    return NextResponse.json(
      { error: "Failed to update rack" },
      { status: 500 }
    );
  }
}

// DELETE /api/racks/[id] - Delete rack
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Check if rack has devices before deleting
    const rackWithDevices = await prisma.rack.findUnique({
      where: { id },
      include: { devices: { select: { id: true } } }
    });

    if (!rackWithDevices) {
      return NextResponse.json(
        { error: "Rack not found" },
        { status: 404 }
      );
    }

    if (rackWithDevices.devices.length > 0) {
      return NextResponse.json(
        {
          error: "Cannot delete rack with devices",
          message: `This rack contains ${rackWithDevices.devices.length} device(s). Please move devices to another rack first.`
        },
        { status: 400 }
      );
    }

    await prisma.rack.delete({
      where: { id }
    });

    return NextResponse.json({ message: "Rack deleted successfully" });
  } catch (error) {
    console.error("Error deleting rack:", error);
    return NextResponse.json(
      { error: "Failed to delete rack" },
      { status: 500 }
    );
  }
}
