// File: app/api/logging-configs/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export async function GET() {
  // Tambahkan blok try...catch untuk menangani error
  try {
    const configs = await prisma.loggingConfiguration.findMany({
      orderBy: {
        createdAt: "asc",
      },
      // 'include' akan mengambil data device yang terhubung
      include: {
        device: true,
      },
    });
    // Jika tidak ada data, ini akan mengembalikan array kosong, bukan error
    return NextResponse.json(configs);
  } catch (error) {
    console.error("Failed to fetch logging configs:", error);
    // Jika terjadi error di database, kirim response error yang jelas
    return NextResponse.json(
      { message: "Failed to fetch logging configurations." },
      { status: 500 }
    );
  }
}

// Anda bisa menambahkan fungsi POST di sini nanti
export async function POST(request: Request) {
  // ... Logika untuk membuat config baru
}
