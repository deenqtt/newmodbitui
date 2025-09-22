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
    const dataPoints = await prisma.layout2DDataPoint.findMany({
      where: { layoutId: params.id },
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
      orderBy: { createdAt: "asc" },
    });

    // Parse selectedKeys from JSON string to array for each data point
    const processedDataPoints = dataPoints.map((dp: any) => ({
      ...dp,
      selectedKeys: dp.selectedKeys ? JSON.parse(dp.selectedKeys) : null,
    }));

    return NextResponse.json(processedDataPoints);
  } catch (error) {
    console.error("[LAYOUT2D_DATAPOINTS_GET]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
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
      layout,
    } = body;

    if (!deviceUniqId || !customName) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    // Check if using multi-key or single-key format
    const isMultiKey =
      selectedKeys && Array.isArray(selectedKeys) && selectedKeys.length > 0;

    if (!isMultiKey && !selectedKey) {
      return new NextResponse(
        "Either selectedKeys or selectedKey must be provided",
        { status: 400 }
      );
    }

    const dataPoint = await prisma.layout2DDataPoint.create({
      data: {
        layoutId: params.id,
        device: {
          connect: { uniqId: deviceUniqId }
        },
        // Store multi-key data as JSON string
        selectedKeys: isMultiKey ? JSON.stringify(selectedKeys) : null,
        // Legacy single-key format for backward compatibility
        selectedKey: !isMultiKey ? selectedKey : null,
        units: units || null,
        multiply: multiply || 1,
        customName,
        positionX: positionX || 50,
        positionY: positionY || 50,
        fontSize: fontSize || 14,
        color: color || "#000000",
        iconName: iconName || null,
        iconColor: iconColor || "#666666",
        showIcon: showIcon || false,
        displayLayout: layout || "vertical",
      },
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

    return NextResponse.json(responseData, { status: 201 });
  } catch (error) {
    console.error("[LAYOUT2D_DATAPOINTS_POST]", error);
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return new NextResponse(
        "Data point already exists for this device and name",
        { status: 400 }
      );
    }
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
