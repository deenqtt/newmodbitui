// ========================================================

// File BARU: app/api/auth/logout/route.ts
// BUAT FILE BARU INI DAN ISI DENGAN KODE DI BAWAH:
import { serialize } from "cookie";
import { NextResponse } from "next/server";

export async function POST() {
  // Buat cookie yang sudah kadaluarsa untuk menghapusnya
  const serializedCookie = serialize("authToken", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV !== "development",
    sameSite: "strict",
    maxAge: -1, // Langsung kadaluarsa
    path: "/",
  });

  return new Response(JSON.stringify({ message: "Logout successful" }), {
    status: 200,
    headers: { "Set-Cookie": serializedCookie },
  });
}
