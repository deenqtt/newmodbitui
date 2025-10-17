// File: app/api/users/route.ts
import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { getAuthFromCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET semua pengguna (tanpa batasan role - untuk semua user terotentikasi)
export async function GET(request: Request) {
  const auth = await getAuthFromCookie(request);
  console.log("Auth from cookie:", auth);
  if (!auth) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  // Tidak ada batasan role - semua user terotentikasi bisa mengakses ini

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      phoneNumber: true, // ✨ Tambahkan ini
      role_data: { // Use the correct relation name
        select: {
          id: true,
          name: true,
          description: true,
        },
      },
      createdAt: true,
    },
  });

  // Transform to match expected format
  const transformedUsers = users.map(user => ({
    id: user.id,
    email: user.email,
    phoneNumber: user.phoneNumber,
    role: user.role_data, // Rename back to role for frontend
    createdAt: user.createdAt,
  }));
  return NextResponse.json(transformedUsers);
}

// POST pengguna baru (hanya Admin - Tetap ada role check untuk create)
export async function POST(request: Request) {
  const auth = await getAuthFromCookie(request);
  if (!auth || auth.role !== "ADMIN") { // Directly compare with string instead of enum
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    // ✨ Tambahkan phoneNumber di sini
    const { email, password, roleId, phoneNumber } = await request.json(); // Rename role to roleId
    if (!email || !password || !roleId) {
      return NextResponse.json(
        { message: "Email, password, dan roleId wajib diisi" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        roleId, // Use roleId instead of role
        phoneNumber, // ✨ Tambahkan ini
      },
      select: { // Select fields to return, excluding password
        id: true,
        email: true,
        phoneNumber: true,
        role_data: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
        createdAt: true,
      },
    });

    // Transform to match expected format
    const transformedUser = {
      id: newUser.id,
      email: newUser.email,
      phoneNumber: newUser.phoneNumber,
      role: newUser.role_data, // Rename back to role for frontend
      createdAt: newUser.createdAt,
    };

    return NextResponse.json(transformedUser, { status: 201 });
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
