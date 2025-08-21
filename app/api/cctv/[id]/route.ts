// File: app/api/cctv/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromCookie } from "@/lib/auth";
import { Role } from "@prisma/client";

// FUNGSI GET: Mengambil data CCTV berdasarkan ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await getAuthFromCookie(request);
  if (!auth) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const cctv = await prisma.cctv.findUnique({
      where: { id: params.id },
    });

    if (!cctv) {
      return NextResponse.json(
        { message: "CCTV camera not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(cctv);
  } catch (error) {
    console.error("[CCTV_GET_BY_ID]", error);
    return NextResponse.json(
      { message: "Failed to fetch CCTV camera" },
      { status: 500 }
    );
  }
}

// FUNGSI PUT: Memperbarui data CCTV
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await getAuthFromCookie(request);
  if (!auth || auth.role !== Role.ADMIN) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
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

    const existingCctv = await prisma.cctv.findUnique({
      where: { id: params.id },
    });

    if (!existingCctv) {
      return NextResponse.json(
        { message: "CCTV camera not found" },
        { status: 404 }
      );
    }

    const updatedCctv = await prisma.cctv.update({
      where: { id: params.id },
      data: {
        name,
        ipAddress,
        port: port ? Number(port) : undefined,
        channel,
        username,
        password,
        apiKey,
        group,
        resolution,
        framerate: framerate ? Number(framerate) : undefined,
        bitrate: bitrate ? Number(bitrate) : undefined,
        isActive: isActive !== undefined ? Boolean(isActive) : undefined,
      },
    });

    return NextResponse.json(updatedCctv);
  } catch (error) {
    console.error("[CCTV_PUT]", error);
    return NextResponse.json(
      { message: "Failed to update CCTV camera" },
      { status: 500 }
    );
  }
}

// FUNGSI DELETE: Menghapus data CCTV
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await getAuthFromCookie(request);
  if (!auth || auth.role !== Role.ADMIN) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    const existingCctv = await prisma.cctv.findUnique({
      where: { id: params.id },
    });

    if (!existingCctv) {
      return NextResponse.json(
        { message: "CCTV camera not found" },
        { status: 404 }
      );
    }

    await prisma.cctv.delete({
      where: { id: params.id },
    });

    return NextResponse.json(
      { message: "CCTV camera deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("[CCTV_DELETE]", error);
    return NextResponse.json(
      { message: "Failed to delete CCTV camera" },
      { status: 500 }
    );
  }
}
