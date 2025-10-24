// File: app/api/lorawan/devices/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
const CHIRPSTACK_URL = process.env.CHIRPSTACK_API_URL;
const API_TOKEN = process.env.CHIRPSTACK_API_TOKEN;

// Handler untuk GET (Mengambil semua perangkat LoRaWAN)
export async function GET() {
  try {
    const devices = await prisma.loraDevice.findMany({
      orderBy: {
        lastSeen: "desc", // Urutkan berdasarkan yang terakhir aktif
      },
    });
    return NextResponse.json(devices);
  } catch (error) {
    console.error("Error fetching LoRaWAN devices:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// Handler untuk POST (membuat device baru dengan detail lengkap)
export async function POST(request: Request) {
  if (!CHIRPSTACK_URL || !API_TOKEN) {
    return NextResponse.json(
      { error: "ChirpStack environment variables not set" },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const {
      name,
      description,
      devEui,
      joinEui,
      deviceProfileId,
      applicationId,
      appKey,
      disableFrameCounterValidation,
    } = body;

    // Tahap 1: Buat Device
    const createDevicePayload = {
      device: {
        name,
        description,
        devEui,
        joinEui,
        applicationId,
        deviceProfileId,
        isDisabled: false,
        skipFcntCheck: disableFrameCounterValidation, // <-- Menggunakan nilai dari form
      },
    };

    const createDeviceResponse = await fetch(`${CHIRPSTACK_URL}/api/devices`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_TOKEN}`,
      },
      body: JSON.stringify(createDevicePayload),
    });

    if (!createDeviceResponse.ok) {
      const errorBody = await createDeviceResponse.json();
      throw new Error(`Failed to create device: ${errorBody.error}`);
    }

    // Tahap 2: Atur Kunci (AppKey)
    const setKeysPayload = {
      deviceKeys: {
        devEui: devEui,
        nwkKey: appKey,
        appKey: appKey,
      },
    };

    const setKeysResponse = await fetch(
      `${CHIRPSTACK_URL}/api/devices/${devEui}/keys`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_TOKEN}`,
        },
        body: JSON.stringify(setKeysPayload),
      }
    );

    if (!setKeysResponse.ok) {
      await fetch(`${CHIRPSTACK_URL}/api/devices/${devEui}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${API_TOKEN}` },
      });
      const errorBody = await setKeysResponse.json();
      throw new Error(`Failed to set device keys: ${errorBody.error}`);
    }

    return NextResponse.json({ message: "Device created successfully" });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
