import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const mqttConfigs = await prisma.mQTTConfiguration.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      data: mqttConfigs,
    });
  } catch (error) {
    console.error("Error fetching MQTT configurations:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch MQTT configurations",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, brokerUrl, username, password, isActive, enable } = body;

    if (!name || !brokerUrl) {
      return NextResponse.json(
        {
          success: false,
          error: "Name and broker URL are required",
        },
        { status: 400 }
      );
    }

    // Check if name already exists
    const existing = await prisma.mQTTConfiguration.findUnique({
      where: { name },
    });

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: "Configuration name already exists",
        },
        { status: 400 }
      );
    }

    // If setting isActive=true, disable all other configurations
    if (isActive) {
      await prisma.mQTTConfiguration.updateMany({
        where: { isActive: true },
        data: { isActive: false },
      });
    }

    const mqttConfig = await prisma.mQTTConfiguration.create({
      data: {
        name,
        brokerUrl,
        username: username || null,
        password: password || null,
        isActive: isActive || false,
        enable: enable !== undefined ? enable : true,
      },
    });

    return NextResponse.json({
      success: true,
      data: mqttConfig,
    });
  } catch (error) {
    console.error("Error creating MQTT configuration:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create MQTT configuration",
      },
      { status: 500 }
    );
  }
}
