// File: app/api/devices/for-selection/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
// import { getAuthFromCookie } from "@/lib/auth"; // Jika Anda butuh autentikasi, uncomment ini dan gunakan di GET function
// import { Role } from "@prisma/client"; // Jika Anda butuh Role untuk autentikasi, uncomment ini

const prisma = new PrismaClient();

export async function GET() {
  // NEW: Jika Anda sebelumnya punya autentikasi di sini, tambahkan kembali.
  // Contoh:
  // const auth = await getAuthFromCookie(request);
  // if (!auth) {
  //   return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  // }
  // if (auth.role !== Role.ADMIN) { // Jika hanya ADMIN yang boleh akses
  //   return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  // }

  try {
    const devices = await prisma.deviceExternal.findMany({
      orderBy: {
        name: "asc",
      },
      select: {
        // id: true, // Anda bisa sertakan ini jika diperlukan di frontend
        uniqId: true,
        name: true,
        topic: true,
        lastPayload: true, // <-- PENTING: Tambahkan ini
        lastUpdatedByMqtt: true, // <-- PENTING: Tambahkan ini
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
