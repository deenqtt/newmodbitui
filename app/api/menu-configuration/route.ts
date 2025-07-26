// File: app/api/menu-configuration/route.ts

import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromCookie } from "@/lib/auth"; // Sesuaikan jika perlu
import { Role } from "@prisma/client";

/**
 * GET: Mengambil satu-satunya konfigurasi menu yang ada.
 */
export async function GET(request: NextRequest) {
  const auth = await getAuthFromCookie(request);
  if (!auth) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const menuConfig = await prisma.menuConfiguration.findFirst();

    // Jika tidak ada konfigurasi, kembalikan null agar frontend tahu harus menampilkan data default.
    if (!menuConfig) {
      return NextResponse.json(null);
    }

    // Kembalikan hanya field 'structure' karena itu yang dibutuhkan frontend.
    return NextResponse.json(menuConfig.structure);
  } catch (error: any) {
    return NextResponse.json(
      { message: "Failed to fetch menu configuration.", error: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST: Menyimpan konfigurasi menu (Upsert: Update jika ada, Create jika tidak ada).
 * Ini menyederhanakan logika di frontend, cukup satu tombol "Save".
 */
export async function POST(request: NextRequest) {
  const auth = await getAuthFromCookie(request);
  if (!auth || auth.role !== Role.ADMIN) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();

    // Cari dulu apakah sudah ada konfigurasi
    const existingConfig = await prisma.menuConfiguration.findFirst();

    let savedConfig;
    if (existingConfig) {
      // Jika sudah ada, update
      savedConfig = await prisma.menuConfiguration.update({
        where: { id: existingConfig.id },
        data: { structure: body },
      });
    } else {
      // Jika belum ada, buat baru
      savedConfig = await prisma.menuConfiguration.create({
        data: { structure: body },
      });
    }

    return NextResponse.json(savedConfig.structure, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { message: "Failed to save menu configuration.", error: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE: Menghapus satu-satunya konfigurasi menu.
 */
export async function DELETE(request: NextRequest) {
  const auth = await getAuthFromCookie(request);
  if (!auth || auth.role !== Role.ADMIN) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    // Karena hanya ada satu, kita bisa hapus semua yang cocok (hanya akan ada 1 atau 0)
    await prisma.menuConfiguration.deleteMany();

    // Beri respons sukses tanpa konten
    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    return NextResponse.json(
      { message: "Failed to delete menu configuration.", error: error.message },
      { status: 500 }
    );
  }
}
