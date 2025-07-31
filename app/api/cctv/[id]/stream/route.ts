// File: app/api/cctv/[id]/stream/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import Stream from "node-rtsp-stream";
import { TransformStream } from "stream/web";

// Variabel untuk menyimpan stream yang aktif agar bisa di-manage
const activeStreams: { [key: string]: any } = {};

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const cctvId = params.id;

  try {
    const cctvConfig = await prisma.cctv.findUnique({
      where: { id: cctvId },
    });

    if (!cctvConfig) {
      return new NextResponse("CCTV configuration not found", { status: 404 });
    }

    // Hentikan stream lama jika ada untuk ID ini untuk memastikan kita pakai config terbaru
    if (activeStreams[cctvId]) {
      activeStreams[cctvId].stop();
    }

    // Bangun URL RTSP dari konfigurasi di database
    const rtspUrl = `rtsp://${cctvConfig.username}:${cctvConfig.password}@${
      cctvConfig.ipAddress
    }:${cctvConfig.port}/${cctvConfig.channel || ""}`;

    // Buat response yang bisa kita tulis secara streaming
    const responseStream = new TransformStream();
    const writer = responseStream.writable.getWriter();

    const stream = new Stream({
      name: cctvConfig.name,
      streamUrl: rtspUrl,
      wsPort: 0, // Port WebSocket acak, tidak kita gunakan tapi wajib diisi
      ffmpegOptions: {
        "-stats": "",
        "-r": String(cctvConfig.framerate || 15),
        "-s": cctvConfig.resolution || "640x480",
        "-b:v": `${cctvConfig.bitrate || 1024}k`,
      },
    });

    // Saat FFMPEG menghasilkan data frame MJPEG, tulis ke response browser
    stream.on("data", (data) => {
      try {
        writer.write(data);
      } catch (e) {
        console.warn("Could not write to stream, client likely disconnected.");
      }
    });

    activeStreams[cctvId] = stream;

    // Jika browser menutup koneksi, hentikan proses FFMPEG untuk hemat resource
    request.signal.onabort = () => {
      console.log(`Stream for ${cctvConfig.name} stopped by client.`);
      stream.stop();
      delete activeStreams[cctvId];
      try {
        writer.close();
      } catch (e) {}
    };

    // Kirim response streaming ke browser
    return new NextResponse(responseStream.readable, {
      headers: {
        "Content-Type": "multipart/x-mixed-replace; boundary=ffserver",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error(`[CCTV_STREAM_ERROR] for ID ${cctvId}:`, error);
    return new NextResponse("Failed to start stream", { status: 500 });
  }
}
