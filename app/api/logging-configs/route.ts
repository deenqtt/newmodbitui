// File: app/api/logging-configs/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ============================================
// GET - Fetch all logging configurations
// ============================================
export async function GET() {
  try {
    const configs = await prisma.loggingConfiguration.findMany({
      orderBy: { customName: "asc" },
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

    return NextResponse.json(configs);
  } catch (error) {
    console.error(
      "[API] GET /api/logging-configs: Error fetching data:",
      error
    );
    return NextResponse.json(
      { message: "Failed to fetch configurations." },
      { status: 500 }
    );
  }
}

// ============================================
// POST - Create new logging configuration
// ============================================
export async function POST(request: Request) {
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

    // Validation: Required fields
    if (!customName || !key || !deviceUniqId) {
      console.error("[API] POST /api/logging-configs: Missing required fields");
      return NextResponse.json(
        { message: "Missing required fields: customName, key, deviceUniqId" },
        { status: 400 }
      );
    }

    // Validation: Check if device exists
    const deviceExists = await prisma.deviceExternal.findUnique({
      where: { uniqId: deviceUniqId },
    });

    if (!deviceExists) {
      console.error(
        `[API] POST /api/logging-configs: Device '${deviceUniqId}' not found`
      );
      return NextResponse.json(
        {
          message: `Device with ID '${deviceUniqId}' not found. Please ensure the device is registered.`,
        },
        { status: 404 }
      );
    }

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

    // Create configuration
    const newConfig = await prisma.loggingConfiguration.create({
      data: {
        customName,
        key,
        units,
        multiply: multiply || 1,
        deviceUniqId,
        loggingIntervalMinutes: loggingIntervalMinutes || 10,
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
      `[API] ✅ Created logging config: "${customName}" with ${
        loggingIntervalMinutes || 10
      }min interval`
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

    return NextResponse.json(newConfig, { status: 201 });
  } catch (error: any) {
    // Handle unique constraint violation (duplicate device + key)
    if (error.code === "P2002") {
      console.warn(
        "[API] POST /api/logging-configs: Duplicate configuration detected"
      );
      return NextResponse.json(
        {
          message:
            "A configuration with this device and key combination already exists.",
        },
        { status: 409 }
      );
    }

    console.error(
      "[API] POST /api/logging-configs: Error creating configuration:",
      error
    );
    return NextResponse.json(
      { message: "Failed to create configuration." },
      { status: 500 }
    );
  }
}
