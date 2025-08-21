import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: "Device ID is required" },
        { status: 400 }
      );
    }

    const device = await prisma.loraDevice.findUnique({
      where: { id },
      include: {
        data: {
          orderBy: { timestamp: "desc" },
          take: 1, // ambil data terbaru
        },
      },
    });

    if (!device) {
      return NextResponse.json({ error: "Device not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: device.id,
      devEui: device.devEui,
      name: device.name,
      lastSeen: device.lastSeen,
      latestData: device.data[0] || null,
    });
  } catch (error) {
    console.error("Error fetching latest LoRaWAN device data:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
