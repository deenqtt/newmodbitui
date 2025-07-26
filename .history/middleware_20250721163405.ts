// File: middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getAuth } from "./lib/auth";

export function middleware(request: NextRequest) {
  // 1. Cek apakah request ditujukan untuk API yang perlu dilindungi
  if (request.nextUrl.pathname.startsWith("/api/")) {
    // 2. Gunakan helper kita untuk memeriksa token
    const auth = getAuth(request);

    // 3. Jika tidak ada token atau token tidak valid, blokir request
    if (!auth) {
      return NextResponse.json(
        { message: "Authentication required" },
        { status: 401 }
      );
    }
  }

  // 4. Jika ada token yang valid atau request tidak ditujukan ke API yang dilindungi,
  // biarkan request berlanjut ke tujuan aslinya.
  return NextResponse.next();
}

// Konfigurasi ini memberitahu middleware rute mana saja yang harus dijaga.
export const config = {
  matcher: [
    /*
     * Cocokkan semua rute API kecuali yang ada di bawah ini:
     * - /api/auth/... (untuk login dan setup admin)
     * - /api/cron/... (agar cron job tetap bisa berjalan tanpa login)
     */
    "/api/((?!auth|cron).*)",
  ],
};
