// File: app/api/auth/login/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { serialize } from "cookie";

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return NextResponse.json(
        { message: "Invalid credentials" },
        { status: 401 }
      );
    }

    const role = await prisma.role.findUnique({
      where: { id: user.roleId! }
    });
    const roleName = role?.name || 'user';
    const token = jwt.sign(
      { userId: user.id, role: roleName, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: "1d" }
    );

    const serializedCookie = serialize("authToken", token, {
      httpOnly: true,
      secure: false,
      sameSite: "strict",
      maxAge: 60 * 60 * 24, // 1 hari
      path: "/",
    });

    // Kirim response dengan header Set-Cookie DAN token di body
    return new Response(
      JSON.stringify({ message: "Login successful", token }),
      {
        status: 200,
        headers: { "Set-Cookie": serializedCookie },
      }
    );
  } catch (error) {
    return NextResponse.json({ message: "An error occurred" }, { status: 500 });
  }
}
