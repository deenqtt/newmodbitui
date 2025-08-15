// File: app/api/cctv/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromCookie } from "@/lib/auth";
import { Role } from "@prisma/client";

// FUNGSI GET: Mengambil semua data CCTV
export async function GET(request: NextRequest) {
  const cctvConfigs = await prisma.cctv.findMany({
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(cctvConfigs);
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
      resolution,
      framerate,
      bitrate,
    } = body;

    if (!name || !ipAddress || !port) {
      return new NextResponse("Name, IP Address, and Port are required", {
        status: 400,
      });
    }

    const newCctv = await prisma.cctv.create({
      data: {
        name,
        ipAddress,
        port: Number(port),
        channel,
        username,
        password,
        resolution,
        framerate: framerate ? Number(framerate) : undefined,
        bitrate: bitrate ? Number(bitrate) : undefined,
      },
    });

    return NextResponse.json(newCctv, { status: 201 });
  } catch (error) {
    console.error("[CCTV_POST]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
