// File: lib/prisma.ts
import { PrismaClient } from "@prisma/client";

// Deklarasikan variabel global untuk menyimpan instance prisma
declare global {
  var prisma: PrismaClient | undefined;
}

// Buat satau instance prisma yang akan digunakan di seluruh aplikasi.
// Ini akan memeriksa apakah instance sudah ada di global, jika tidak, ia akan membuat yang baru.
// Ini mencegah pembuatan koneksi baru setiap kali ada hot-reload saat development.
export const prisma = global.prisma || new PrismaClient();

// Di lingkungan development, simpan instance ke variabel global agar bisa digunakan kembali.
if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}
