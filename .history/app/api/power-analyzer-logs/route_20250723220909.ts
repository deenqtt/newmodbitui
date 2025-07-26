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
      // Hapus bagian include untuk sementara waktu untuk menghilangkan error
      // include: {
      //   config: {
      //     select: { customName: true },
      //   },
      // },
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

// ... (DELETE function tetap sama)
