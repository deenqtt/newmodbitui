// File: app/api/lorawan/applications/[applicationId]/devices/route.ts

import { NextResponse } from "next/server";

const CHIRPSTACK_URL = process.env.CHIRPSTACK_API_URL;
const API_TOKEN = process.env.CHIRPSTACK_API_TOKEN;

// Handler GET tetap sama, tidak perlu diubah
export async function GET(
  request: Request,
  { params }: { params: { applicationId: string } }
) {
  const { applicationId } = params;

  if (!CHIRPSTACK_URL || !API_TOKEN) {
    return NextResponse.json(
      { error: "ChirpStack environment variables not set" },
      { status: 500 }
    );
  }
  if (!applicationId) {
    return NextResponse.json(
      { error: "Application ID is required" },
      { status: 400 }
    );
  }

  try {
    const devicesResponse = await fetch(
      `${CHIRPSTACK_URL}/api/devices?limit=1000&applicationId=${applicationId}`,
      {
        headers: { Authorization: `Bearer ${API_TOKEN}` },
        cache: "no-store",
      }
    );

    if (!devicesResponse.ok) {
      const errorBody = await devicesResponse.json();
      throw new Error(
        `Failed to fetch devices: ${
          errorBody.error || devicesResponse.statusText
        }`
      );
    }

    const devicesData = await devicesResponse.json();
    return NextResponse.json(devicesData);
  } catch (error) {
    console.error("Internal GET Error:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

// Handler untuk POST: Membuat device baru dalam aplikasi
export async function POST(
  request: Request,
  { params }: { params: { applicationId: string } }
) {
  const { applicationId } = params;

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
      appKey,
      isDisabled,
      disableFrameCounterValidation,
      tags, // <-- TERIMA DATA BARU
      variables, // <-- TERIMA DATA BARU
    } = body;

    if (!name || !devEui || !appKey || !deviceProfileId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Tahap 1: Buat Device
    const createDevicePayload = {
      device: {
        name,
        description,
        devEui,
        joinEui,
        applicationId,
        deviceProfileId,
        isDisabled,
        skipFcntCheck: disableFrameCounterValidation,
        tags: tags || {}, // <-- TAMBAHKAN KE PAYLOAD
        variables: variables || {}, // <-- TAMBAHKAN KE PAYLOAD
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
      throw new Error(
        errorBody.error ||
          `ChirpStack error: ${createDeviceResponse.statusText}`
      );
    }

    // Tahap 2: Atur Kunci (AppKey) - Logika ini tetap sama
    const setKeysPayload = {
      deviceKeys: { devEui, nwkKey: appKey, appKey },
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
      // Rollback jika gagal
      await fetch(`${CHIRPSTACK_URL}/api/devices/${devEui}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${API_TOKEN}` },
      });
      const errorBody = await setKeysResponse.json();
      throw new Error(
        errorBody.error || `ChirpStack error: ${setKeysResponse.statusText}`
      );
    }

    return NextResponse.json(
      { message: "Device created successfully" },
      { status: 201 }
    );
  } catch (error) {
    console.error("Internal POST Error:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
