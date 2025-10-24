import { serialize } from "cookie";
import { NextResponse } from "next/server";

export async function POST() {
  // Buat cookie yang sudah kadaluarsa untuk menghapusnya
  const serializedCookie = serialize("authToken", "", {
    httpOnly: true,
    secure: false,
    sameSite: "strict",
    maxAge: -1, // Langsung kadaluarsa
    path: "/",
  });

  return new Response(JSON.stringify({
    message: "Logout successful",
    success: true
  }), {
    status: 200,
    headers: { "Set-Cookie": serializedCookie },
  });
}
