// File: app/api/lorawan/applications/[applicationId]/route.ts
// Deskripsi: API route untuk mengambil detail aplikasi spesifik (GET by ID).
// PERBAIKAN: Mengganti parameter 'id' menjadi 'applicationId' agar sesuai dengan nama folder.

import { NextResponse } from "next/server";

const CHIRPSTACK_URL = process.env.CHIRPSTACK_API_URL;
const API_TOKEN = process.env.CHIRPSTACK_API_TOKEN;

// Handler untuk GET (mengambil detail satu application)
export async function GET(
  request: Request,
  { params }: { params: { applicationId: string } } // <-- DIPERBAIKI
) {
  const { applicationId } = params; // <-- DIPERBAIKI

  if (!CHIRPSTACK_URL || !API_TOKEN) {
    return NextResponse.json(
      { error: "ChirpStack environment variables not set" },
      { status: 500 }
    );
  }

  if (!applicationId) {
    // <-- DIPERBAIKI
    return NextResponse.json(
      { error: "Application ID is required" },
      { status: 400 }
    );
  }

  try {
    const chirpstackResponse = await fetch(
      `${CHIRPSTACK_URL}/api/applications/${applicationId}`, // <-- DIPERBAIKI
      {
        headers: { Authorization: `Bearer ${API_TOKEN}` },
        cache: "no-store", // Selalu ambil data terbaru untuk detail
      }
    );

    if (!chirpstackResponse.ok) {
      // Coba parsing error dari ChirpStack, jika gagal, gunakan status text
      let errorBody;
      try {
        errorBody = await chirpstackResponse.json();
      } catch (e) {
        errorBody = { error: chirpstackResponse.statusText };
      }

      throw new Error(
        errorBody.error ||
          "Failed to fetch application details from ChirpStack."
      );
    }

    const data = await chirpstackResponse.json();
    // Response dari ChirpStack sudah berisi object 'application', jadi kita teruskan saja
    return NextResponse.json(data);
  } catch (error) {
    console.error(
      `[API ERROR] /api/lorawan/applications/${applicationId}:`,
      error
    );
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
