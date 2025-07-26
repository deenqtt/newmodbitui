// File BARU: app/api/bill-configs/route.ts
import { NextResponse } from "next/server";
import { PrismaClient, Role } from "@prisma/client";
import { getAuthFromCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma"; // Asumsi Anda punya file prisma client terpusat

export async function POST(request: Request) {
  const auth = await getAuthFromCookie(request);
  if (!auth || auth.role !== Role.ADMIN) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const {
      customName,
      sourceDeviceId,
      sourceDeviceKey,
      rupiahRatePerKwh,
      dollarRatePerKwh,
    } = body;

    const sanitizedName = customName.replace(/\s+/g, "_");
    const publishTopic = `iot/bill_calculation/${sanitizedName}`;

    // Gunakan transaksi untuk memastikan kedua operasi berhasil atau gagal bersamaan
    const newConfig = await prisma.$transaction(async (tx) => {
      // 1. Buat perangkat "virtual" baru untuk publikasi
      const newPublishDevice = await tx.deviceExternal.create({
        data: {
          name: customName,
          topic: publishTopic,
          address: Math.random().toString(36).substring(7), // Alamat acak
        },
      });

      // 2. Buat konfigurasi tagihan
      const newBillConfig = await tx.billConfiguration.create({
        data: {
          customName,
          sourceDeviceId,
          sourceDeviceKey,
          publishTargetDeviceId: newPublishDevice.id,
          rupiahRatePerKwh,
          dollarRatePerKwh,
        },
      });

      return newBillConfig;
    });

    return NextResponse.json(newConfig, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to create configuration." },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  // ... (Logika GET untuk mengambil semua konfigurasi)
}

// ========================================================

// File BARU: app/api/bill-configs/[id]/route.ts
// (Berisi logika PUT dan DELETE)

// ========================================================

// File BARU: app/api/bill-logs/route.ts
// (Berisi logika GET untuk mengambil riwayat log)

// ========================================================

// File BARU: app/api/cron/bill-logger/route.ts
// (Berisi logika untuk cron job logging)
