// File: app/api/alarm-log/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // Pastikan path ini benar

// =======================================================
// HANDLER UNTUK GET (Mengambil semua log alarm)
// =======================================================
export async function GET() {
  try {
    const logs = await prisma.alarmLog.findMany({
      orderBy: { timestamp: "desc" }, // Tampilkan yang terbaru di atas
      include: {
        // Ambil data terkait dari AlarmConfiguration dan DeviceExternal
        alarmConfig: {
          include: {
            device: {
              select: {
                name: true, // Hanya butuh nama device
              },
            },
          },
        },
      },
    });

    // Ubah struktur data agar lebih mudah digunakan di frontend
    const formattedLogs = logs.map((log) => ({
      id: log.id,
      // Ambil nama dari relasi, berikan fallback jika tidak ada
      deviceName: log.alarmConfig.device?.name || "Unknown Device",
      alarmName: log.alarmConfig.customName,
      alarmType: log.alarmConfig.alarmType,
      status: log.status,
      timestamp: log.timestamp,
      triggeringValue: log.triggeringValue,
      clearedAt: log.clearedAt,
    }));

    return NextResponse.json(formattedLogs);
  } catch (error) {
    console.error("Error fetching alarm logs:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// =======================================================
// HANDLER UNTUK DELETE (Menghapus SEMUA log alarm)
// =======================================================
export async function DELETE() {
  try {
    await prisma.alarmLog.deleteMany({});
    return new NextResponse(null, { status: 204 }); // 204 No Content, artinya sukses
  } catch (error) {
    console.error("Error deleting all alarm logs:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
