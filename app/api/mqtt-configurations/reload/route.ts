import { NextResponse } from "next/server";
import { setMQTTSource, getMQTTSource } from "@/lib/mqtt-config";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { source } = body;

    // Validate source parameter
    if (!source || !['env', 'database'].includes(source)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid source. Must be 'env' or 'database'",
        },
        { status: 400 }
      );
    }

    // Set the new MQTT source
    setMQTTSource(source);

    // If switching to database, ensure there's an active configuration
    if (source === 'database') {
      const activeConfig = await prisma.mQTTConfiguration.findFirst({
        where: {
          isActive: true,
          enable: true,
        },
        orderBy: {
          updatedAt: "desc",
        },
      });

      if (!activeConfig) {
        return NextResponse.json(
          {
            success: false,
            error: "No active database configuration found. Please create and activate a configuration first.",
            code: "NO_ACTIVE_DB_CONFIG",
          },
          { status: 400 }
        );
      }
    }

    // Return success with current configuration
    const currentSource = getMQTTSource();
    let currentConfig = null;

    if (currentSource === 'database') {
      // Get active database configuration
      const activeDbConfig = await prisma.mQTTConfiguration.findFirst({
        where: {
          isActive: true,
          enable: true,
        },
        orderBy: {
          updatedAt: "desc",
        },
      });

      if (activeDbConfig) {
        currentConfig = {
          id: activeDbConfig.id,
          name: activeDbConfig.name,
          brokerUrl: activeDbConfig.brokerUrl,
          username: activeDbConfig.username,
          hasPassword: !!activeDbConfig.password,
        };
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully switched to ${source} source`,
      data: {
        source: currentSource,
        config: currentConfig,
        requiresRestart: source === 'env',
      },
    });

  } catch (error) {
    console.error("Error switching MQTT source:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error during source switch",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const source = getMQTTSource();
    let currentConfig = null;

    if (source === 'database') {
      // Get active database configuration
      const activeDbConfig = await prisma.mQTTConfiguration.findFirst({
        where: {
          isActive: true,
          enable: true,
        },
        orderBy: {
          updatedAt: "desc",
        },
      });

      if (activeDbConfig) {
        currentConfig = {
          id: activeDbConfig.id,
          name: activeDbConfig.name,
          brokerUrl: activeDbConfig.brokerUrl,
          username: activeDbConfig.username,
          hasPassword: !!activeDbConfig.password,
          createdAt: activeDbConfig.createdAt,
          updatedAt: activeDbConfig.updatedAt,
        };
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        source,
        config: currentConfig,
        brokerUrl: source === 'env' ? process.env.MQTT_BROKER_URL : currentConfig?.brokerUrl,
        requiresRestart: source === 'env',
      },
    });

  } catch (error) {
    console.error("Error fetching current MQTT config:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch current configuration",
      },
      { status: 500 }
    );
  }
}
