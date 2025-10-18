import { NextResponse } from "next/server";
import { getAuthFromCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET semua node tenant locations
export async function GET(request: Request) {
  const auth = await getAuthFromCookie(request);
  if (!auth) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const locations = await prisma.nodeTenantLocation.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        longitude: true,
        latitude: true,
        url: true,
        topic: true,
        description: true,
        status: true,
        nodeType: true,
        tenantId: true,
        createdAt: true,
        updatedAt: true,
        isActive: true,
        tenant: {
          select: {
            id: true,
            name: true,
            company: true,
          },
        },
      },
    });

    return NextResponse.json(locations);
  } catch (error) {
    console.error("Error fetching node tenant locations:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat mengambil data lokasi" },
      { status: 500 }
    );
  }
}

// POST node tenant location baru
export async function POST(request: Request) {
  const auth = await getAuthFromCookie(request);
  if (!auth) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { name, longitude, latitude, url, topic, description, status, tenantId } = await request.json();

    if (!name || longitude === undefined || latitude === undefined) {
      return NextResponse.json(
        { message: "Nama, longitude, dan latitude wajib diisi" },
        { status: 400 }
      );
    }

    const newLocation = await prisma.nodeTenantLocation.create({
      data: {
        name,
        longitude: parseFloat(longitude),
        latitude: parseFloat(latitude),
        url,
        topic,
        description,
        status: status || "active",
        tenantId: tenantId || "",
      },
      select: {
        id: true,
        name: true,
        longitude: true,
        latitude: true,
        url: true,
        topic: true,
        description: true,
        status: true,
        nodeType: true,
        tenantId: true,
        createdAt: true,
        updatedAt: true,
        isActive: true,
        tenant: {
          select: {
            id: true,
            name: true,
            company: true,
          },
        },
      },
    });

    return NextResponse.json(newLocation, { status: 201 });
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json(
        { message: "Nama lokasi sudah terdaftar" },
        { status: 409 }
      );
    }
    console.error("Error creating node tenant location:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat membuat lokasi" },
      { status: 500 }
    );
  }
}
