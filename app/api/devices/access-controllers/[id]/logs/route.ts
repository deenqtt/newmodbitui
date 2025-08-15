// Lokasi File: app/api/devices/access-controllers/[id]/logs/route.ts
// (Buat file dan folder baru ini)

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Handler untuk GET (Mengambil semua log untuk satu controller)
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Ambil semua log yang cocok dengan controllerId, urutkan dari yang terbaru
    const logs = await prisma.activityLog.findMany({
      where: {
        controllerId: id,
      },
      orderBy: {
        timestamp: "desc", // Tampilkan log terbaru di paling atas
      },
      take: 100, // Batasi untuk mengambil 100 log terakhir untuk performa
    });

    return NextResponse.json(logs);
  } catch (error) {
    console.error("Error fetching activity logs:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// Handler untuk DELETE (Menghapus semua log untuk satu controller)
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Hapus semua log yang memiliki controllerId yang cocok
    const deleteResult = await prisma.activityLog.deleteMany({
      where: {
        controllerId: id,
      },
    });

    return NextResponse.json({
      message: `Successfully deleted ${deleteResult.count} logs.`,
    });
  } catch (error) {
    console.error("Error deleting activity logs:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
