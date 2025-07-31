// File: app/api/devices-log-report/route.ts

import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma"; // Pastikan path ini benar

// =======================================================
// HANDLER UNTUK GET (Mengambil semua log data perangkat)
// =======================================================
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const configId = searchParams.get("configId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // Buat kondisi filter untuk query Prisma
    const whereCondition: any = {};
    if (configId) {
      whereCondition.configId = configId;
    }
    if (startDate && endDate) {
      whereCondition.timestamp = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    const logs = await prisma.loggedData.findMany({
      where: whereCondition,
      orderBy: { timestamp: "desc" },
      include: {
        // Ambil data terkait dari LoggingConfiguration dan DeviceExternal
        config: {
          include: {
            device: {
              select: {
                name: true, // Nama device
              },
            },
          },
        },
      },
    });

    // Ubah struktur data agar lebih mudah digunakan di frontend
    const formattedLogs = logs.map((log) => ({
      id: log.id,
      deviceName: log.config.device.name,
      logName: log.config.customName,
      value: log.value,
      units: log.config.units,
      timestamp: log.timestamp,
    }));

    return NextResponse.json(formattedLogs);
  } catch (error) {
    console.error("Error fetching device logs:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// =======================================================
// HANDLER UNTUK DELETE (Menghapus SEMUA log data)
// =======================================================
export async function DELETE() {
  try {
    await prisma.loggedData.deleteMany({});
    return new NextResponse(null, { status: 204 }); // Sukses
  } catch (error) {
    console.error("Error deleting all device logs:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
