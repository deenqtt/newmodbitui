import { NextResponse } from "next/server";

const CHIRPSTACK_URL = process.env.CHIRPSTACK_API_URL;
const API_TOKEN = process.env.CHIRPSTACK_API_TOKEN;
// Ganti dengan Tenant ID Anda. Bisa juga disimpan di .env
const TENANT_ID = "09dcf92f-ef9e-420e-8d4b-8a8aea7b6add";

// Handler untuk GET (mengambil daftar semua device profile)
export async function GET() {
  if (!CHIRPSTACK_URL || !API_TOKEN) {
    return NextResponse.json(
      { error: "ChirpStack environment variables not set" },
      { status: 500 }
    );
  }

  try {
    const chirpstackResponse = await fetch(
      `${CHIRPSTACK_URL}/api/device-profiles?limit=100&tenantId=${TENANT_ID}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${API_TOKEN}` },
        cache: "no-store", // Selalu ambil data terbaru
      }
    );

    if (!chirpstackResponse.ok) {
      throw new Error("Failed to fetch device profiles from ChirpStack.");
    }

    const data = await chirpstackResponse.json();
    return NextResponse.json(data.result || []);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

// Handler untuk POST (DIMODIFIKASI untuk menerima adrAlgorithmId)
export async function POST(request: Request) {
  if (!CHIRPSTACK_URL || !API_TOKEN) {
    return NextResponse.json(
      { error: "ChirpStack environment variables not set" },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();

    const chirpstackPayload = {
      deviceProfile: {
        tenantId: TENANT_ID,
        name: body.name,
        region: body.region,
        macVersion: body.macVersion,
        regParamsRevision: body.regParamsRevision,
        adrAlgorithmId: body.adrAlgorithmId, // <-- MENAMBAHKAN DATA BARU
        uplinkInterval: body.uplinkInterval,
        supportsOtaa: true,
      },
    };

    const chirpstackResponse = await fetch(
      `${CHIRPSTACK_URL}/api/device-profiles`,
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
      throw new Error(
        errorBody.error || `ChirpStack API error: ${chirpstackResponse.status}`
      );
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

// <-- FUNGSI BARU UNTUK MENGHAPUS DEVICE PROFILE -->
export async function DELETE(request: Request) {
  if (!CHIRPSTACK_URL || !API_TOKEN) {
    return NextResponse.json(
      { error: "ChirpStack environment variables not set" },
      { status: 500 }
    );
  }

  try {
    const { id } = await request.json();
    if (!id) {
      return NextResponse.json(
        { error: "Device Profile ID is required" },
        { status: 400 }
      );
    }

    const chirpstackResponse = await fetch(
      `${CHIRPSTACK_URL}/api/device-profiles/${id}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${API_TOKEN}`,
        },
      }
    );

    if (!chirpstackResponse.ok) {
      const errorBody = await chirpstackResponse.text();
      throw new Error(
        errorBody || `ChirpStack API error: ${chirpstackResponse.status}`
      );
    }

    return NextResponse.json({
      message: "Device Profile deleted successfully",
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
