import { NextResponse } from "next/server";

const CHIRPSTACK_URL = process.env.CHIRPSTACK_API_URL;
const API_TOKEN = process.env.CHIRPSTACK_API_TOKEN;

export async function GET(
  request: Request,
  { params }: { params: { applicationId: string; devEui: string } }
) {
  const { devEui } = params;
  const { searchParams } = new URL(request.url);

  // Query parameters untuk pagination dan filtering
  const limit = searchParams.get("limit") || "100";
  const offset = searchParams.get("offset") || "0";

  if (!CHIRPSTACK_URL || !API_TOKEN) {
    return NextResponse.json(
      { error: "ChirpStack environment variables not set" },
      { status: 500 }
    );
  }

  if (!devEui) {
    return NextResponse.json(
      { error: "Device EUI is required" },
      { status: 400 }
    );
  }

  // Validasi format Device EUI
  if (!/^[0-9a-fA-F]{16}$/.test(devEui)) {
    return NextResponse.json(
      { error: "Invalid Device EUI format" },
      { status: 400 }
    );
  }

  try {
    // Cek dulu apakah device exists
    const deviceCheckUrl = `${CHIRPSTACK_URL}/api/devices/${devEui}`;
    const deviceCheckResponse = await fetch(deviceCheckUrl, {
      headers: {
        Authorization: `Bearer ${API_TOKEN}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    console.log("Device Check Status:", deviceCheckResponse.status);

    if (!deviceCheckResponse.ok) {
      const errorText = await deviceCheckResponse.text();
      console.log("Device Check Error:", errorText);

      if (deviceCheckResponse.status === 404) {
        return NextResponse.json(
          { error: `Device with EUI ${devEui} not found` },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { error: `Device check failed: ${deviceCheckResponse.status}` },
        { status: deviceCheckResponse.status }
      );
    }

    // Jika device exists, ambil events
    const chirpstackApiUrl = `${CHIRPSTACK_URL}/api/devices/${devEui}/events?limit=${limit}&offset=${offset}`;

    console.log("Requesting events from:", chirpstackApiUrl);

    const chirpstackResponse = await fetch(chirpstackApiUrl, {
      headers: {
        Authorization: `Bearer ${API_TOKEN}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    console.log(
      "ChirpStack Events Response Status:",
      chirpstackResponse.status
    );

    if (!chirpstackResponse.ok) {
      const errorText = await chirpstackResponse.text();
      console.log("ChirpStack Events Error Response:", errorText);

      // Handle different error types
      if (chirpstackResponse.status === 404) {
        return NextResponse.json({
          error: "No events found for this device",
          result: [],
          totalCount: 0,
        });
      }

      // Parse error response
      let errorMessage = "Failed to fetch device events";
      try {
        const errorBody = JSON.parse(errorText);
        errorMessage = errorBody.message || errorBody.error || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }

      throw new Error(errorMessage);
    }

    const data = await chirpstackResponse.json();
    console.log("ChirpStack Events Data:", data);

    return NextResponse.json(data);
  } catch (error) {
    console.error(`[API EVENTS ERROR] for ${devEui}:`, error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
