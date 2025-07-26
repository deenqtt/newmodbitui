// File: app/api/users/[id]/route.ts
import { NextResponse } from "next/server";
import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { getAuth } from "@/lib/auth";

const prisma = new PrismaClient();

// PUT (update) pengguna (hanya Admin)
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = getAuth(request);
  if (!auth || auth.role !== Role.ADMIN) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    const { email, password, role } = await request.json();

    const dataToUpdate: any = {};

    if (email) dataToUpdate.email = email;
    if (role) dataToUpdate.role = role;

    // Jika ada password baru, hash terlebih dahulu
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

// DELETE pengguna (hanya Admin)
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = getAuth(request);
  if (!auth || auth.role !== Role.ADMIN) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  // Mencegah admin menghapus dirinya sendiri
  if (auth.userId === params.id) {
    return NextResponse.json(
      { message: "Anda tidak dapat menghapus akun Anda sendiri" },
      { status: 400 }
    );
  }

  try {
    await prisma.user.delete({ where: { id: params.id } });
    return new NextResponse(null, { status: 204 }); // Sukses, tidak ada konten
  } catch (error) {
    return NextResponse.json(
      { message: "Terjadi kesalahan saat menghapus pengguna" },
      { status: 500 }
    );
  }
}
