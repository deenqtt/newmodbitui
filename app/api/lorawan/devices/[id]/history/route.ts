// File: app/api/lorawan/devices/[id]/history/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Handler untuk GET (Tidak ada perubahan)
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const deviceId = params.id;

    const deviceWithData = await prisma.loraDevice.findUnique({
      where: { id: deviceId },
      include: {
        data: {
          orderBy: {
            timestamp: "desc",
          },
        },
      },
    });

    if (!deviceWithData) {
      return NextResponse.json({ error: "Device not found" }, { status: 404 });
    }

    return NextResponse.json(deviceWithData);
  } catch (error) {
    console.error("Error fetching device history:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// Handler untuk DELETE (Dengan perbaikan)
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const deviceId = params.id;

    const deleteResult = await prisma.deviceData.deleteMany({
      where: {
        // --- PERBAIKAN DI SINI ---
        deviceId: deviceId, // Menggunakan nama kolom yang benar: 'deviceId'
      },
    });

    if (deleteResult.count === 0) {
      console.log(`No history data found to delete for device ${deviceId}.`);
    }

    return NextResponse.json(
      {
        message: `Successfully deleted ${deleteResult.count} history records.`,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting device history:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
