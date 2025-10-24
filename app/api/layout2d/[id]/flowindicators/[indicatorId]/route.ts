import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromCookie } from "@/lib/auth";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; indicatorId: string } }
) {
  const auth = await getAuthFromCookie(request);
  if (!auth || !auth.userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      deviceUniqId,
      selectedKey,
      customName,
      positionX,
      positionY,
      arrowDirection,
      logicOperator,
      compareValue,
      valueType,
      trueColor,
      trueAnimation,
      falseColor,
      falseAnimation,
      warningColor,
      warningAnimation,
      warningEnabled,
      warningOperator,
      warningValue,
    } = body;

    // Prepare update data
    const updateData: any = {
      selectedKey,
      customName,
      positionX,
      positionY,
      arrowDirection,
      logicOperator,
      compareValue: String(compareValue),
      valueType,
      trueColor,
      trueAnimation,
      falseColor,
      falseAnimation,
      warningColor,
      warningAnimation,
      warningEnabled,
      warningOperator,
      warningValue,
    };

    // Only include device relation update if deviceUniqId is provided and different
    if (deviceUniqId) {
      updateData.device = {
        connect: { uniqId: deviceUniqId }
      };
    }

    const flowIndicator = await prisma.layout2DFlowIndicator.update({
      where: { id: params.indicatorId },
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

    return NextResponse.json(flowIndicator);
  } catch (error) {
    console.error("[LAYOUT2D_FLOWINDICATOR_PUT]", error);
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2025"
    ) {
      return new NextResponse("Flow indicator not found", { status: 404 });
    }
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; indicatorId: string } }
) {
  const auth = await getAuthFromCookie(request);
  if (!auth || !auth.userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    await prisma.layout2DFlowIndicator.delete({
      where: { id: params.indicatorId },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[LAYOUT2D_FLOWINDICATOR_DELETE]", error);
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2025"
    ) {
      return new NextResponse("Flow indicator not found", { status: 404 });
    }
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}