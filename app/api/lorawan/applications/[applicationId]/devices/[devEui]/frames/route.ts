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
  const startTime = searchParams.get("startTime");
  const endTime = searchParams.get("endTime");

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

  // Validasi format Device EUI (harus 16 karakter hex)
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

    // Jika device exists, ambil frames
    let chirpstackApiUrl = `${CHIRPSTACK_URL}/api/devices/${devEui}/frames?limit=${limit}&offset=${offset}`;

    // Tambahkan time range jika ada
    if (startTime) {
      chirpstackApiUrl += `&startTime=${startTime}`;
    }
    if (endTime) {
      chirpstackApiUrl += `&endTime=${endTime}`;
    }

    console.log("Requesting frames from:", chirpstackApiUrl);

    const chirpstackResponse = await fetch(chirpstackApiUrl, {
      headers: {
        Authorization: `Bearer ${API_TOKEN}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    console.log(
      "ChirpStack Frames Response Status:",
      chirpstackResponse.status
    );

    if (!chirpstackResponse.ok) {
      const errorText = await chirpstackResponse.text();
      console.log("ChirpStack Frames Error Response:", errorText);

      // Handle different error types
      if (chirpstackResponse.status === 404) {
        return NextResponse.json({
          error: "No frames found for this device",
          frames: [],
          totalCount: 0,
        });
      }

      throw new Error(
        `ChirpStack API error: ${chirpstackResponse.status} - ${errorText}`
      );
    }

    const data = await chirpstackResponse.json();
    console.log("ChirpStack Frames Data:", data);

    return NextResponse.json(data);
  } catch (error) {
    console.error(`[API FRAMES ERROR] for ${devEui}:`, error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
