import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromCookie } from "@/lib/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; indicatorId: string } }
) {
  const auth = await getAuthFromCookie(request);
  if (!auth || !auth.userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    // Get the original flow indicator
    const originalIndicator = await prisma.layout2DFlowIndicator.findUnique({
      where: { id: params.indicatorId },
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

    if (!originalIndicator) {
      return new NextResponse("Flow indicator not found", { status: 404 });
    }

    // Verify the indicator belongs to the specified layout
    if (originalIndicator.layoutId !== params.id) {
      return new NextResponse("Flow indicator does not belong to this layout", {
        status: 400,
      });
    }

    // Find an available position to avoid unique constraint violation
    let newPositionX = originalIndicator.positionX + 5;
    let newPositionY = originalIndicator.positionY;

    // Check if this position is already taken and find an available one
    let attempts = 0;
    const maxAttempts = 20;

    while (attempts < maxAttempts) {
      const existing = await prisma.layout2DFlowIndicator.findFirst({
        where: {
          layoutId: params.id,
          deviceUniqId: originalIndicator.deviceUniqId,
          selectedKey: originalIndicator.selectedKey,
          positionX: newPositionX,
          positionY: newPositionY,
        },
      });

      if (!existing) {
        break; // Position is available
      }

      // Try next position: increment X by 5
      newPositionX += 5;
      attempts++;

      // If we've tried many X positions, try different Y
      if (attempts > 10) {
        newPositionX = originalIndicator.positionX + 5;
        newPositionY += 5;
      }
    }

    // Create a copy with modified position
    const copiedIndicator = await prisma.layout2DFlowIndicator.create({
      data: {
        layout: {
          connect: { id: params.id },
        },
        device: {
          connect: { uniqId: originalIndicator.deviceUniqId },
        },
        selectedKey: originalIndicator.selectedKey,
        customName: `${originalIndicator.customName} (Copy)`,
        positionX: newPositionX,
        positionY: newPositionY,
        arrowDirection: originalIndicator.arrowDirection,
        logicOperator: originalIndicator.logicOperator,
        compareValue: originalIndicator.compareValue,
        valueType: originalIndicator.valueType,
        trueColor: originalIndicator.trueColor,
        trueAnimation: originalIndicator.trueAnimation,
        falseColor: originalIndicator.falseColor,
        falseAnimation: originalIndicator.falseAnimation,
        warningColor: originalIndicator.warningColor,
        warningAnimation: originalIndicator.warningAnimation,
        warningEnabled: originalIndicator.warningEnabled,
        warningOperator: originalIndicator.warningOperator,
        warningValue: originalIndicator.warningValue,
        useMultiLogic: originalIndicator.useMultiLogic,
        multiLogicConfig: originalIndicator.multiLogicConfig,
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

    return NextResponse.json(copiedIndicator, { status: 201 });
  } catch (error) {
    console.error("[LAYOUT2D_FLOWINDICATOR_COPY]", error);
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
