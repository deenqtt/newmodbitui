// File: app/api/cctv/[id]/snapshot/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { spawn } from "child_process";

// Konfigurasi agar Next.js tidak men-cache response ini
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  try {
    const cctv = await prisma.cctv.findUnique({ where: { id } });

    if (!cctv) {
      return new NextResponse("CCTV not found", { status: 404 });
    }

    const { ipAddress, port, channel, username, password, resolution } = cctv;

    const auth =
      username && password
        ? `${encodeURIComponent(username)}:${encodeURIComponent(password)}@`
        : "";
    const rtspUrl = `rtsp://${auth}${ipAddress}:${port}/${channel || ""}`;

    // Perintah ffmpeg untuk mengambil 1 frame dan mengirimnya ke stdout
    const ffmpegCommand = [
      "-rtsp_transport",
      "tcp",
      "-i",
      rtspUrl,
      "-vframes", // Ambil sejumlah frame video
      "1", // Spesifiknya, 1 frame saja
      "-q:v", // Atur kualitas video
      "3", // Kualitas 3 (skala 1-31, makin kecil makin bagus)
      "-s", // Atur resolusi
      resolution || "640x480",
      "-f", // Format output
      "image2pipe", // Kirim sebagai stream gambar, bukan file
      "pipe:1", // Kirim ke stdout (standard output)
    ];

    const ffmpegProcess = spawn("ffmpeg", ffmpegCommand);

    // Buat stream yang bisa dibaca oleh Next.js dari output ffmpeg
    const readableStream = new ReadableStream({
      start(controller) {
        // Kirim data dari stdout ffmpeg ke browser
        ffmpegProcess.stdout.on("data", (chunk) => {
          controller.enqueue(chunk);
        });

        // Tangani error jika ffmpeg gagal
        ffmpegProcess.stderr.on("data", (data) => {
          console.error(`FFMPEG Snapshot Error: ${data}`);
        });

        // Tutup stream saat proses ffmpeg selesai
        ffmpegProcess.on("close", () => {
          controller.close();
        });
      },
    });

    // Kirim response ke browser dengan header yang benar
    return new Response(readableStream, {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (error) {
    console.error(
      `[API_SNAPSHOT_ERROR] Failed to get snapshot for ${id}:`,
      error
    );
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
