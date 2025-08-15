// File: app/api/lorawan/applications/[applicationId]/devices/[devEui]/keys/route.ts
// Deskripsi: API untuk mengambil (GET) dan mengupdate (PUT) OTAA keys.

import { NextResponse } from "next/server";

const CHIRPSTACK_URL = process.env.CHIRPSTACK_API_URL;
const API_TOKEN = process.env.CHIRPSTACK_API_TOKEN;

// GET: Mengambil OTAA keys
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

  try {
    const chirpstackResponse = await fetch(
      `${CHIRPSTACK_URL}/api/devices/${devEui}/keys`,
      {
        headers: { Authorization: `Bearer ${API_TOKEN}` },
        cache: "no-store",
      }
    );

    if (!chirpstackResponse.ok) {
      if (chirpstackResponse.status === 404) {
        return NextResponse.json({ deviceKeys: null });
      }
      const errorBody = await chirpstackResponse.json();
      throw new Error(errorBody.error || "Failed to fetch device keys");
    }

    const data = await chirpstackResponse.json();

    // ---------------------------------------------

    return NextResponse.json(data);
  } catch (error) {
    console.error(`[API KEYS ERROR] for ${devEui}:`, error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

// PUT: Mengupdate OTAA keys
export async function PUT(
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

  try {
    const body = await request.json();

    // Pastikan payload memiliki struktur yang benar
    const chirpstackPayload = {
      deviceKeys: {
        devEui: devEui,
        nwkKey: body.deviceKeys.nwkKey,
        appKey: body.deviceKeys.appKey,
      },
    };

    const chirpstackResponse = await fetch(
      `${CHIRPSTACK_URL}/api/devices/${devEui}/keys`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_TOKEN}`,
        },
        body: JSON.stringify(chirpstackPayload),
      }
    );

    if (!chirpstackResponse.ok) {
      const errorBody = await chirpstackResponse.json();
      throw new Error(errorBody.error || "Failed to update device keys");
    }

    return NextResponse.json({ message: "Device keys updated successfully" });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
