// File: app/api/auth/login/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { serialize } from "cookie"; // Impor serialize

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return NextResponse.json(
        { message: "Invalid credentials" },
        { status: 401 }
      );
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: "1d" }
    );

    // Buat cookie yang aman
    const serializedCookie = serialize("authToken", token, {
      httpOnly: true, // Mencegah akses dari JavaScript di client
      secure: process.env.NODE_ENV !== "development", // Gunakan secure di produksi
      sameSite: "strict",
      maxAge: 60 * 60 * 24, // 1 hari
      path: "/",
    });

    // Kirim response dengan header Set-Cookie
    return new Response(JSON.stringify({ message: "Login successful" }), {
      status: 200,
      headers: { "Set-Cookie": serializedCookie },
    });
  } catch (error) {
    return NextResponse.json({ message: "An error occurred" }, { status: 500 });
  }
}

// ========================================================

// File BARU: app/api/auth/logout/route.ts
import { serialize } from "cookie";
import { NextResponse } from "next/server";

export async function POST() {
  // Buat cookie yang sudah kadaluarsa untuk menghapusnya
  const serializedCookie = serialize("authToken", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV !== "development",
    sameSite: "strict",
    maxAge: -1, // Langsung kadaluarsa
    path: "/",
  });

  return new Response(JSON.stringify({ message: "Logout successful" }), {
    status: 200,
    headers: { "Set-Cookie": serializedCookie },
  });
}
