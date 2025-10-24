// File: app/api/cctv/[id]/monitors/route.ts

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

    // Fetch monitor data from Shinobi NVR API
    const monitorUrl = `http://${cctv.ipAddress}:${cctv.port}/${cctv.apiKey}/monitor/${cctv.group}`;
    
    console.log(`[API_MONITORS] Fetching from: ${monitorUrl}`);

    const response = await fetch(monitorUrl, {
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
    
    // Ensure data is an array
    const monitors = Array.isArray(data) ? data : [];
    
    // Return monitors with camera info
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
      monitors,
      total: monitors.length,
    });

  } catch (error: any) {
    console.error(`[API_MONITORS_ERROR] Failed to fetch monitors for ${params.id}:`, error);
    
    if (error.name === 'TimeoutError') {
      return NextResponse.json(
        { message: "Request timeout - NVR may be unavailable" },
        { status: 504 }
      );
    }

    return NextResponse.json(
      { 
        message: "Failed to fetch monitors",
        error: error.message 
      },
      { status: 500 }
    );
  }
}