// File: app/api/users/[id]/route.ts
import { NextResponse } from "next/server";
// Hapus 'PrismaClient' dari impor di sini
import { Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { getAuthFromCookie } from "@/lib/auth";

// highlight-start
// GANTI baris 'new PrismaClient()' DENGAN IMPORT DARI lib/prisma
import { prisma } from "@/lib/prisma";
// highlight-end

// PUT (update) pengguna
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await getAuthFromCookie(request);
  if (!auth) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    // ✨ Tambahkan phoneNumber di sini
    const { email, password, role, phoneNumber } = await request.json();
    const dataToUpdate: any = {};

    if (email) dataToUpdate.email = email;
    if (role) dataToUpdate.role = role;
    if (phoneNumber !== undefined) {
      dataToUpdate.phoneNumber = phoneNumber;
    }

    if (password) {
      dataToUpdate.password = await bcrypt.hash(password, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id: params.id },
      data: dataToUpdate,
    });

    const { password: _, ...userWithoutPassword } = updatedUser;
    return NextResponse.json(userWithoutPassword);
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json(
        { message: "Email sudah terdaftar pada pengguna lain" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { message: "Terjadi kesalahan saat mengupdate pengguna" },
      { status: 500 }
    );
  }
}

// DELETE pengguna
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await getAuthFromCookie(request);
  if (!auth) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (auth.userId === params.id) {
    return NextResponse.json(
      { message: "Anda tidak dapat menghapus akun Anda sendiri" },
      { status: 400 }
    );
  }

  try {
    await prisma.user.delete({ where: { id: params.id } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return NextResponse.json(
      { message: "Terjadi kesalahan saat menghapus pengguna" },
      { status: 500 }
    );
  }
}
