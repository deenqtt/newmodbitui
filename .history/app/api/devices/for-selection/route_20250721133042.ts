// File: app/api/devices/for-selection/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export async function GET() {
  try {
    const devices = await prisma.deviceExternal.findMany({
      orderBy: {
        name: "asc",
      },
      // Select hanya akan mengambil kolom yang kita sebutkan
      select: {
        uniqId: true,
        name: true,
        topic: true,
      },
    });
    return NextResponse.json(devices);
  } catch (error) {
    console.error("Failed to fetch devices for selection:", error);
    return NextResponse.json(
      { message: "Failed to fetch devices." },
      { status: 500 }
    );
  }
}
