import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { spawn } from "child_process";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  if (!id || typeof id !== "string") {
    console.error("[STREAM] Error: Invalid or missing CCTV ID.");
    return new Response("Invalid CCTV ID provided", { status: 400 });
  }

  try {
    const cctv = await prisma.cctv.findUnique({
      where: { id },
    });

    if (!cctv) {
      console.error(
        `[STREAM] Error: CCTV with ID ${id} not found in database.`
      );
      return new Response("CCTV configuration not found", { status: 404 });
    }
    console.log(`[STREAM] Found CCTV: "${cctv.name}"`);

    const { name, ipAddress, port, channel, username, password, resolution } =
      cctv;
    const auth =
      username && password
        ? `${encodeURIComponent(username)}:${encodeURIComponent(password)}@`
        : "";
    const rtspUrl = `rtsp://${auth}${ipAddress}:${port}/${channel || ""}`;

    const stream = new ReadableStream({
      start(controller) {
        let isClosed = false;

        const ffmpegArgs = [
          "-rtsp_transport",
          "tcp",
          "-i",
          rtspUrl,
          "-f",
          "mjpeg",
          "-q:v",
          "5",
          "-vf",
          "fps=5",
          "-s",
          resolution || "640x480",
          "pipe:1",
        ];

        const ffmpegProcess = spawn("ffmpeg", ffmpegArgs);

        ffmpegProcess.stdout.on("data", (chunk) => {
          if (!isClosed) controller.enqueue(chunk);
        });

        ffmpegProcess.stderr.on("data", (data) => {
          console.error(`[FFMPEG STDERR ${name}]: ${data.toString()}`);
        });

        const closeStream = (reason: string) => {
          if (!isClosed) {
            isClosed = true;

            ffmpegProcess.kill("SIGKILL");
            try {
              controller.close();
            } catch (e) {}
          }
        };

        request.signal.addEventListener("abort", () =>
          closeStream("Client disconnected")
        );
        ffmpegProcess.on("close", (code) =>
          closeStream(`FFMPEG process exited with code ${code}`)
        );
        ffmpegProcess.on("error", (err) => {
          console.error(`[STREAM] FFMPEG process error for "${name}":`, err);
          closeStream("FFMPEG process error");
        });
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "multipart/x-mixed-replace; boundary=frame",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (error) {
    console.error(`[CCTV_STREAM_ERROR] General error for ID ${id}:`, error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
