// File: app/api/bill-logs/route.ts
import { NextResponse } from "next/server";
import { getAuthFromCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * FUNGSI GET: Mengambil riwayat log tagihan.
 */
export async function GET(request: Request) {
  const auth = await getAuthFromCookie(request);
  if (!auth) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const logs = await prisma.billLog.findMany({
      // Ambil 100 log terbaru
      take: 100,
      orderBy: {
        timestamp: "desc",
      },
      include: {
        config: true, // Sertakan detail konfigurasi terkait
      },
    });
    return NextResponse.json(logs);
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to fetch logs." },
      { status: 500 }
    );
  }
}
