// File: instrumentation.ts

// Fungsi ini akan diekspor dan dijalankan oleh Next.js
export async function register() {
  // Kita hanya ingin menjalankan service saat server benar-benar berjalan,
  // bukan selama proses 'next build'.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Import fungsi inisialisasi secara dinamis
    const { initializeBackgroundServices } = await import(
      "./lib/init-services"
    );
    initializeBackgroundServices();
  }
}
