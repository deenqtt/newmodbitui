// File: app/api/devices/external/route.ts

import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * FUNGSI GET: Mengambil semua data device
 */
export async function GET() {
  try {
    const devices = await prisma.deviceExternal.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });
    return NextResponse.json(devices);
  } catch (error) {
    console.error("Error fetching devices:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan pada server." },
      { status: 500 }
    );
  }
}

/**
 * FUNGSI POST: Menyimpan device baru
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, topic, address } = body;

    // Validasi input
    if (!name || !topic) {
      return NextResponse.json(
        { message: "Nama device dan Topic wajib diisi." },
        { status: 400 }
      );
    }

    const newDevice = await prisma.deviceExternal.create({
      data: {
        name,
        topic,
        address,
      },
    });

    return NextResponse.json(newDevice, { status: 201 });
  } catch (error: any) {
    // Penanganan error jika topic duplikat
    if (error.code === "P2002") {
      return NextResponse.json(
        { message: "Topic ini sudah digunakan." },
        { status: 409 } // Conflict
      );
    }
    console.error("Error creating device:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan pada server." },
      { status: 500 }
    );
  }
}
