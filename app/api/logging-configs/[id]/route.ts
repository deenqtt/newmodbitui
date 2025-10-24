// File: app/api/logging-configs/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ============================================
// PUT - Update logging configuration
// ============================================
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const {
      customName,
      key,
      units,
      multiply,
      deviceUniqId,
      loggingIntervalMinutes,
    } = body;

    // Validation: Interval range
    if (
      loggingIntervalMinutes &&
      (loggingIntervalMinutes < 1 || loggingIntervalMinutes > 1440)
    ) {
      return NextResponse.json(
        {
          message:
            "Logging interval must be between 1 and 1440 minutes (24 hours).",
        },
        { status: 400 }
      );
    }

    // Check if config exists
    const existingConfig = await prisma.loggingConfiguration.findUnique({
      where: { id: params.id },
    });

    if (!existingConfig) {
      return NextResponse.json(
        { message: "Configuration not found." },
        { status: 404 }
      );
    }

    // Update configuration
    const updatedConfig = await prisma.loggingConfiguration.update({
      where: { id: params.id },
      data: {
        customName,
        key,
        units,
        multiply,
        deviceUniqId,
        ...(loggingIntervalMinutes !== undefined && { loggingIntervalMinutes }),
      },
      include: {
        device: {
          select: {
            uniqId: true,
            name: true,
            topic: true,
          },
        },
      },
    });

    console.log(
      `[API] ✅ Updated logging config: "${customName}" (${params.id})`
    );

    // 🔥 TRIGGER CRON RELOAD
    try {
      const reloadResponse = await fetch(
        "http://localhost:3000/api/cron/reload",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );

      if (reloadResponse.ok) {
        console.log("[API] 🔄 Cron reload triggered successfully");
      } else {
        console.warn(
          "[API] ⚠️  Cron reload request sent but got non-200 response"
        );
      }
    } catch (err: any) {
      console.error("[API] ⚠️  Failed to trigger cron reload:", err.message);
      // Don't fail the main request if reload fails
    }

    return NextResponse.json(updatedConfig);
  } catch (error: any) {
    // Handle unique constraint violation
    if (error.code === "P2002") {
      return NextResponse.json(
        {
          message:
            "A configuration with this device and key combination already exists.",
        },
        { status: 409 }
      );
    }

    console.error(
      `[API] PUT /api/logging-configs/${params.id}: Error updating:`,
      error
    );
    return NextResponse.json(
      { message: "Failed to update configuration." },
      { status: 500 }
    );
  }
}

// ============================================
// DELETE - Delete logging configuration
// ============================================
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Check if config exists
    const existingConfig = await prisma.loggingConfiguration.findUnique({
      where: { id: params.id },
      select: { customName: true },
    });

    if (!existingConfig) {
      return NextResponse.json(
        { message: "Configuration not found." },
        { status: 404 }
      );
    }

    // Delete configuration
    await prisma.loggingConfiguration.delete({
      where: { id: params.id },
    });

    console.log(
      `[API] ✅ Deleted logging config: "${existingConfig.customName}" (${params.id})`
    );

    // 🔥 TRIGGER CRON RELOAD
    try {
      const reloadResponse = await fetch(
        "http://localhost:3000/api/cron/reload",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );

      if (reloadResponse.ok) {
        console.log("[API] 🔄 Cron reload triggered successfully");
      } else {
        console.warn(
          "[API] ⚠️  Cron reload request sent but got non-200 response"
        );
      }
    } catch (err: any) {
      console.error("[API] ⚠️  Failed to trigger cron reload:", err.message);
      // Don't fail the main request if reload fails
    }

    return new NextResponse(null, { status: 204 }); // 204 No Content
  } catch (error) {
    console.error(
      `[API] DELETE /api/logging-configs/${params.id}: Error deleting:`,
      error
    );
    return NextResponse.json(
      { message: "Failed to delete configuration." },
      { status: 500 }
    );
  }
}
