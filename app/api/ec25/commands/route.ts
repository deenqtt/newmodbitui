// File: app/api/ec25/command/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getEc25ListenerService } from "@/lib/services/ec25-listener";

export async function POST(request: NextRequest) {
  try {
    const { type, data } = await request.json();

    if (!type) {
      return NextResponse.json(
        { error: "Command type is required" },
        { status: 400 }
      );
    }

    const ec25Service = getEc25ListenerService();

    if (!ec25Service.isServiceConnected()) {
      return NextResponse.json(
        {
          error: "EC25 service not connected",
        },
        { status: 503 }
      );
    }

    const command = { type, data: data || {} };
    const response = await ec25Service.sendCommand(command);

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
