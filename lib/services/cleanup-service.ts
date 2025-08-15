// File: lib/services/cleanup-service.ts
import { prisma } from "@/lib/prisma";
import cron from "node-cron";

// --- KONFIGURASI ---
const DATA_RETENTION_DAYS = 30; // Simpan data selama 30 hari

/**
 * Fungsi ini akan menghapus semua record DeviceData yang lebih tua
 * dari periode retensi yang ditentukan.
 */
async function cleanupOldData() {
  console.log("🚀 [Cleanup Service] Memulai proses pembersihan data lama...");

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - DATA_RETENTION_DAYS);

  try {
    const result = await prisma.deviceData.deleteMany({
      where: {
        timestamp: {
          lt: cutoffDate, // lt = less than (lebih kecil dari)
        },
      },
    });

    if (result.count > 0) {
      console.log(
        `✅ [Cleanup Service] Berhasil menghapus ${result.count} record riwayat data lama.`
      );
    } else {
      console.log("🧹 [Cleanup Service] Tidak ada data lama untuk dihapus.");
    }
  } catch (error) {
    console.error(
      "❌ [Cleanup Service] Gagal saat proses menghapus data:",
      error
    );
  }
}

/**
 * Fungsi utama untuk menginisialisasi service pembersihan.
 * Service ini akan menjadwalkan tugas pembersihan menggunakan node-cron.
 */
export function getCleanupService() {
  console.log("-> Memulai Cleanup Service dengan node-cron...");

  // Jadwalkan tugas untuk berjalan setiap hari pada pukul 02:00 pagi.
  // Format cron: 'menit jam hari_dalam_bulan bulan hari_dalam_minggu'
  cron.schedule(
    "0 2 * * *",
    () => {
      console.log(
        "🗓️  [Cron Job] Menjalankan tugas pembersihan data harian..."
      );
      cleanupOldData();
    },
    {
      timezone: "Asia/Jakarta", // Penting: Sesuaikan dengan zona waktu server Anda
    }
  );

  console.log(
    "✅ [Cleanup Service] Tugas pembersihan terjadwal setiap hari jam 02:00."
  );
}
