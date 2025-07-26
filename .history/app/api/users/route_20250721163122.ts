users; // File: app/api/users/route.ts
import { NextResponse } from "next/server";
import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { getAuth } from "@/lib/auth"; // Helper yang akan kita buat nanti

const prisma = new PrismaClient();

// GET semua pengguna (hanya Admin)
export async function GET(request: Request) {
  // 1. Verifikasi otentikasi dan peran pengguna
  const auth = getAuth(request);
  if (!auth || auth.role !== Role.ADMIN) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  // 2. Ambil semua pengguna dari database
  const users = await prisma.user.findMany({
    // Pilih field yang ingin ditampilkan, jangan sertakan password
    select: {
      id: true,
      email: true,
      role: true,
      fingerprintId: true,
      cardUid: true,
      createdAt: true,
    },
  });
  return NextResponse.json(users);
}

// POST pengguna baru (hanya Admin)
export async function POST(request: Request) {
  // 1. Verifikasi otentikasi dan peran pengguna
  const auth = getAuth(request);
  if (!auth || auth.role !== Role.ADMIN) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    // 2. Ambil data dari body request
    const { email, password, role, fingerprintId, cardUid } =
      await request.json();
    if (!email || !password || !role) {
      return NextResponse.json(
        { message: "Email, password, dan role wajib diisi" },
        { status: 400 }
      );
    }

    // 3. Hash password sebelum disimpan
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4. Buat pengguna baru di database
    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role,
        fingerprintId, // Field opsional
        cardUid, // Field opsional
      },
    });

    // 5. Hapus password dari objek response sebelum dikirim kembali
    const { password: _, ...userWithoutPassword } = newUser;
    return NextResponse.json(userWithoutPassword, { status: 201 });
  } catch (error: any) {
    // Tangani error jika email/fingerprint/kartu sudah ada
    if (error.code === "P2002") {
      return NextResponse.json(
        { message: "Email, Fingerprint, atau Kartu sudah terdaftar" },
        { status: 409 }
      );
    }
    console.error("Create user error:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat membuat pengguna" },
      { status: 500 }
    );
  }
}
