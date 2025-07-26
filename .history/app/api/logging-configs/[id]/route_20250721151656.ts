// File: app/api/logging-configs/[id]/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// FUNGSI PUT: Mengupdate konfigurasi berdasarkan ID
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  console.log(
    `\n[API] PUT /api/logging-configs/${params.id}: Menerima permintaan update...`
  );
  try {
    const body = await request.json();
    console.log(
      `[API] PUT /api/logging-configs/${params.id}: Body permintaan diterima:`,
      body
    );
    const { customName, key, units, multiply, deviceUniqId } = body;

    const updatedConfig = await prisma.loggingConfiguration.update({
      where: { id: params.id },
      data: { customName, key, units, multiply, deviceUniqId },
    });
    console.log(
      `[API] PUT /api/logging-configs/${params.id}: Berhasil mengupdate konfigurasi.`
    );
    return NextResponse.json(updatedConfig);
  } catch (error) {
    console.error(
      `[API] PUT /api/logging-configs/${params.id}: Gagal mengupdate konfigurasi:`,
      error
    );
    return NextResponse.json(
      { message: "Gagal mengupdate konfigurasi." },
      { status: 500 }
    );
  }
}

// FUNGSI DELETE: Menghapus konfigurasi berdasarkan ID
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  console.log(
    `\n[API] DELETE /api/logging-configs/${params.id}: Menerima permintaan hapus...`
  );
  try {
    await prisma.loggingConfiguration.delete({
      where: { id: params.id },
    });
    console.log(
      `[API] DELETE /api/logging-configs/${params.id}: Berhasil menghapus konfigurasi.`
    );
    return new NextResponse(null, { status: 204 }); // 204 = No Content (sukses)
  } catch (error) {
    console.error(
      `[API] DELETE /api/logging-configs/${params.id}: Gagal menghapus konfigurasi:`,
      error
    );
    return NextResponse.json(
      { message: "Gagal menghapus konfigurasi." },
      { status: 500 }
    );
  }
}
