// File: app/api/alarms/[id]/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // Pastikan path ini benar
import { AlarmKeyType } from "@prisma/client";

interface RouteParams {
  params: {
    id: string;
  };
}

// =======================================================
// HANDLER UNTUK GET (Mengambil satu alarm by ID)
// =======================================================
export async function GET(req: Request, { params }: RouteParams) {
  try {
    const { id } = params;
    const alarm = await prisma.alarmConfiguration.findUnique({
      where: { id },
      include: {
        device: true,
        bits: true,
      },
    });

    if (!alarm) {
      return NextResponse.json({ message: "Alarm not found" }, { status: 404 });
    }
    return NextResponse.json(alarm);
  } catch (error) {
    console.error("Error fetching alarm:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// =======================================================
// HANDLER UNTUK PUT (Update alarm)
// =======================================================
export async function PUT(req: Request, { params }: RouteParams) {
  try {
    const { id } = params;
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

    // Gunakan transaksi untuk memastikan integritas data:
    // 1. Hapus semua bit lama yang terkait dengan alarm ini.
    // 2. Update data alarm utama.
    // 3. Buat bit baru jika tipenya adalah BIT_VALUE.
    const updatedAlarm = await prisma.$transaction(async (tx) => {
      // 1. Hapus bit-bit konfigurasi yang lama
      await tx.alarmBitConfiguration.deleteMany({
        where: { alarmConfigId: id },
      });

      // 2 & 3. Update alarm utama dan buat bit baru jika ada
      const alarm = await tx.alarmConfiguration.update({
        where: { id },
        data: {
          customName,
          alarmType,
          keyType,
          key,
          deviceUniqId,
          minValue:
            keyType === AlarmKeyType.THRESHOLD ? parseFloat(minValue) : null,
          maxValue:
            keyType === AlarmKeyType.THRESHOLD ? parseFloat(maxValue) : null,
          maxOnly: keyType === AlarmKeyType.THRESHOLD ? Boolean(maxOnly) : null,
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
      return alarm;
    });

    return NextResponse.json(updatedAlarm);
  } catch (error) {
    console.error(`Error updating alarm:`, error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// =======================================================
// HANDLER UNTUK DELETE
// =======================================================
export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    const { id } = params;
    await prisma.alarmConfiguration.delete({
      where: { id },
    });
    // Bit-bit terkait akan terhapus otomatis karena `onDelete: Cascade` di skema

    return new NextResponse(null, { status: 204 }); // 204 No Content
  } catch (error) {
    console.error(`Error deleting alarm:`, error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
