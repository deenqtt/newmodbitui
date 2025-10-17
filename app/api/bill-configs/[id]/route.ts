// File: app/api/bill-configs/[id]/route.ts
import { NextResponse } from "next/server";
import { getAuthFromCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { triggerMqttServiceUpdate } from "@/lib/mqtt-service-trigger";

/**
 * FUNGSI PUT: Mengedit konfigurasi tagihan yang ada.
 */
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await getAuthFromCookie(request);
  if (!auth) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { id } = params;

  try {
    const body = await request.json();
    const {
      customName,
      sourceDeviceUniqId,
      sourceDeviceKey,
      rupiahRatePerKwh,
      dollarRatePerKwh,
    } = body;

    // --- PERBAIKAN: Validasi tambahan sebelum update ---
    const sourceDeviceExists = await prisma.deviceExternal.findUnique({
      where: { uniqId: sourceDeviceUniqId },
    });

    if (!sourceDeviceExists) {
      return NextResponse.json(
        { message: `Source device with ID '${sourceDeviceUniqId}' not found.` },
        { status: 404 }
      );
    }
    // --- AKHIR PERBAIKAN ---

    const oldBillConfig = await prisma.billConfiguration.findUnique({
      where: { id },
      select: { customName: true, publishTargetDeviceUniqId: true },
    });

    if (!oldBillConfig) {
      return NextResponse.json(
        { message: "Bill configuration not found" },
        { status: 404 }
      );
    }

    // Update DeviceExternal virtual jika customName berubah
    if (
      oldBillConfig.customName !== customName &&
      oldBillConfig.publishTargetDeviceUniqId
    ) {
      const sanitizedCustomName = customName.replace(/\s+/g, "_");
      const newTopic = `IOT/BillCalculation/${sanitizedCustomName}`;
      const newName = `${customName} (Virtual)`;

      await prisma.deviceExternal.update({
        where: { uniqId: oldBillConfig.publishTargetDeviceUniqId },
        data: { name: newName, topic: newTopic },
      });
    }

    // Update konfigurasi Bill itu sendiri
    const updatedConfig = await prisma.billConfiguration.update({
      where: { id: params.id },
      data: {
        customName,
        sourceDeviceUniqId,
        sourceDeviceKey,
        rupiahRatePerKwh,
        dollarRatePerKwh,
      },
    });

    triggerMqttServiceUpdate(); // <-- Pastikan trigger dipanggil

    return NextResponse.json(updatedConfig);
  } catch (error: any) {
    console.error(`Error updating bill configuration with ID ${id}:`, error);
    return NextResponse.json(
      { message: "Failed to update configuration.", error: error.message },
      { status: 500 }
    );
  }
}

/**
 * FUNGSI DELETE: Menghapus konfigurasi tagihan.
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await getAuthFromCookie(request);
  if (!auth) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      const configToDelete = await tx.billConfiguration.findUnique({
        where: { id: params.id },
        // --- PERUBAHAN DI SINI ---
        select: { publishTargetDeviceUniqId: true }, // Ambil uniqId target
      });

      if (!configToDelete) {
        throw new Error("Configuration not found.");
      }

      // Hapus config-nya dulu
      await tx.billConfiguration.delete({ where: { id: params.id } });

      // Hapus perangkat virtual-nya berdasarkan uniqId
      await tx.deviceExternal.delete({
        // --- PERUBAHAN DI SINI ---
        where: { uniqId: configToDelete.publishTargetDeviceUniqId },
      });
    });
    triggerMqttServiceUpdate(); // <-- PANGGIL SETELAH DELETE BERHASIL

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to delete configuration." },
      { status: 500 }
    );
  }
}
