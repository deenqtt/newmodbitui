// File: app/api/devices/access-controllers/[id]/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Handler for PATCH (Update/Edit)
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { name, ipAddress } = body;
    const { id } = params;

    const updatedController = await prisma.accessController.update({
      where: { id },
      data: {
        name,
        ipAddress,
      },
    });

    return NextResponse.json(updatedController);
  } catch (error) {
    console.error("Error updating access controller:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
// Handler untuk GET (Mengambil data satu controller berdasarkan ID)
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const controller = await prisma.accessController.findUnique({
      where: { id },
    });

    if (!controller) {
      return NextResponse.json(
        { error: "Controller not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(controller);
  } catch (error) {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
// Handler for DELETE
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    await prisma.accessController.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Device deleted successfully" });
  } catch (error) {
    console.error("Error deleting access controller:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
