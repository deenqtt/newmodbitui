// File: app/api/devices/external/[id]/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// FUNGSI UPDATE (PUT)
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { name, topic, address } = await request.json();
    const updatedDevice = await prisma.deviceExternal.update({
      where: { id: params.id },
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

// FUNGSI DELETE
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.deviceExternal.delete({
      where: { id: params.id },
    });
    return new NextResponse(null, { status: 204 }); // 204 = No Content
  } catch (error) {
    return NextResponse.json(
      { message: "Error deleting device" },
      { status: 500 }
    );
  }
}
