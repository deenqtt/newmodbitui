// File: app/api/devices/external/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromCookie } from "@/lib/auth";

/**
 * FUNGSI GET: Mengambil 'topic' berdasarkan 'uniqId'.
 * Di sini, 'params.id' dari URL akan kita anggap sebagai 'uniqId'
 * karena widget akan memanggil endpoint ini dengan uniqId-nya.
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await getAuthFromCookie(request);
  if (!auth) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const uniqId = params.id; // Anggap parameter URL adalah uniqId

  if (!uniqId) {
    return NextResponse.json(
      { message: "Device uniqId is required" },
      { status: 400 }
    );
  }

  try {
    const device = await prisma.deviceExternal.findUnique({
      where: {
        uniqId: uniqId,
      },
      // Kita hanya butuh topic untuk efisiensi
      select: {
        topic: true,
      },
    });

    if (!device) {
      return NextResponse.json(
        { message: "Device not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(device);
  } catch (error) {
    console.error(`Error fetching device ${uniqId}:`, error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * FUNGSI UPDATE (PUT): Mengubah data berdasarkan 'id' database.
 * Halaman manajemen akan memanggil endpoint ini dengan id database.
 */
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  // Check if user has permission to update devices
  const { requirePermission } = await import('@/lib/auth');
  try {
    await requirePermission(request, 'devices', 'update');
  } catch (error) {
    return NextResponse.json({ message: "Forbidden - Insufficient permissions" }, { status: 403 });
  }

  try {
    const { name, topic, address } = await request.json();
    const updatedDevice = await prisma.deviceExternal.update({
      where: { id: params.id }, // Di sini, parameter URL adalah 'id' database
      data: { name, topic, address },
    });
    return NextResponse.json(updatedDevice);
  } catch (error) {
    // Handle error (misal: topic duplikat)
    return NextResponse.json(
      { message: "Error updating device" },
      { status: 500 }
    );
  }
}

/**
 * FUNGSI DELETE: Menghapus data berdasarkan 'id' database.
 * Halaman manajemen akan memanggil endpoint ini dengan id database.
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  // Check if user has permission to delete devices
  const { requirePermission } = await import('@/lib/auth');
  try {
    await requirePermission(request, 'devices', 'delete');
  } catch (error) {
    return NextResponse.json({ message: "Forbidden - Insufficient permissions" }, { status: 403 });
  }

  try {
    await prisma.deviceExternal.delete({
      where: { id: params.id }, // Di sini, parameter URL adalah 'id' database
    });
    return new NextResponse(null, { status: 204 }); // 204 = No Content
  } catch (error) {
    return NextResponse.json(
      { message: "Error deleting device" },
      { status: 500 }
    );
  }
}
