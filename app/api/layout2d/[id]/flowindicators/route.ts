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
    const flowIndicators = await prisma.layout2DFlowIndicator.findMany({
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

    return NextResponse.json(flowIndicators);
  } catch (error) {
    console.error("[LAYOUT2D_FLOWINDICATORS_GET]", error);
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

    if (!deviceUniqId || !selectedKey || !customName || !logicOperator || compareValue === undefined) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    const flowIndicator = await prisma.layout2DFlowIndicator.create({
      data: {
        layoutId: params.id,
        deviceUniqId,
        selectedKey,
        customName,
        positionX: positionX || 50,
        positionY: positionY || 50,
        arrowDirection: arrowDirection || "right",
        logicOperator,
        compareValue: String(compareValue),
        valueType: valueType || "number",
        trueColor: trueColor || "#22c55e",
        trueAnimation: trueAnimation !== undefined ? trueAnimation : true,
        falseColor: falseColor || "#ef4444",
        falseAnimation: falseAnimation !== undefined ? falseAnimation : false,
        warningColor: warningColor || "#f59e0b",
        warningAnimation: warningAnimation !== undefined ? warningAnimation : true,
        warningEnabled: warningEnabled || false,
        warningOperator: warningOperator || null,
        warningValue: warningValue || null,
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

    return NextResponse.json(flowIndicator, { status: 201 });
  } catch (error) {
    console.error("[LAYOUT2D_FLOWINDICATORS_POST]", error);
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return new NextResponse(
        "Flow indicator already exists at this position",
        { status: 400 }
      );
    }
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
