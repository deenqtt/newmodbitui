// File: app/api/users/route.ts
import { NextResponse } from "next/server";
// Hapus impor PrismaClient, kita tidak butuh itu di sini
import { Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { getAuthFromCookie } from "@/lib/auth";

// highlight-start
// GANTI baris 'new PrismaClient()' DENGAN IMPORT DARI lib/prisma
import { prisma } from "@/lib/prisma";
// highlight-end

// GET semua pengguna (hanya Admin)
export async function GET(request: Request) {
  const auth = await getAuthFromCookie(request);
  console.log("Auth from cookie:", auth);
  if (!auth || auth.role !== Role.ADMIN) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  // Sekarang ini menggunakan koneksi yang sama dan efisien
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });
  return NextResponse.json(users);
}

// POST pengguna baru (hanya Admin)
export async function POST(request: Request) {
  const auth = await getAuthFromCookie(request);
  if (!auth || auth.role !== Role.ADMIN) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    const { email, password, role } = await request.json();
    if (!email || !password || !role) {
      return NextResponse.json(
        { message: "Email, password, dan role wajib diisi" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    // Ini juga akan menggunakan koneksi yang efisien
    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role,
      },
    });

    const { password: _, ...userWithoutPassword } = newUser;
    return NextResponse.json(userWithoutPassword, { status: 201 });
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json(
        { message: "Email sudah terdaftar" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { message: "Terjadi kesalahan saat membuat pengguna" },
      { status: 500 }
    );
  }
}
