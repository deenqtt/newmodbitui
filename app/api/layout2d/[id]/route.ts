import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromCookie } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await getAuthFromCookie(request);
  if (!auth || !auth.userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const layout = await prisma.layout2D.findUnique({
      where: { id: params.id },
      include: {
        dataPoints: {
          include: {
            device: {
              select: {
                uniqId: true,
                name: true,
                topic: true,
                lastPayload: true,
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!layout) {
      return new NextResponse("Layout not found", { status: 404 });
    }

    // Parse selectedKeys for each data point
    const processedLayout = {
      ...layout,
      dataPoints: layout.dataPoints.map((dp: any) => ({
        ...dp,
        selectedKeys: dp.selectedKeys ? JSON.parse(dp.selectedKeys) : null,
      })),
    };

    return NextResponse.json(processedLayout);
  } catch (error) {
    console.error("[LAYOUT2D_GET_BY_ID]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await getAuthFromCookie(request);
  if (!auth || !auth.userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, isUse, image } = body;

    const layout = await prisma.layout2D.update({
      where: { id: params.id },
      data: {
        ...(name && { name }),
        ...(isUse !== undefined && { isUse }),
        ...(image !== undefined && { image }),
      },
    });

    return NextResponse.json(layout);
  } catch (error) {
    console.error("[LAYOUT2D_PUT]", error);
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2025"
    ) {
      return new NextResponse("Layout not found", { status: 404 });
    }
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return new NextResponse("Layout name already exists", { status: 400 });
    }
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await getAuthFromCookie(request);
  if (!auth || !auth.userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    // Delete all data points first (cascade delete should handle this, but let's be explicit)
    await prisma.layout2DDataPoint.deleteMany({
      where: { layoutId: params.id },
    });

    // Delete the layout
    await prisma.layout2D.delete({
      where: { id: params.id },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[LAYOUT2D_DELETE]", error);
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
