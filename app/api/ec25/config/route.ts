// File: app/api/ec25/config/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getEc25ListenerService } from "@/lib/services/ec25-listener";

export async function POST(request: NextRequest) {
  try {
    const { action, ...config } = await request.json();
    const ec25Service = getEc25ListenerService();

    if (!ec25Service.isServiceConnected()) {
      return NextResponse.json(
        {
          error: "EC25 service not connected",
        },
        { status: 503 }
      );
    }

    let response;

    switch (action) {
      case "set_apn":
        response = await ec25Service.sendCommand({
          type: "set_apn",
          data: {
            apn: config.apn,
            username: config.username || "",
            password: config.password || "",
          },
        });
        break;

      case "set_pin":
        response = await ec25Service.sendCommand({
          type: "set_sim_pin",
          data: {
            pin: config.pin,
          },
        });
        break;

      case "restart_modem":
        response = await ec25Service.sendCommand({
          type: "restart_modem",
        });
        break;

      case "test_internet":
        response = await ec25Service.sendCommand({
          type: "test_internet",
        });
        break;

      case "factory_reset":
        response = await ec25Service.sendCommand({
          type: "factory_reset",
        });
        break;

      case "scan_networks":
        response = await ec25Service.sendCommand({
          type: "scan_networks",
        });
        break;

      case "get_detailed_status":
        response = await ec25Service.sendCommand({
          type: "get_detailed_status",
        });
        break;

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("EC25 Config Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Configuration failed",
      },
      { status: 500 }
    );
  }
}
