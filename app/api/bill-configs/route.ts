// File: app/api/bill-configs/route.ts
import { NextResponse } from "next/server";
import { getAuthFromCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { triggerMqttServiceUpdate } from "@/lib/mqtt-service-trigger"; // <-- IMPORT

/**
 * FUNGSI GET: Mengambil semua konfigurasi tagihan.
 * (Tidak ada perubahan di sini, include sudah benar)
 */
export async function GET(request: Request) {
  const auth = await getAuthFromCookie(request);
  if (!auth) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const configs = await prisma.billConfiguration.findMany({
      include: {
        sourceDevice: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    return NextResponse.json(configs);
  } catch (error) {
    console.error("Error fetching bill configurations:", error);
    return NextResponse.json(
      { message: "Failed to fetch configurations." },
      { status: 500 }
    );
  }
}

/**
 * FUNGSI POST: Membuat konfigurasi tagihan baru.
 */
export async function POST(request: Request) {
  const auth = await getAuthFromCookie(request);
  if (!auth || auth.role !== Role.ADMIN) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();

    const targetDevice = await prisma.deviceExternal.create({
      data: {
        name: `${body.customName} (Virtual)`,
        topic: `IOT/BillCalculation/${body.customName.replace(/\s+/g, "_")}`,
        address: "virtual-device",
      },
    });

    const newConfig = await prisma.billConfiguration.create({
      data: {
        customName: body.customName,
        sourceDeviceUniqId: body.sourceDeviceUniqId,
        sourceDeviceKey: body.sourceDeviceKey,
        rupiahRatePerKwh: body.rupiahRatePerKwh,
        dollarRatePerKwh: body.dollarRatePerKwh,
        publishTargetDeviceUniqId: targetDevice.uniqId,
      },
    });

    triggerMqttServiceUpdate(); // <-- PANGGIL FUNGSI DI SINI

    return NextResponse.json(newConfig, { status: 201 });
  } catch (error) {
    console.error("Error creating bill configuration:", error);
    return NextResponse.json(
      { message: "Failed to create configuration." },
      { status: 500 }
    );
  }
}
