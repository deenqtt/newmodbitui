import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const rackSchema = z.object({
  name: z.string().min(1).max(100),
  capacityU: z.number().int().min(1).max(100).default(42),
  location: z.string().max(255).optional(),
  notes: z.string().max(1000).optional(),
});

// GET /api/racks - Get all racks with device count
export async function GET() {
  try {
    const racks = await prisma.rack.findMany({
      include: {
        devices: {
          select: {
            id: true,
            positionU: true,
            sizeU: true
          }
        },
        _count: {
          select: { devices: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Calculate used capacity for each rack
    const racksWithCapacityInfo = racks.map((rack: any) => {
      const usedU = rack.devices.reduce((total: number, device: any) => {
        return total + (device.sizeU || 1);
      }, 0);

      return {
        ...rack,
        usedU,
        availableU: rack.capacityU - usedU,
        utilizationPercent: Math.round((usedU / rack.capacityU) * 100),
        devices: rack.devices, // Keep device details
      };
    });

    return NextResponse.json(racksWithCapacityInfo);
  } catch (error) {
    console.error("Error fetching racks:", error);
    return NextResponse.json(
      { error: "Failed to fetch racks" },
      { status: 500 }
    );
  }
}

// POST /api/racks - Create new rack
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = rackSchema.parse(body);

    // Check if rack name already exists
    const existingRack = await prisma.rack.findUnique({
      where: { name: validatedData.name }
    });

    if (existingRack) {
      return NextResponse.json(
        { error: "Rack name already exists" },
        { status: 400 }
      );
    }

    const rack = await prisma.rack.create({
      data: validatedData
    });

    return NextResponse.json(rack, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Error creating rack:", error);
    return NextResponse.json(
      { error: "Failed to create rack" },
      { status: 500 }
    );
  }
}
