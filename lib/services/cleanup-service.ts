// File: lib/services/cleanup-service.ts
import { prisma } from "@/lib/prisma";
import cron from "node-cron";

// --- KONFIGURASI ---
const DATA_RETENTION_DAYS = 30; // Simpan data selama 30 hari

/**
 * Fungsi ini akan menghapus semua record DeviceData dan GatewayStats
 * yang lebih tua dari periode retensi yang ditentukan.
 */
async function cleanupOldData() {
  console.log("🚀 [Cleanup Service] Memulai proses pembersihan data lama...");

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - DATA_RETENTION_DAYS);

  try {
    // 🔹 Hapus DeviceData lama
    const deviceDataResult = await prisma.deviceData.deleteMany({
      where: {
        timestamp: {
          lt: cutoffDate,
        },
      },
    });

    // 🔹 Hapus GatewayStats lama
    const gatewayStatsResult = await prisma.gatewayStats.deleteMany({
      where: {
        timestamp: {
          lt: cutoffDate,
        },
      },
    });

    // 🔹 Log hasil
    console.log(
      `✅ [Cleanup Service] Pembersihan selesai:
       - DeviceData: dihapus ${deviceDataResult.count} record
       - GatewayStats: dihapus ${gatewayStatsResult.count} record`
    );

    if (deviceDataResult.count === 0 && gatewayStatsResult.count === 0) {
      console.log("🧹 [Cleanup Service] Tidak ada data lama yang ditemukan.");
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
 * Service ini akan menjadwalkan tugas pembersihan harian.
 */
export function getCleanupService() {
  console.log("-> Memulai Cleanup Service dengan node-cron...");

  // Jadwalkan tugas setiap hari jam 02:00 pagi (WIB)
  cron.schedule(
    "0 2 * * *",
    () => {
      console.log(
        "🗓️  [Cron Job] Menjalankan tugas pembersihan data harian..."
      );
      cleanupOldData().catch((err) =>
        console.error("❌ [Cleanup Job] Gagal eksekusi:", err)
      );
    },
    {
      timezone: "Asia/Jakarta",
    }
  );

  console.log(
    "✅ [Cleanup Service] Tugas pembersihan terjadwal: setiap hari jam 02:00 WIB"
  );
}
