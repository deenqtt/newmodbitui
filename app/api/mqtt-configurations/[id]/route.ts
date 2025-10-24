import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const mqttConfig = await prisma.mQTTConfiguration.findUnique({
      where: { id: params.id },
    });

    if (!mqttConfig) {
      return NextResponse.json(
        {
          success: false,
          error: "Configuration not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: mqttConfig,
    });
  } catch (error) {
    console.error("Error fetching MQTT configuration:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch MQTT configuration",
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Check if another config with same name exists
    const existing = await prisma.mQTTConfiguration.findFirst({
      where: {
        name,
        id: { not: params.id },
      },
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

    const mqttConfig = await prisma.mQTTConfiguration.update({
      where: { id: params.id },
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
    console.error("Error updating MQTT configuration:", error);

    // Check if it's a not found error
    if (error instanceof Error && error.message.includes("Record to update not found")) {
      return NextResponse.json(
        {
          success: false,
          error: "Configuration not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Failed to update MQTT configuration",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.mQTTConfiguration.delete({
      where: { id: params.id },
    });

    return NextResponse.json({
      success: true,
      message: "Configuration deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting MQTT configuration:", error);

    // Check if it's a not found error
    if (error instanceof Error && error.message.includes("Record to delete does not exist")) {
      return NextResponse.json(
        {
          success: false,
          error: "Configuration not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete MQTT configuration",
      },
      { status: 500 }
    );
  }
}
