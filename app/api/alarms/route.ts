// File: app/api/alarms/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // Pastikan path ini benar
import { AlarmKeyType } from "@prisma/client";

// =======================================================
// HANDLER UNTUK GET (Mengambil semua alarm)
// =======================================================
export async function GET() {
  try {
    const alarms = await prisma.alarmConfiguration.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        // Sertakan nama device dari relasi untuk ditampilkan di tabel
        device: {
          select: {
            name: true,
          },
        },
        bits: true, // Sertakan juga konfigurasi bit
      },
    });
    return NextResponse.json(alarms);
  } catch (error) {
    console.error("Error fetching alarms:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// =======================================================
// HANDLER UNTUK POST (Membuat alarm baru)
// =======================================================
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      deviceUniqId,
      key,
      keyType,
      customName,
      alarmType,
      minValue,
      maxValue,
      maxOnly,
      bits = [],
    } = body;

    // Validasi input dasar
    if (!deviceUniqId || !key || !keyType || !customName || !alarmType) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    const newAlarm = await prisma.alarmConfiguration.create({
      data: {
        customName,
        alarmType,
        keyType,
        key,
        device: { connect: { uniqId: deviceUniqId } },
        // Atur nilai hanya jika tipenya THRESHOLD
        minValue:
          keyType === AlarmKeyType.THRESHOLD ? parseFloat(minValue) : null,
        maxValue:
          keyType === AlarmKeyType.THRESHOLD ? parseFloat(maxValue) : null,
        maxOnly: keyType === AlarmKeyType.THRESHOLD ? Boolean(maxOnly) : null,

        // Jika keyType adalah BIT_VALUE, buat bit-bit terkait secara bersamaan (nested write)
        bits:
          keyType === AlarmKeyType.BIT_VALUE && bits.length > 0
            ? {
                create: bits.map((bit: any) => ({
                  bitPosition: parseInt(bit.bit),
                  customName: bit.customName,
                  alertToWhatsApp: Boolean(bit.alertToWhatsApp),
                })),
              }
            : undefined,
      },
    });

    return NextResponse.json(newAlarm, { status: 201 });
  } catch (error) {
    console.error("Error creating alarm:", error);
    // Cek jika error karena device tidak ditemukan
    if (
      error instanceof Error &&
      error.message.includes("invocation:\n\n\nForeign key constraint failed")
    ) {
      return NextResponse.json(
        { message: "Device with the provided uniqId not found." },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
