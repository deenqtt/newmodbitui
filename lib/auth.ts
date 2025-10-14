// File: lib/auth.ts
import { Role } from "@prisma/client";
import { NextRequest } from "next/server";
import { jwtVerify } from "jose";

interface AuthPayload {
  userId: string;
  role: string;
  email: string;
  iat: number;
  exp: number;
}

const getJwtSecretKey = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not set in environment variables");
  }
  return new TextEncoder().encode(secret);
};

/**
 * Fungsi helper untuk mendapatkan dan memverifikasi data otentikasi dari cookie sebuah request.
 * @param request Objek Request yang masuk.
 * @returns Promise yang berisi payload otentikasi jika token valid, atau null jika tidak.
 */
export async function getAuthFromCookie(
  request: Request
): Promise<AuthPayload | null> {
  // Ambil cookie 'authToken' dari header 'cookie'
  const cookieHeader = request.headers.get("cookie");
  const tokenCookie = cookieHeader?.match(/authToken=([^;]+)/);

  if (!tokenCookie || !tokenCookie[1]) {
    return null;
  }

  const token = tokenCookie[1];

  try {
    // Verifikasi token menggunakan jose
    const { payload } = await jwtVerify(token, getJwtSecretKey());
    return payload as unknown as AuthPayload;
  } catch (error) {
    console.error("Invalid token from cookie:", error);
    return null;
  }
}

// Fungsi untuk server-side session
export async function getServerSession(request?: NextRequest) {
  const auth = await getAuthFromCookie(request as Request);
  return auth ? { userId: auth.userId, role: auth.role, email: auth.email } : null;
}
