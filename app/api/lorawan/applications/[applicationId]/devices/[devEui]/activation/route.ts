// File: app/api/lorawan/applications/[applicationId]/devices/[devEui]/activation/route.ts
// Deskripsi: API untuk mengambil data aktivasi device dari ChirpStack.

import { NextResponse } from "next/server";

const CHIRPSTACK_URL = process.env.CHIRPSTACK_API_URL;
const API_TOKEN = process.env.CHIRPSTACK_API_TOKEN;

export async function GET(
  request: Request,
  { params }: { params: { devEui: string } }
) {
  const { devEui } = params;

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

  try {
    const chirpstackApiUrl = `${CHIRPSTACK_URL}/api/devices/${devEui}/activation`;

    const chirpstackResponse = await fetch(chirpstackApiUrl, {
      headers: { Authorization: `Bearer ${API_TOKEN}` },
      cache: "no-store",
    });

    if (!chirpstackResponse.ok) {
      // Jika device belum pernah aktivasi, ChirpStack akan return 404
      if (chirpstackResponse.status === 404) {
        return NextResponse.json({ deviceActivation: null });
      }
      const errorBody = await chirpstackResponse.json();
      throw new Error(errorBody.error || "Failed to fetch device activation");
    }

    const data = await chirpstackResponse.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error(`[API ACTIVATION ERROR] for ${devEui}:`, error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
