// File: app/api/cctv/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromCookie } from "@/lib/auth";
import { Role } from "@prisma/client";

// FUNGSI GET: Mengambil semua data CCTV
export async function GET(request: NextRequest) {
  const auth = await getAuthFromCookie(request);
  if (!auth) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const cctvConfigs = await prisma.cctv.findMany({
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(cctvConfigs);
  } catch (error) {
    console.error("[CCTV_GET]", error);
    return NextResponse.json(
      { message: "Failed to fetch CCTV cameras" },
      { status: 500 }
    );
  }
}

// FUNGSI POST: Menambah konfigurasi CCTV baru
export async function POST(request: NextRequest) {
  const auth = await getAuthFromCookie(request);
  if (!auth || auth.role !== Role.ADMIN) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  try {
    const body = await request.json();
    const {
      name,
      ipAddress,
      port,
      channel,
      username,
      password,
      apiKey,
      group,
      resolution,
      framerate,
      bitrate,
      isActive,
    } = body;

    if (!name || !ipAddress || !port) {
      return NextResponse.json(
        { message: "Name, IP Address, and Port are required" },
        { status: 400 }
      );
    }

    const newCctv = await prisma.cctv.create({
      data: {
        name,
        ipAddress,
        port: Number(port),
        channel,
        username,
        password,
        apiKey,
        group,
        resolution,
        framerate: framerate ? Number(framerate) : undefined,
        bitrate: bitrate ? Number(bitrate) : undefined,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
      },
    });

    return NextResponse.json(newCctv, { status: 201 });
  } catch (error) {
    console.error("[CCTV_POST]", error);
    return NextResponse.json(
      { message: "Failed to create CCTV camera" },
      { status: 500 }
    );
  }
}
