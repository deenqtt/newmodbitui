// File: app/api/logging-configs/[id]/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// FUNGSI PUT: Mengupdate konfigurasi berdasarkan ID
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { customName, key, units, multiply, deviceUniqId } = body;

    const updatedConfig = await prisma.loggingConfiguration.update({
      where: { id: params.id },
      data: { customName, key, units, multiply, deviceUniqId },
    });
    return NextResponse.json(updatedConfig);
  } catch (error) {
    console.error(`Failed to update config ${params.id}:`, error);
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
  try {
    await prisma.loggingConfiguration.delete({
      where: { id: params.id },
    });
    return new NextResponse(null, { status: 204 }); // 204 = No Content (sukses)
  } catch (error) {
    console.error(`Failed to delete config ${params.id}:`, error);
    return NextResponse.json(
      { message: "Gagal menghapus konfigurasi." },
      { status: 500 }
    );
  }
}
