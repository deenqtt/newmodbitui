// File: app/api/logging-configs/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// FUNGSI GET: Mengambil semua konfigurasi logging
export async function GET() {
  try {
    const configs = await prisma.loggingConfiguration.findMany({
      orderBy: { createdAt: "asc" },
      include: { device: true },
    });
    return NextResponse.json(configs);
  } catch (error) {
    console.error("Failed to fetch logging configs:", error);
    return NextResponse.json(
      { message: "Failed to fetch configurations." },
      { status: 500 }
    );
  }
}

// FUNGSI POST: Membuat konfigurasi logging baru
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { customName, key, units, multiply, deviceUniqId } = body;

    if (!customName || !key || !deviceUniqId) {
      return NextResponse.json(
        { message: "Input tidak lengkap." },
        { status: 400 }
      );
    }

    const newConfig = await prisma.loggingConfiguration.create({
      data: { customName, key, units, multiply, deviceUniqId },
    });
    return NextResponse.json(newConfig, { status: 201 });
  } catch (error: any) {
    if (error.code === "P2002") {
      // Handle error duplikasi
      return NextResponse.json(
        { message: "Kombinasi Device dan Key ini sudah ada." },
        { status: 409 }
      );
    }
    console.error("Failed to create logging config:", error);
    return NextResponse.json(
      { message: "Gagal membuat konfigurasi baru." },
      { status: 500 }
    );
  }
}
