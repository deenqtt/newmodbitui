// File: app/api/cctv/[id]/videos/route.ts

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
        { message: "Camera not configured for NVR API access" },
        { status: 400 }
      );
    }

    // Fetch videos from Shinobi NVR API
    const videosUrl = `http://${cctv.ipAddress}:${cctv.port}/${cctv.apiKey}/videos/${cctv.group}/${monitorId}`;
    
    console.log(`[API_VIDEOS] Fetching from: ${videosUrl}`);

    const response = await fetch(videosUrl, {
      headers: {
        'Accept': 'application/json',
      },
      // Add timeout
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      throw new Error(`NVR API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // Return videos with camera info for frontend processing
    return NextResponse.json({
      success: true,
      camera: {
        id: cctv.id,
        name: cctv.name,
        ipAddress: cctv.ipAddress,
        port: cctv.port,
        apiKey: cctv.apiKey,
        group: cctv.group,
      },
      monitorId,
      videos: data.videos || [],
      total: data.videos ? data.videos.length : 0,
    });

  } catch (error: any) {
    console.error(`[API_VIDEOS_ERROR] Failed to fetch videos for ${params.id}:`, error);
    
    if (error.name === 'TimeoutError') {
      return NextResponse.json(
        { message: "Request timeout - NVR may be unavailable" },
        { status: 504 }
      );
    }

    return NextResponse.json(
      { 
        message: "Failed to fetch videos",
        error: error.message 
      },
      { status: 500 }
    );
  }
}