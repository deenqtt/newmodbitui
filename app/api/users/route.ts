// File: app/api/users/route.ts
import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { getAuthFromCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET semua pengguna (hanya Admin)
export async function GET(request: Request) {
  const auth = await getAuthFromCookie(request);
  console.log("Auth from cookie:", auth);
  if (!auth || auth.role !== Role.ADMIN) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      phoneNumber: true, // ✨ Tambahkan ini
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
    // ✨ Tambahkan phoneNumber di sini
    const { email, password, role, phoneNumber } = await request.json();
    if (!email || !password || !role) {
      return NextResponse.json(
        { message: "Email, password, dan role wajib diisi" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role,
        phoneNumber, // ✨ Tambahkan ini
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
    console.error("Error creating user:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat membuat pengguna" },
      { status: 500 }
    );
  }
}
