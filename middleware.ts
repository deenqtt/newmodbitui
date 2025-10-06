// File: middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose"; // Gunakan jose untuk verifikasi di edge

// Fungsi untuk mendapatkan secret key
const getJwtSecretKey = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not set in environment variables");
  }
  return new TextEncoder().encode(secret);
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const tokenCookie = request.cookies.get("authToken");

  // Skip middleware untuk API routes (penting untuk mencegah redirect loop)
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Halaman publik yang bisa diakses tanpa login
  const publicPaths = ["/login", "/register"];

  // Jika mencoba mengakses halaman publik
  if (publicPaths.includes(pathname)) {
    // Jika sudah login, arahkan ke dasbor
    if (tokenCookie) {
      try {
        await jwtVerify(tokenCookie.value, getJwtSecretKey());
        return NextResponse.redirect(new URL("/", request.url));
      } catch (error) {
        // Token tidak valid, biarkan akses ke halaman publik
      }
    }
    return NextResponse.next();
  }

  // Jika mencoba mengakses halaman yang dilindungi
  if (!tokenCookie) {
    // Jika tidak ada token, arahkan ke login
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    // Verifikasi token
    await jwtVerify(tokenCookie.value, getJwtSecretKey());
    // Jika token valid, biarkan akses
    return NextResponse.next();
  } catch (error) {
    // Jika token tidak valid, arahkan ke login dan hapus cookie yang salah
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete("authToken");
    return response;
  }
}

export const config = {
  // Jalankan middleware di semua rute kecuali file statis dan API
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
