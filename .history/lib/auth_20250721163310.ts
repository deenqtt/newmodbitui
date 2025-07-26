// File: lib/auth.ts
import { NextRequest } from "next/server";
import jwt from "jsonwebtoken";
import { Role } from "@prisma/client";

// Definisikan struktur data (payload) yang kita simpan di dalam token
interface AuthPayload {
  userId: string;
  role: Role;
  iat: number; // Issued At (waktu token dibuat)
  exp: number; // Expiration (waktu token kadaluarsa)
}

/**
 * Fungsi helper untuk mendapatkan dan memverifikasi data otentikasi dari sebuah request.
 * @param request Objek Request yang masuk.
 * @returns Payload otentikasi jika token valid, atau null jika tidak.
 */
export function getAuth(request: Request): AuthPayload | null {
  // 1. Ambil header "Authorization" dari request
  const authHeader = request.headers.get("Authorization");

  // 2. Jika tidak ada header atau formatnya salah (bukan "Bearer ..."), kembalikan null
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  // 3. Pisahkan token dari string "Bearer "
  const token = authHeader.split(" ")[1];
  if (!token) {
    return null;
  }

  try {
    // 4. Verifikasi token menggunakan secret key kita
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as AuthPayload;
    return decoded;
  } catch (error) {
    // Jika verifikasi gagal (token tidak valid, kadaluarsa, dll), kembalikan null
    console.error("Invalid token:", error);
    return null;
  }
}
