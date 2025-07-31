// File: app/api/cctv/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// FUNGSI UPDATE (PUT)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { name, ipAddress, port, channel, username, password } = body;

    const updatedCctv = await prisma.cctv.update({
      where: { id: params.id },
      data: {
        name,
        ipAddress,
        port: Number(port),
        channel,
        username,
        // Update password hanya jika diisi, jika tidak, jangan ubah
        ...(password && { password: password }), // Sebaiknya di-hash
      },
    });
    return NextResponse.json(updatedCctv);
  } catch (error) {
    return new NextResponse("Error updating CCTV", { status: 500 });
  }
}

// FUNGSI DELETE
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.cctv.delete({
      where: { id: params.id },
    });
    return new NextResponse(null, { status: 204 }); // 204 No Content
  } catch (error) {
    return new NextResponse("Error deleting CCTV", { status: 500 });
  }
}
