import { NextResponse } from "next/server";
import { getAuthFromCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PUT (update) node tenant location
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await getAuthFromCookie(request);
  if (!auth) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { name, longitude, latitude, url, topic, description, status, isActive, tenantId } = await request.json();

    const dataToUpdate: any = {};
    if (name !== undefined) dataToUpdate.name = name;
    if (longitude !== undefined) dataToUpdate.longitude = parseFloat(longitude);
    if (latitude !== undefined) dataToUpdate.latitude = parseFloat(latitude);
    if (url !== undefined) dataToUpdate.url = url;
    if (topic !== undefined) dataToUpdate.topic = topic;
    if (description !== undefined) dataToUpdate.description = description;
    if (status !== undefined) dataToUpdate.status = status;
    if (isActive !== undefined) dataToUpdate.isActive = isActive;
    if (tenantId !== undefined) dataToUpdate.tenantId = tenantId;

    const updatedLocation = await prisma.nodeTenantLocation.update({
      where: { id: params.id },
      data: dataToUpdate,
      select: {
        id: true,
        name: true,
        longitude: true,
        latitude: true,
        url: true,
        topic: true,
        description: true,
        status: true,
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

    return NextResponse.json(updatedLocation);
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json(
        { message: "Nama lokasi sudah digunakan oleh lokasi lain" },
        { status: 409 }
      );
    }
    if (error.code === "P2025") {
      return NextResponse.json(
        { message: "Lokasi tidak ditemukan" },
        { status: 404 }
      );
    }
    console.error("Error updating node tenant location:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat mengupdate lokasi" },
      { status: 500 }
    );
  }
}

// DELETE node tenant location
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await getAuthFromCookie(request);
  if (!auth) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    await prisma.nodeTenantLocation.delete({ where: { id: params.id } });
    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    if (error.code === "P2025") {
      return NextResponse.json(
        { message: "Lokasi tidak ditemukan" },
        { status: 404 }
      );
    }
    console.error("Error deleting node tenant location:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat menghapus lokasi" },
      { status: 500 }
    );
  }
}
