// File: app/api/logging-configs/batch-upload/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// FUNGSI POST: Menerima array konfigurasi dan menyimpannya secara massal
export async function POST(request: Request) {
  console.log("\n[API] POST /batch-upload: Menerima permintaan upload...");
  try {
    const configsToUpload = await request.json();

    if (!Array.isArray(configsToUpload)) {
      return NextResponse.json(
        { message: "Request body must be an array." },
        { status: 400 }
      );
    }
    console.log(
      `[API] POST /batch-upload: Menerima ${configsToUpload.length} konfigurasi untuk diproses.`
    );

    // Ambil semua ID unik perangkat yang ada di database untuk validasi
    const existingDevices = await prisma.deviceExternal.findMany({
      select: { uniqId: true },
    });
    const existingDeviceIds = new Set(existingDevices.map((d) => d.uniqId));

    let createdCount = 0;
    let skippedCount = 0;

    for (const config of configsToUpload) {
      const { deviceUniqId, key, customName, units, multiply } = config;

      // Validasi 1: Pastikan data dasar ada
      if (!deviceUniqId || !key || !customName) {
        console.warn(
          "[API] POST /batch-upload: Melewati konfigurasi karena data tidak lengkap:",
          config
        );
        skippedCount++;
        continue;
      }

      // Validasi 2: Pastikan perangkatnya ada di database
      if (!existingDeviceIds.has(deviceUniqId)) {
        console.warn(
          `[API] POST /batch-upload: Melewati konfigurasi karena deviceUniqId '${deviceUniqId}' tidak ditemukan.`
        );
        skippedCount++;
        continue;
      }

      // Gunakan 'upsert' untuk membuat baru atau update jika sudah ada
      // 'upsert' mencari berdasarkan constraint unik (deviceUniqId + key)
      await prisma.loggingConfiguration.upsert({
        where: {
          deviceUniqId_key: {
            deviceUniqId: deviceUniqId,
            key: key,
          },
        },
        update: {
          // Data untuk di-update jika ditemukan
          customName,
          units,
          multiply,
        },
        create: {
          // Data untuk dibuat jika tidak ditemukan
          customName,
          key,
          units,
          multiply,
          deviceUniqId,
        },
      });
      createdCount++;
    }

    console.log(
      `[API] POST /batch-upload: Proses selesai. Dibuat/Diupdate: ${createdCount}, Dilewati: ${skippedCount}`
    );
    return NextResponse.json(
      {
        message: "Batch upload processed successfully.",
        created: createdCount,
        skipped: skippedCount,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[API] POST /batch-upload: Terjadi error:", error);
    return NextResponse.json(
      { message: "An error occurred during the batch upload process." },
      { status: 500 }
    );
  }
}
