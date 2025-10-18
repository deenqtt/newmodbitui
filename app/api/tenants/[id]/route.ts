import { NextResponse } from "next/server";
import { getAuthFromCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PUT (update) tenant
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await getAuthFromCookie(request);
  if (!auth) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { name, company, email, phone, address, status, isActive, notes } = await request.json();

    const dataToUpdate: any = {};
    if (name !== undefined) dataToUpdate.name = name;
    if (company !== undefined) dataToUpdate.company = company;
    if (email !== undefined) dataToUpdate.email = email;
    if (phone !== undefined) dataToUpdate.phone = phone;
    if (address !== undefined) dataToUpdate.address = address;
    if (status !== undefined) dataToUpdate.status = status;
    if (isActive !== undefined) dataToUpdate.isActive = isActive;
    if (notes !== undefined) dataToUpdate.notes = notes;

    const updatedTenant = await prisma.tenant.update({
      where: { id: params.id },
      data: dataToUpdate,
      select: {
        id: true,
        name: true,
        company: true,
        email: true,
        phone: true,
        address: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        isActive: true,
        notes: true,
      },
    });

    return NextResponse.json(updatedTenant);
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json(
        { message: "Nama atau email tenant sudah digunakan oleh tenant lain" },
        { status: 409 }
      );
    }
    if (error.code === "P2025") {
      return NextResponse.json(
        { message: "Tenant tidak ditemukan" },
        { status: 404 }
      );
    }
    console.error("Error updating tenant:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat mengupdate tenant" },
      { status: 500 }
    );
  }
}

// DELETE tenant
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await getAuthFromCookie(request);
  if (!auth) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    await prisma.tenant.delete({ where: { id: params.id } });
    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    if (error.code === "P2025") {
      return NextResponse.json(
        { message: "Tenant tidak ditemukan" },
        { status: 404 }
      );
    }
    console.error("Error deleting tenant:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat menghapus tenant" },
      { status: 500 }
    );
  }
}
