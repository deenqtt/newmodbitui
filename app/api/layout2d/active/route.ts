import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromCookie } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const auth = await getAuthFromCookie(request);
  if (!auth || !auth.userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const activeLayout = await prisma.layout2D.findFirst({
      where: { isUse: true },
    });

    if (!activeLayout) {
      return new NextResponse("No active layout found", { status: 404 });
    }

    return NextResponse.json(activeLayout);
  } catch (error) {
    console.error("[LAYOUT2D_ACTIVE_GET]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await getAuthFromCookie(request);
  if (!auth || !auth.userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return new NextResponse("Layout ID is required", { status: 400 });
    }

    // Deactivate all layouts first
    await prisma.layout2D.updateMany({
      data: { isUse: false }
    });

    // Activate the selected layout
    const updatedLayout = await prisma.layout2D.update({
      where: { id },
      data: { isUse: true },
    });

    return NextResponse.json(updatedLayout);
  } catch (error) {
    console.error("[LAYOUT2D_ACTIVE_POST]", error);
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2025"
    ) {
      return new NextResponse("Layout not found", { status: 404 });
    }
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}