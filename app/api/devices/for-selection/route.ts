// File: app/api/devices/for-selection/route.ts

import { NextResponse, NextRequest } from "next/server";
import { PrismaClient } from "@prisma/client";
// import { getAuthFromCookie } from "@/lib/auth"; // Uncomment jika Anda butuh autentikasi
// import { Role } from "@prisma/client"; // Uncomment jika Anda butuh autentikasi

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  // --- START AUTENTIKASI (Jika Anda memiliki, uncomment dan sesuaikan) ---
  // const auth = await getAuthFromCookie(request);
  // if (!auth) {
  //   return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  // }
  // if (auth.role !== Role.ADMIN) { // Contoh: hanya ADMIN yang boleh akses
  //   return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  // }
  // --- END AUTENTIKASI ---

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
