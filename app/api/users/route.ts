// File: app/api/users/route.ts
import { NextResponse } from "next/server";
import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
// Ganti helper lama dengan yang baru
import { getAuthFromCookie } from "@/lib/auth";

const prisma = new PrismaClient();

// GET semua pengguna (hanya Admin)
export async function GET(request: Request) {
  // Gunakan helper baru yang async
  const auth = await getAuthFromCookie(request);
  console.log("Auth from cookie:", auth);
  if (!auth || auth.role !== Role.ADMIN) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

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
