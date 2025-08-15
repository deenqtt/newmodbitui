// File: app/api/lorawan/applications/[applicationId]/devices/[devEui]/queue/route.ts
// Deskripsi: API untuk GET, POST, dan DELETE (Flush) downlink queue.

import { NextResponse } from "next/server";

const CHIRPSTACK_URL = process.env.CHIRPSTACK_API_URL;
const API_TOKEN = process.env.CHIRPSTACK_API_TOKEN;

// GET: Mengambil daftar item di queue
export async function GET(
  request: Request,
  { params }: { params: { devEui: string } }
) {
  const { devEui } = params;
  try {
    const chirpstackResponse = await fetch(
      `${CHIRPSTACK_URL}/api/devices/${devEui}/queue`,
      {
        headers: { Authorization: `Bearer ${API_TOKEN}` },
        cache: "no-store",
      }
    );
    if (!chirpstackResponse.ok) {
      const errorBody = await chirpstackResponse.json();
      throw new Error(errorBody.error || "Failed to fetch queue");
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

// POST: Menambahkan item ke queue (Enqueue)
export async function POST(
  request: Request,
  { params }: { params: { devEui: string } }
) {
  const { devEui } = params;
  try {
    const body = await request.json(); // { confirmed, fPort, data }

    // Data harus di-encode ke Base64
    const base64Data = Buffer.from(body.data, "hex").toString("base64");

    const chirpstackPayload = {
      queueItem: {
        confirmed: body.confirmed,
        fPort: body.fPort,
        data: base64Data,
      },
    };

    const chirpstackResponse = await fetch(
      `${CHIRPSTACK_URL}/api/devices/${devEui}/queue`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_TOKEN}`,
        },
        body: JSON.stringify(chirpstackPayload),
      }
    );

    if (!chirpstackResponse.ok) {
      const errorBody = await chirpstackResponse.json();
      throw new Error(errorBody.error || "Failed to enqueue payload");
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

// DELETE: Menghapus semua item dari queue (Flush)
export async function DELETE(
  request: Request,
  { params }: { params: { devEui: string } }
) {
  const { devEui } = params;
  try {
    const chirpstackResponse = await fetch(
      `${CHIRPSTACK_URL}/api/devices/${devEui}/queue`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${API_TOKEN}` },
      }
    );
    if (!chirpstackResponse.ok) {
      const errorBody = await chirpstackResponse.json();
      throw new Error(errorBody.error || "Failed to flush queue");
    }
    return NextResponse.json({ message: "Queue flushed successfully" });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
