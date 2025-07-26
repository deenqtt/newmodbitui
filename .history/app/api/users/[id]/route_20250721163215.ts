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
  // 1. Verifikasi otentikasi dan peran pengguna
  const auth = getAuth(request);
  if (!auth || auth.role !== Role.ADMIN) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    // 2. Ambil data dari body request
    const { email, password, role, fingerprintId, cardUid } =
      await request.json();

    // 3. Siapkan objek data yang akan diupdate secara dinamis
    const dataToUpdate: any = {};

    if (email) dataToUpdate.email = email;
    if (role) dataToUpdate.role = role;

    // Memperbolehkan untuk mengosongkan fingerprint atau card dengan mengirimkan null
    if (fingerprintId !== undefined) dataToUpdate.fingerprintId = fingerprintId;
    if (cardUid !== undefined) dataToUpdate.cardUid = cardUid;

    // Jika ada password baru, hash terlebih dahulu
    if (password) {
      dataToUpdate.password = await bcrypt.hash(password, 10);
    }

    // 4. Update pengguna di database
    const updatedUser = await prisma.user.update({
      where: { id: params.id },
      data: dataToUpdate,
    });

    // 5. Hapus password dari objek response
    const { password: _, ...userWithoutPassword } = updatedUser;
    return NextResponse.json(userWithoutPassword);
  } catch (error: any) {
    // Tangani error jika email/fingerprint/kartu duplikat
    if (error.code === "P2002") {
      return NextResponse.json(
        {
          message:
            "Email, Fingerprint, atau Kartu sudah terdaftar pada pengguna lain",
        },
        { status: 409 }
      );
    }
    console.error("Update user error:", error);
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
  // 1. Verifikasi otentikasi dan peran pengguna
  const auth = getAuth(request);
  if (!auth || auth.role !== Role.ADMIN) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  // 2. Mencegah admin menghapus dirinya sendiri
  if (auth.userId === params.id) {
    return NextResponse.json(
      { message: "Anda tidak dapat menghapus akun Anda sendiri" },
      { status: 400 }
    );
  }

  try {
    // 3. Hapus pengguna dari database
    await prisma.user.delete({ where: { id: params.id } });
    return new NextResponse(null, { status: 204 }); // 204: Sukses, tidak ada konten
  } catch (error) {
    console.error("Delete user error:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat menghapus pengguna" },
      { status: 500 }
    );
  }
}
