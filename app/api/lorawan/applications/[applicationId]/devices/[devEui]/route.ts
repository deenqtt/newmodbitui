// File: app/api/lorawan/applications/[applicationId]/devices/[devEui]/route.ts
// Deskripsi: API route TERPADU untuk GET, PUT, dan DELETE device di dalam aplikasi.

import { NextResponse } from "next/server";

const CHIRPSTACK_URL = process.env.CHIRPSTACK_API_URL;
const API_TOKEN = process.env.CHIRPSTACK_API_TOKEN;

// GET: Mengambil detail satu device
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
      `${CHIRPSTACK_URL}/api/devices/${devEui}`,
      {
        headers: { Authorization: `Bearer ${API_TOKEN}` },
        cache: "no-store",
      }
    );

    if (!chirpstackResponse.ok) {
      const errorBody = await chirpstackResponse.json();
      throw new Error(errorBody.error || "Failed to fetch device details");
    }

    const data = await chirpstackResponse.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

// PUT: Mengupdate detail device
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

    const chirpstackPayload = {
      device: {
        ...body.device, // Kirim semua data dari form
        devEui: devEui, // Pastikan devEui tidak berubah
      },
    };

    const chirpstackResponse = await fetch(
      `${CHIRPSTACK_URL}/api/devices/${devEui}`,
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
      throw new Error(errorBody.error || "Failed to update device");
    }

    return NextResponse.json({ message: "Device updated successfully" });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

// DELETE: Menghapus device
export async function DELETE(
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
      `${CHIRPSTACK_URL}/api/devices/${devEui}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${API_TOKEN}` },
      }
    );

    if (!chirpstackResponse.ok) {
      const errorBody = await chirpstackResponse.json();
      throw new Error(
        errorBody.error || `ChirpStack API error: ${chirpstackResponse.status}`
      );
    }

    return NextResponse.json({ message: "Device deleted successfully" });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
