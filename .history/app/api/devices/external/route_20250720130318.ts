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

// Ganti seluruh fungsi POST yang lama dengan ini
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // --- 1. Logika untuk Impor Data (jika body adalah array) ---
    if (Array.isArray(body)) {
      let createdCount = 0;
      let updatedCount = 0;
      let skippedCount = 0;
      const errors: string[] = [];

      // Gunakan transaksi untuk memastikan semua atau tidak sama sekali
      await prisma.$transaction(async (tx) => {
        for (const device of body) {
          // Validasi dasar
          if (!device.uniqId || !device.topic || !device.name) {
            skippedCount++;
            errors.push(`Data tidak lengkap (uniqId, topic, name wajib ada).`);
            continue; // Lanjut ke data berikutnya
          }

          const existingByUniqId = await tx.deviceExternal.findUnique({
            where: { uniqId: device.uniqId },
          });

          const existingByTopic = await tx.deviceExternal.findUnique({
            where: { topic: device.topic },
          });

          if (existingByUniqId) {
            // --- UPDATE LOGIC ---
            // Cek konflik topic: apakah topic baru dipakai oleh device LAIN?
            if (
              existingByTopic &&
              existingByTopic.uniqId !== existingByUniqId.uniqId
            ) {
              skippedCount++;
              errors.push(
                `Gagal update ${device.name}: Topic ${device.topic} sudah digunakan.`
              );
            } else {
              await tx.deviceExternal.update({
                where: { uniqId: device.uniqId },
                data: {
                  name: device.name,
                  topic: device.topic,
                  address: device.address,
                },
              });
              updatedCount++;
            }
          } else {
            // --- CREATE LOGIC ---
            // Cek konflik topic
            if (existingByTopic) {
              skippedCount++;
              errors.push(
                `Gagal buat ${device.name}: Topic ${device.topic} sudah digunakan.`
              );
            } else {
              await tx.deviceExternal.create({ data: device });
              createdCount++;
            }
          }
        }
      });

      return NextResponse.json(
        {
          message: "Proses impor selesai.",
          created: createdCount,
          updated: updatedCount,
          skipped: skippedCount,
          errors: errors,
        },
        { status: 200 }
      );
    } else {
      // --- 2. Logika untuk Data Tunggal (dari form biasa) ---
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
    }
  } catch (error: any) {
    return NextResponse.json(
      { message: "Terjadi kesalahan fatal pada server.", error: error.message },
      { status: 500 }
    );
  }
}
