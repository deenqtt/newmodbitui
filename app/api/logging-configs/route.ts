// File: app/api/logging-configs/route.ts
import { NextResponse } from "next/server";
// --- PERBAIKAN: Impor prisma dari lib, jangan buat baru ---
import { prisma } from "@/lib/prisma";

// FUNGSI GET: Mengambil semua konfigurasi logging
export async function GET() {
  try {
    const configs = await prisma.loggingConfiguration.findMany({
      orderBy: { customName: "asc" }, // Urutkan berdasarkan nama agar mudah dibaca
      include: {
        device: {
          select: {
            name: true, // Hanya ambil nama device agar payload lebih ringan
          },
        },
      },
    });

    return NextResponse.json(configs);
  } catch (error) {
    console.error(
      "[API] GET /api/logging-configs: Gagal mengambil data:",
      error
    );
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
      console.error("[API] POST /api/logging-configs: Input tidak lengkap.");
      return NextResponse.json(
        { message: "Input tidak lengkap. Pastikan semua field terisi." },
        { status: 400 }
      );
    }

    const newConfig = await prisma.loggingConfiguration.create({
      data: { customName, key, units, multiply, deviceUniqId },
    });

    return NextResponse.json(newConfig, { status: 201 });
  } catch (error: any) {
    if (error.code === "P2002") {
      console.warn("[API] POST /api/logging-configs: Terjadi duplikasi data.");
      return NextResponse.json(
        { message: "Kombinasi Device dan Key ini sudah ada." },
        { status: 409 }
      );
    }
    console.error(
      "[API] POST /api/logging-configs: Gagal membuat konfigurasi:",
      error
    );
    return NextResponse.json(
      { message: "Gagal membuat konfigurasi baru." },
      { status: 500 }
    );
  }
}
