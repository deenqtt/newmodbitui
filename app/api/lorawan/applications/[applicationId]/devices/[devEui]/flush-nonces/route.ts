import { NextResponse } from "next/server";

const CHIRPSTACK_URL = process.env.CHIRPSTACK_API_URL;
const API_TOKEN = process.env.CHIRPSTACK_API_TOKEN;

// POST: Flush OTAA device nonces
export async function POST(
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
      `${CHIRPSTACK_URL}/api/devices/${devEui}/flush-dev-nonces`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_TOKEN}`,
        },
      }
    );

    if (!chirpstackResponse.ok) {
      const errorBody = await chirpstackResponse.json();
      throw new Error(errorBody.error || "Failed to flush OTAA nonces");
    }

    return NextResponse.json({ message: "OTAA nonces flushed successfully" });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
