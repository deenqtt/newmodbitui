// File: app/api/historical/usage/route.ts
import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const configId = searchParams.get("configId");
  const period = searchParams.get("period"); // e.g., "last_month", "current_month"

  if (!configId || !period) {
    return NextResponse.json(
      { message: "configId and period are required" },
      { status: 400 }
    );
  }

  try {
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    if (period === "last_month") {
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    } else if (period === "current_month") {
      // --- LOGIKA BARU UNTUK BULAN INI ---
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = now; // Sampai waktu saat ini
    } else {
      return NextResponse.json({ message: "Invalid period" }, { status: 400 });
    }

    const firstLog = await prisma.loggedData.findFirst({
      where: {
        configId: configId,
        timestamp: { gte: startDate },
      },
      orderBy: { timestamp: "asc" },
    });

    // Untuk bulan ini, log terakhir adalah yang paling baru
    const lastLog = await prisma.loggedData.findFirst({
      where: {
        configId: configId,
        timestamp: { lte: endDate },
      },
      orderBy: { timestamp: "desc" },
    });

    if (!firstLog || !lastLog) {
      return NextResponse.json(
        { usage: 0, message: "Not enough data for the period" },
        { status: 200 }
      );
    }

    const usage = lastLog.value - firstLog.value;

    return NextResponse.json({
      usage: usage >= 0 ? usage : 0,
    });
  } catch (error) {
    console.error("[API_HISTORICAL_USAGE]", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
