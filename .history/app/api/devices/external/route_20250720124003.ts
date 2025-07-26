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

    // Cek jika body adalah array (untuk import)
    if (Array.isArray(body)) {
      const upsertPromises = body.map((device) =>
        prisma.deviceExternal.upsert({
          where: { topic: device.topic }, // Cek duplikat berdasarkan topic
          update: { name: device.name, address: device.address },
          create: {
            name: device.name,
            topic: device.topic,
            address: device.address,
            uniqId: device.uniqId, // Asumsi uniqId juga di-supply saat import
          },
        })
      );
      await prisma.$transaction(upsertPromises);
      return NextResponse.json(
        { message: `${body.length} devices processed.` },
        { status: 201 }
      );
    }

    // Logika untuk data tunggal (form biasa)
    const { name, topic, address } = body;
    if (!name || !topic) {
      return NextResponse.json(
        { message: "Nama dan Topic wajib diisi." },
        { status: 400 }
      );
    }
    const newDevice = await prisma.deviceExternal.create({
      data: { name, topic, address },
    });
    return NextResponse.json(newDevice, { status: 201 });
  } catch (error: any) {
    // ... (error handling tetap sama)
    return NextResponse.json(
      { message: "Terjadi kesalahan.", error: error.message },
      { status: 500 }
    );
  }
}
