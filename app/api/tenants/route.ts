import { NextResponse } from "next/server";
import { getAuthFromCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET semua tenants
export async function GET(request: Request) {
  const auth = await getAuthFromCookie(request);
  if (!auth) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const tenants = await prisma.tenant.findMany({
      orderBy: { createdAt: "desc" },
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

    return NextResponse.json(tenants);
  } catch (error) {
    console.error("Error fetching tenants:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat mengambil data tenant" },
      { status: 500 }
    );
  }
}

// POST tenant baru
export async function POST(request: Request) {
  const auth = await getAuthFromCookie(request);
  if (!auth) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { name, company, email, phone, address, status, notes } = await request.json();

    if (!name || !email) {
      return NextResponse.json(
        { message: "Nama dan email wajib diisi" },
        { status: 400 }
      );
    }

    const newTenant = await prisma.tenant.create({
      data: {
        name,
        company,
        email,
        phone,
        address,
        status: status || "active",
        notes,
      },
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

    return NextResponse.json(newTenant, { status: 201 });
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json(
        { message: "Nama atau email tenant sudah terdaftar" },
        { status: 409 }
      );
    }
    console.error("Error creating tenant:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat membuat tenant" },
      { status: 500 }
    );
  }
}
