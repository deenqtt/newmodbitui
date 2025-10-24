// File: app/api/historical/chart-data/route.ts
import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { subHours, subDays } from "date-fns";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const configId = searchParams.get("configId");
  const timeRange = searchParams.get("timeRange"); // e.g., "1h", "24h", "7d"

  if (!configId || !timeRange) {
    return NextResponse.json(
      { message: "configId and timeRange are required" },
      { status: 400 }
    );
  }

  try {
    const now = new Date();
    let startDate: Date;

    // Tentukan tanggal mulai berdasarkan rentang waktu
    switch (timeRange) {
      case "1h":
        startDate = subHours(now, 1);
        break;
      case "24h":
        startDate = subHours(now, 24);
        break;
      case "7d":
        startDate = subDays(now, 7);
        break;
      default:
        return NextResponse.json(
          { message: "Invalid timeRange" },
          { status: 400 }
        );
    }

    // Ambil semua data log dalam rentang waktu yang ditentukan
    const logs = await prisma.loggedData.findMany({
      where: {
        configId: configId,
        timestamp: {
          gte: startDate,
        },
      },
      orderBy: {
        timestamp: "asc", // Urutkan dari yang terlama ke terbaru
      },
      select: {
        value: true,
        timestamp: true,
      },
    });

    return NextResponse.json(logs);
  } catch (error) {
    console.error("[API_CHART_DATA]", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
