// File: app/api/bill-configs/route.ts
import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { getAuthFromCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma"; // Menggunakan instance Prisma terpusat

/**
 * FUNGSI POST: Membuat konfigurasi tagihan baru.
 * - Memverifikasi bahwa pengguna adalah Admin.
 * - Membuat "perangkat virtual" baru di DeviceExternal untuk publikasi hasil.
 * - Menyimpan konfigurasi tagihan baru yang terhubung ke perangkat sumber dan perangkat virtual.
 */
export async function POST(request: Request) {
  // 1. Otentikasi: Pastikan hanya admin yang bisa mengakses
  const auth = await getAuthFromCookie(request);
  if (!auth || auth.role !== Role.ADMIN) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    // 2. Ambil data dari body request
    const body = await request.json();
    const {
      customName,
      sourceDeviceId,
      sourceDeviceKey,
      rupiahRatePerKwh,
      dollarRatePerKwh,
    } = body;

    // Validasi input
    if (!customName || !sourceDeviceId || !sourceDeviceKey) {
      return NextResponse.json(
        { message: "Missing required fields." },
        { status: 400 }
      );
    }

    // 3. Siapkan nama dan topic untuk perangkat virtual baru
    const sanitizedName = customName.replace(/\s+/g, "_");
    const publishTopic = `iot/bill_calculation/${sanitizedName}`;

    // 4. Gunakan Transaksi Prisma untuk memastikan kedua operasi (membuat perangkat & membuat config)
    //    berhasil atau gagal secara bersamaan, menjaga konsistensi data.
    const newConfig = await prisma.$transaction(async (tx) => {
      // 4a. Buat perangkat "virtual" baru di DeviceExternal untuk publikasi hasil
      const newPublishDevice = await tx.deviceExternal.create({
        data: {
          name: `${customName} (Billing)`, // Beri penanda agar mudah dikenali
          topic: publishTopic,
          address: `virtual-${Math.random().toString(36).substring(7)}`, // Alamat acak
        },
      });

      // 4b. Buat konfigurasi tagihan baru di database
      const newBillConfig = await tx.billConfiguration.create({
        data: {
          customName,
          sourceDeviceId,
          sourceDeviceKey,
          publishTargetDeviceId: newPublishDevice.id, // Hubungkan ke perangkat virtual
          rupiahRatePerKwh: rupiahRatePerKwh || 1467, // Gunakan default jika tidak disediakan
          dollarRatePerKwh: dollarRatePerKwh || 0.1,
        },
        include: {
          sourceDevice: true, // Sertakan data source device dalam response
          publishTargetDevice: true, // Sertakan data publish device dalam response
        },
      });

      return newBillConfig;
    });

    // 5. Kembalikan data konfigurasi yang baru dibuat
    return NextResponse.json(newConfig, { status: 201 });
  } catch (error: any) {
    console.error("Failed to create bill configuration:", error);
    // Tangani error jika customName sudah ada (karena @unique)
    if (error.code === "P2002") {
      return NextResponse.json(
        { message: "A configuration with this custom name already exists." },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { message: "Failed to create configuration." },
      { status: 500 }
    );
  }
}
