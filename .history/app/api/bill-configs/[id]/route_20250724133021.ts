// File: app/api/bill-configs/[id]/route.ts
import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { getAuthFromCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { triggerMqttServiceUpdate } from "@/lib/mqtt-service-trigger"; // <-- IMPORT

/**
 * FUNGSI PUT: Mengedit konfigurasi tagihan yang ada.
 */
export async function PUT(
  request: NextRequest, // Pastikan ada parameter request
  { params }: { params: { id: string } }
) {
  const auth = await getAuthFromCookie(request);
  if (!auth || auth.role !== Role.ADMIN) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
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

    // 1. Ambil konfigurasi Bill yang sudah ada untuk mendapatkan customName lama dan publishTargetDeviceUniqId
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

    // 2. Periksa apakah customName berubah DAN ada publishTargetDeviceUniqId
    if (
      oldBillConfig.customName !== customName &&
      oldBillConfig.publishTargetDeviceUniqId
    ) {
      const sanitizedCustomName = customName.replace(/\s+/g, "_");
      const newTopic = `IOT/BillCalculation/${sanitizedCustomName}`;
      const newName = `${customName} (Virtual)`; // Sesuaikan dengan naming convention Anda

      try {
        // Pencegahan konflik: Periksa apakah topik baru sudah digunakan oleh device lain (selain device itu sendiri)
        const existingDeviceWithNewTopic =
          await prisma.deviceExternal.findUnique({
            where: { topic: newTopic },
          });

        if (
          existingDeviceWithNewTopic &&
          existingDeviceWithNewTopic.uniqId !==
            oldBillConfig.publishTargetDeviceUniqId
        ) {
          return NextResponse.json(
            {
              message: `New topic "${newTopic}" generated from custom name is already in use by another device.`,
            },
            { status: 409 }
          );
        }

        // Update DeviceExternal yang terkait
        await prisma.deviceExternal.update({
          where: { uniqId: oldBillConfig.publishTargetDeviceUniqId },
          data: {
            name: newName,
            topic: newTopic,
          },
        });
        console.log(
          `[Backend] Updated DeviceExternal for Bill Target: ${oldBillConfig.publishTargetDeviceUniqId} to name "${newName}" and topic "${newTopic}"`
        );
      } catch (deviceError: any) {
        console.error(
          `[Backend] Error updating associated DeviceExternal for Bill config ${id}:`,
          deviceError
        );
        return NextResponse.json(
          {
            message: `Failed to update associated device: ${deviceError.message}`,
          },
          { status: 500 }
        );
      }
    }

    // 3. Update konfigurasi Bill itu sendiri
    const updatedConfig = await prisma.billConfiguration.update({
      where: { id: params.id },
      data: {
        customName: customName, // Gunakan customName yang baru
        sourceDeviceUniqId: sourceDeviceUniqId,
        sourceDeviceKey: sourceDeviceKey,
        rupiahRatePerKwh: rupiahRatePerKwh,
        dollarRatePerKwh: dollarRatePerKwh,
      },
    });
    triggerMqttServiceUpdate(); // <-- PANGGIL SETELAH UPDATE BERHASIL

    return NextResponse.json(updatedConfig);
  } catch (error: any) {
    // Tangkap error dengan tipe :any
    console.error(`Error updating bill configuration with ID ${id}:`, error); // Log error lebih detail
    return NextResponse.json(
      { message: "Failed to update configuration.", error: error.message }, // Sertakan error.message
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
  if (!auth || auth.role !== Role.ADMIN) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
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
