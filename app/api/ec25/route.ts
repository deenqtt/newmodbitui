// File: app/api/ec25/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getEc25ListenerService } from "@/lib/services/ec25-listener";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    const ec25Service = getEc25ListenerService();

    switch (action) {
      case "status":
        return NextResponse.json({
          status: ec25Service.getCurrentStatus(),
          connected: ec25Service.isServiceConnected(),
        });

      case "gsm":
        return NextResponse.json({
          data: ec25Service.getCurrentGSMData(),
        });

      case "gps":
        return NextResponse.json({
          data: ec25Service.getCurrentGPSData(),
        });

      case "alerts":
        return NextResponse.json({
          alerts: ec25Service.getAlerts(),
        });

      case "all":
        return NextResponse.json({
          status: ec25Service.getCurrentStatus(),
          gsm: ec25Service.getCurrentGSMData(),
          gps: ec25Service.getCurrentGPSData(),
          alerts: ec25Service.getAlerts(),
          connected: ec25Service.isServiceConnected(),
        });

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("EC25 API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const ec25Service = getEc25ListenerService();

    if (!ec25Service.isServiceConnected()) {
      return NextResponse.json(
        {
          error: "EC25 service not connected",
        },
        { status: 503 }
      );
    }

    const response = await ec25Service.sendCommand(body);
    return NextResponse.json(response);
  } catch (error) {
    console.error("EC25 Command Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Command failed",
      },
      { status: 500 }
    );
  }
}
