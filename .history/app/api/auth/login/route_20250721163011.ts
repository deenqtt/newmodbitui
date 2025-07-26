// File: app/api/auth/login/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    // 1. Ambil email dan password dari body request
    const { email, password } = await request.json();

    // 2. Cari pengguna berdasarkan email
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Jika pengguna tidak ditemukan, kembalikan error
      return NextResponse.json(
        { message: "Invalid credentials" },
        { status: 401 }
      );
    }

    // 3. Bandingkan password yang diberikan dengan hash di database
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      // Jika password tidak cocok, kembalikan error
      return NextResponse.json(
        { message: "Invalid credentials" },
        { status: 401 }
      );
    }

    // 4. Jika berhasil, buat JWT token
    const token = jwt.sign(
      { userId: user.id, role: user.role }, // Data yang ingin disimpan di dalam token
      process.env.JWT_SECRET!, // Kunci rahasia dari file .env
      { expiresIn: "1d" } // Token akan kadaluarsa dalam 1 hari
    );

    // 5. Kirim token kembali ke client
    return NextResponse.json({ token });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { message: "An error occurred during login" },
      { status: 500 }
    );
  }
}
