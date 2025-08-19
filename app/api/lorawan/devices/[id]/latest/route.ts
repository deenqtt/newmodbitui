// File: app/api/lorawan/devices/[id]/latest/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Handler untuk GET (Mengambil data terbaru dari satu perangkat berdasarkan ID database)
export async function GET(
  request: Request,
  { params }: { params: { id: string } } // <-- Ubah params menjadi { id }
) {
  try {
    const { id } = params; // <-- Ambil id dari params

    if (!id) {
      return NextResponse.json({ error: "Device ID is required" }, { status: 400 });
    }

    // Cari device berdasarkan ID database
    const device = await prisma.loraDevice.findUnique({
      where: { id }, // <-- Gunakan id untuk mencari
      include: {
         { 
          orderBy: {
            timestamp: "desc",
          },
          take: 1,
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