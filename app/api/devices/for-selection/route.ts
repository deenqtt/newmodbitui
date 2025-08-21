// File: app/api/devices/for-selection/route.ts

import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromCookie } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const auth = await getAuthFromCookie(request);
  if (!auth) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const devices = await prisma.deviceExternal.findMany({
      orderBy: {
        name: "asc",
      },
      select: {
        uniqId: true,
        name: true,
        topic: true,
        lastPayload: true,
        lastUpdatedByMqtt: true,
      },
    });
    return NextResponse.json(devices);
  } catch (error: any) {
    console.error("Failed to fetch devices for selection:", error);
    return NextResponse.json(
      { message: "Failed to fetch devices.", error: error.message },
      { status: 500 }
    );
  }
}
