// File: app/api/zkteco/devices/[id]/route.ts
// Deskripsi: API untuk mengelola perangkat ZKTeco individual (Update & Delete).

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromCookie } from "@/lib/auth";
import { Role } from "@prisma/client";

/**
 * FUNGSI PUT: Memperbarui (mengedit) konfigurasi perangkat ZKTeco.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await getAuthFromCookie(request);
  if (!auth || auth.role !== Role.ADMIN) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  try {
    const body = await request.json();
    const { name, ipAddress, port, topicIdentifier } = body;
    const { id } = params;

    if (!name || !ipAddress || !port || !topicIdentifier) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    const updatedDevice = await prisma.zkTecoDevice.update({
      where: { id },
      data: {
        name,
        ipAddress,
        port: parseInt(port, 10),
        topicIdentifier,
      },
    });

    return NextResponse.json(updatedDevice);
  } catch (error: any) {
    // ... (Error handling bisa ditambahkan seperti di POST)
    console.error(`[ZKTECO_DEVICE_PUT]`, error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

/**
 * FUNGSI DELETE: Menghapus konfigurasi perangkat ZKTeco.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await getAuthFromCookie(request);
  if (!auth || auth.role !== Role.ADMIN) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  try {
    const { id } = params;
    await prisma.zkTecoDevice.delete({
      where: { id },
    });
    return new NextResponse(null, { status: 204 }); // 204 No Content = Sukses
  } catch (error: any) {
    console.error(`[ZKTECO_DEVICE_DELETE]`, error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
