// File: lib/prisma.ts
import { PrismaClient } from "@prisma/client";
// --- PATH DIPERBAIKI ---
// Keluar dari folder 'lib' (..) lalu masuk ke folder 'services'
import { getAlarmMonitorService } from "./services/alarm-monitor";
import { getZkTecoService } from "./services/zkteco-service"; // <-- 1. TAMBAHKAN IMPORT INI
import { getCalculationService } from "./services/calculation-service"; // <-- 1. TAMBAHKAN IMPORT INI

// Deklarasikan variabel global untuk menyimpan instance prisma
declare global {
  var prisma: PrismaClient | undefined;
}

// Buat satu instance prisma yang akan digunakan di seluruh aplikasi.
// Ini akan memeriksa apakah instance sudah ada di global, jika tidak, ia akan membuat yang baru.
// Ini mencegah pembuatan koneksi baru setiap kali ada hot-reload saat development.
export const prisma = global.prisma || new PrismaClient();

// Di lingkungan development, simpan instance ke variabel global agar bisa digunakan kembali.
if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}

// --- Jalankan semua service di lingkungan server ---
// Cek ini untuk memastikan service hanya berjalan di server, bukan di browser
if (typeof window === "undefined") {
  if (process.env.NODE_ENV === "production") {
    // Di production, jalankan service sekali saja
    getAlarmMonitorService();
    getCalculationService();
    getZkTecoService();
  } else {
    // Di development, pastikan service hanya dibuat sekali untuk menghindari duplikasi saat hot-reload
    if (!(global as any).servicesStarted) {
      getAlarmMonitorService();
      getCalculationService();
      getZkTecoService();
      (global as any).servicesStarted = true;
    }
  }
}
