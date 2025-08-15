// File: app/api/lorawan/applications/route.ts

import { NextResponse } from "next/server";

const CHIRPSTACK_URL = process.env.CHIRPSTACK_API_URL;
const API_TOKEN = process.env.CHIRPSTACK_API_TOKEN;
// Ganti dengan Tenant ID Anda. Bisa juga disimpan di .env
const TENANT_ID = "09dcf92f-ef9e-420e-8d4b-8a8aea7b6add";

// Handler untuk GET (mengambil daftar semua application)
export async function GET() {
  if (!CHIRPSTACK_URL || !API_TOKEN) {
    return NextResponse.json(
      { error: "ChirpStack environment variables not set" },
      { status: 500 }
    );
  }

  try {
    const chirpstackResponse = await fetch(
      `${CHIRPSTACK_URL}/api/applications?limit=100&tenantId=${TENANT_ID}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${API_TOKEN}` },
        cache: "no-store",
      }
    );

    if (!chirpstackResponse.ok)
      throw new Error("Failed to fetch applications from ChirpStack.");

    const data = await chirpstackResponse.json();
    return NextResponse.json(data.result || []);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

// Handler untuk POST (membuat Application baru)
export async function POST(request: Request) {
  if (!CHIRPSTACK_URL || !API_TOKEN) {
    return NextResponse.json(
      { error: "ChirpStack environment variables not set" },
      { status: 500 }
    );
  }

  try {
    const body = await request.json(); // Data form dari frontend (hanya butuh 'name')

    const chirpstackPayload = {
      application: {
        name: body.name,
        description: body.description || body.name,
        tenantId: TENANT_ID,
      },
    };

    const chirpstackResponse = await fetch(
      `${CHIRPSTACK_URL}/api/applications`,
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
export async function DELETE(request: Request) {
  if (!process.env.CHIRPSTACK_API_URL || !process.env.CHIRPSTACK_API_TOKEN) {
    return NextResponse.json(
      { error: "ChirpStack environment variables not set" },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { id } = body; // Kita akan mengirim ID aplikasi yang akan dihapus

    if (!id) {
      return NextResponse.json(
        { error: "Application ID is required" },
        { status: 400 }
      );
    }

    const chirpstackResponse = await fetch(
      `${process.env.CHIRPSTACK_API_URL}/api/applications/${id}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${process.env.CHIRPSTACK_API_TOKEN}`,
        },
      }
    );

    if (!chirpstackResponse.ok) {
      // ChirpStack akan merespon 200 OK jika berhasil, dan error jika gagal
      const errorBody = await chirpstackResponse.text();
      throw new Error(
        errorBody || `ChirpStack API error: ${chirpstackResponse.status}`
      );
    }

    return NextResponse.json({ message: "Application deleted successfully" });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
