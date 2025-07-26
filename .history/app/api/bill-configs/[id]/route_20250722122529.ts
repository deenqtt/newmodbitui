// File: app/api/bill-configs/[id]/route.ts
import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { getAuthFromCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * FUNGSI PUT: Mengedit konfigurasi tagihan yang ada.
 */
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await getAuthFromCookie(request);
  if (!auth || auth.role !== Role.ADMIN) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const updatedConfig = await prisma.billConfiguration.update({
      where: { id: params.id },
      data: {
        customName: body.customName,
        sourceDeviceId: body.sourceDeviceId,
        sourceDeviceKey: body.sourceDeviceKey,
        rupiahRatePerKwh: body.rupiahRatePerKwh,
        dollarRatePerKwh: body.dollarRatePerKwh,
      },
    });
    return NextResponse.json(updatedConfig);
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to update configuration." },
      { status: 500 }
    );
  }
}

/**
 * FUNGSI DELETE: Menghapus konfigurasi tagihan.
 * Ini juga akan menghapus perangkat virtual terkait.
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
    // Gunakan transaksi untuk menghapus config dan perangkat virtual terkait
    await prisma.$transaction(async (tx) => {
      const configToDelete = await tx.billConfiguration.findUnique({
        where: { id: params.id },
        select: { publishTargetDeviceId: true },
      });

      if (!configToDelete) {
        throw new Error("Configuration not found.");
      }

      // Hapus config-nya dulu
      await tx.billConfiguration.delete({ where: { id: params.id } });

      // Hapus perangkat virtual-nya
      await tx.deviceExternal.delete({
        where: { id: configToDelete.publishTargetDeviceId },
      });
    });

    return new NextResponse(null, { status: 204 }); // Sukses, tidak ada konten
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to delete configuration." },
      { status: 500 }
    );
  }
}
