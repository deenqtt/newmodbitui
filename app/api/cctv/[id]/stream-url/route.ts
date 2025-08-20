// File: app/api/cctv/[id]/stream-url/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromCookie } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await getAuthFromCookie(request);
  if (!auth) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const monitorId = searchParams.get("monitorId");

  if (!monitorId) {
    return NextResponse.json(
      { message: "Monitor ID is required" },
      { status: 400 }
    );
  }

  try {
    // Get camera configuration
    const cctv = await prisma.cctv.findUnique({
      where: { id: params.id },
    });

    if (!cctv) {
      return NextResponse.json(
        { message: "CCTV camera not found" },
        { status: 404 }
      );
    }

    if (!cctv.apiKey || !cctv.group) {
      return NextResponse.json(
        { message: "Camera not configured for streaming" },
        { status: 400 }
      );
    }

    // First, get monitor data to verify monitor exists and get stream info
    const monitorUrl = `http://${cctv.ipAddress}:${cctv.port}/${cctv.apiKey}/monitor/${cctv.group}`;
    
    console.log(`[API_STREAM_URL] Fetching monitor data from: ${monitorUrl}`);

    const monitorResponse = await fetch(monitorUrl, {
      headers: {
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!monitorResponse.ok) {
      throw new Error(`Failed to fetch monitor data: ${monitorResponse.statusText}`);
    }

    const monitorData = await monitorResponse.json();
    const monitors = Array.isArray(monitorData) ? monitorData : [];
    const targetMonitor = monitors.find((m: any) => m.mid === monitorId);

    if (!targetMonitor) {
      return NextResponse.json(
        { message: "Monitor not found" },
        { status: 404 }
      );
    }

    if (!targetMonitor.streams || targetMonitor.streams.length === 0) {
      return NextResponse.json(
        { message: "No streams available for this monitor" },
        { status: 404 }
      );
    }

    // Generate stream URLs
    const streams = targetMonitor.streams.map((streamPath: string) => ({
      type: streamPath.includes('.m3u8') ? 'hls' : 'mjpeg',
      url: `http://${cctv.ipAddress}:${cctv.port}${streamPath}`,
      path: streamPath,
    }));

    // Return stream information with extended monitor data
    return NextResponse.json({
      success: true,
      camera: {
        id: cctv.id,
        name: cctv.name,
        ipAddress: cctv.ipAddress,
        port: cctv.port,
      },
      monitor: {
        mid: targetMonitor.mid,
        name: targetMonitor.name,
        status: targetMonitor.status,
        host: targetMonitor.host,
        port: targetMonitor.port,
        protocol: targetMonitor.protocol,
        width: targetMonitor.width,
        height: targetMonitor.height,
        fps: targetMonitor.fps,
        type: targetMonitor.type,
        mode: targetMonitor.mode,
        currentlyWatching: targetMonitor.currentlyWatching,
        streams: targetMonitor.streams,
      },
      streams,
      primaryStream: streams[0], // First stream as primary
      streamCount: streams.length,
    });

  } catch (error: any) {
    console.error(`[API_STREAM_URL_ERROR] Failed to get stream URL for ${params.id}:`, error);
    
    if (error.name === 'TimeoutError') {
      return NextResponse.json(
        { message: "Request timeout - Camera may be unavailable" },
        { status: 504 }
      );
    }

    return NextResponse.json(
      { 
        message: "Failed to get stream URL",
        error: error.message 
      },
      { status: 500 }
    );
  }
}