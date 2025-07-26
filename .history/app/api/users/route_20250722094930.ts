// File: app/api/users/route.ts
import { NextResponse } from "next/server";
import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { getAuth } from "@/lib/auth"; // Helper otentikasi kita

const prisma = new PrismaClient();

// GET semua pengguna (hanya Admin)
export async function GET(request: Request) {
  const auth = getAuth(request);
  if (!auth || auth.role !== Role.ADMIN) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    // Pilih field yang ingin ditampilkan, jangan sertakan password
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
  const auth = getAuth(request);
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

    // Hapus password dari objek response sebelum dikirim kembali
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
