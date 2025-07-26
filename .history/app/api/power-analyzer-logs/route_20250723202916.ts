// File: app/api/power-analyzer-logs/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getAuthFromCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

/**
 * FUNGSI GET: Mengambil semua log Power Analyzer.
 */
export async function GET(request: NextRequest) {
  const auth = await getAuthFromCookie(request);
  if (!auth) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const logs = await prisma.powerAnalyzerLog.findMany({
      include: {
        config: {
          select: { customName: true }, // Include customName dari konfigurasi terkait
        },
      },
      orderBy: {
        timestamp: "desc",
      },
    });
    return NextResponse.json(logs);
  } catch (error: any) {
    console.error("Error fetching Power Analyzer logs:", error);
    return NextResponse.json(
      { message: "Failed to fetch Power Analyzer logs.", error: error.message },
      { status: 500 }
    );
  }
}

/**
 * FUNGSI DELETE: Menghapus semua log Power Analyzer.
 */
export async function DELETE(request: NextRequest) {
  const auth = await getAuthFromCookie(request);
  if (!auth || auth.role !== Role.ADMIN) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    await prisma.powerAnalyzerLog.deleteMany({}); // Menghapus semua log
    return NextResponse.json(
      { message: "All Power Analyzer logs deleted successfully." },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error deleting all Power Analyzer logs:", error);
    return NextResponse.json(
      {
        message: "Failed to delete all Power Analyzer logs.",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
