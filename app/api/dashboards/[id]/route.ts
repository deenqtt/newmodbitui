// File: app/api/dashboards/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromCookie } from "@/lib/auth";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await getAuthFromCookie(request);
  if (!auth || !auth.userId) {
    // PERBAIKAN: Gunakan auth.userId
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const dashboard = await prisma.dashboardLayout.findUnique({
      where: { id: params.id },
    });

    if (!dashboard || dashboard.userId !== auth.userId) {
      // PERBAIKAN: Gunakan auth.userId
      return new NextResponse("Not Found or Forbidden", { status: 404 });
    }

    const body = await request.json();
    const { name, layout, inUse } = body;

    if (inUse === true) {
      await prisma.dashboardLayout.updateMany({
        where: {
          userId: auth.userId, // PERBAIKAN: Gunakan auth.userId
          id: { not: params.id },
        },
        data: { inUse: false },
      });
    }

    const updatedDashboard = await prisma.dashboardLayout.update({
      where: { id: params.id },
      data: {
        ...(name && { name }),
        ...(layout && { layout }),
        ...(inUse !== undefined && { inUse }),
      },
    });

    return NextResponse.json(updatedDashboard);
  } catch (error) {
    console.error("[DASHBOARD_PUT]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await getAuthFromCookie(request);
  if (!auth || !auth.userId) {
    // PERBAIKAN: Gunakan auth.userId
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const dashboard = await prisma.dashboardLayout.findUnique({
      where: { id: params.id },
    });

    if (!dashboard || dashboard.userId !== auth.userId) {
      // PERBAIKAN: Gunakan auth.userId
      return new NextResponse("Not Found or Forbidden", { status: 404 });
    }

    await prisma.dashboardLayout.delete({
      where: { id: params.id },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[DASHBOARD_DELETE]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

/**
 * GET: Mengambil data satu dashboard spesifik berdasarkan ID.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await getAuthFromCookie(request);
  if (!auth || !auth.userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const dashboard = await prisma.dashboardLayout.findUnique({
      where: { id: params.id },
    });

    // Pastikan user hanya bisa mengambil dashboard miliknya sendiri
    if (!dashboard || dashboard.userId !== auth.userId) {
      return new NextResponse("Not Found or Forbidden", { status: 404 });
    }

    return NextResponse.json(dashboard);
  } catch (error) {
    console.error("[DASHBOARD_GET_BY_ID]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
