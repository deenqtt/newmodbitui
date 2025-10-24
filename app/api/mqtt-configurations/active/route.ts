import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Get the active and enabled MQTT configuration
    const activeConfig = await prisma.mQTTConfiguration.findFirst({
      where: {
        isActive: true,
        enable: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    if (activeConfig) {
      return NextResponse.json({
        success: true,
        data: {
          id: activeConfig.id,
          name: activeConfig.name,
          brokerUrl: activeConfig.brokerUrl,
          username: activeConfig.username,
          password: activeConfig.password,
        },
      });
    } else {
      // No active configuration found, return error
      return NextResponse.json(
        {
          success: false,
          error: "No active MQTT configuration found",
          code: "NO_ACTIVE_CONFIG",
        },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error("Error fetching active MQTT configuration:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch active MQTT configuration",
      },
      { status: 500 }
    );
  }
}
