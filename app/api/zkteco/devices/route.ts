// File: app/api/zkteco/devices/route.ts
// Deskripsi: API untuk mengambil daftar perangkat ZKTeco dan menambahkan perangkat baru.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromCookie } from "@/lib/auth";
import { Role } from "@prisma/client";

/**
 * FUNGSI GET: Mengambil semua konfigurasi perangkat ZKTeco.
 */
export async function GET(request: NextRequest) {
  const auth = await getAuthFromCookie(request);
  if (!auth) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const devices = await prisma.zkTecoDevice.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });
    return NextResponse.json(devices);
  } catch (error) {
    console.error("[ZKTECO_DEVICES_GET]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

/**
 * FUNGSI POST: Menambahkan konfigurasi perangkat ZKTeco baru.
 */
export async function POST(request: NextRequest) {
  const auth = await getAuthFromCookie(request);
  if (!auth) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const body = await request.json();
    // Tambahkan topicIdentifier ke dalam field yang diambil dari body
    const { name, ipAddress, port, topicIdentifier } = body;

    if (!name || !ipAddress || !port || !topicIdentifier) {
      return new NextResponse(
        "Missing required fields: name, ipAddress, port, topicIdentifier",
        { status: 400 }
      );
    }

    const newDevice = await prisma.zkTecoDevice.create({
      data: {
        name,
        ipAddress,
        port: parseInt(port, 10),
        topicIdentifier, // Simpan topicIdentifier ke database
      },
    });

    return NextResponse.json(newDevice, { status: 201 });
  } catch (error: any) {
    if (error.code === "P2002") {
      const target = (error.meta?.target as string[]) || [];
      if (target.includes("name")) {
        return new NextResponse("A device with this name already exists.", {
          status: 409,
        });
      }
      if (target.includes("topicIdentifier")) {
        return new NextResponse(
          "A device with this Topic Identifier already exists.",
          { status: 409 }
        );
      }
    }
    console.error("[ZKTECO_DEVICES_POST]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
