import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromCookie } from "@/lib/auth";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; datapointId: string } }
) {
  const auth = await getAuthFromCookie(request);
  if (!auth || !auth.userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      deviceUniqId,
      selectedKeys, // New multi-key format
      selectedKey, // Legacy single-key format
      units,
      multiply,
      customName,
      positionX,
      positionY,
      fontSize,
      color,
      iconName,
      iconColor,
      showIcon,
      displayLayout: layout,
    } = body;

    // Check if using multi-key or single-key format
    const isMultiKey =
      selectedKeys && Array.isArray(selectedKeys) && selectedKeys.length > 0;

    // Prepare update data - only include deviceUniqId if it's being changed
    const updateData: any = {
      // Store multi-key data as JSON string
      selectedKeys: isMultiKey ? JSON.stringify(selectedKeys) : null,
      // Legacy single-key format for backward compatibility
      selectedKey: !isMultiKey ? selectedKey : null,
      units,
      multiply,
      customName,
      positionX,
      positionY,
      fontSize,
      color,
      iconName,
      iconColor,
      showIcon,
      displayLayout: layout,
    };

    // Only include device relation update if deviceUniqId is provided and different
    if (deviceUniqId) {
      updateData.device = {
        connect: { uniqId: deviceUniqId }
      };
    }

    const dataPoint = await prisma.layout2DDataPoint.update({
      where: { id: params.datapointId },
      data: updateData,
      include: {
        device: {
          select: {
            uniqId: true,
            name: true,
            topic: true,
            lastPayload: true,
            lastUpdatedByMqtt: true,
          },
        },
      },
    });

    // Parse selectedKeys back to array for response
    const responseData = {
      ...dataPoint,
      selectedKeys: dataPoint.selectedKeys
        ? JSON.parse(dataPoint.selectedKeys)
        : null,
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("[LAYOUT2D_DATAPOINT_PUT]", error);
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2025"
    ) {
      return new NextResponse("Data point not found", { status: 404 });
    }
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; datapointId: string } }
) {
  const auth = await getAuthFromCookie(request);
  if (!auth || !auth.userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    await prisma.layout2DDataPoint.delete({
      where: { id: params.datapointId },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[LAYOUT2D_DATAPOINT_DELETE]", error);
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2025"
    ) {
      return new NextResponse("Data point not found", { status: 404 });
    }
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
