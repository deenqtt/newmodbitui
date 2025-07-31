// File: app/api/zkteco/devices/[id]/users/route.ts
// Deskripsi: API untuk mengambil daftar pengguna dan mengirim perintah 'Create User'.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromCookie } from "@/lib/auth";
import { Role } from "@prisma/client";

/**
 * FUNGSI GET: Mengambil semua pengguna untuk perangkat ZKTeco tertentu.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await getAuthFromCookie(request);
  if (!auth) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const users = await prisma.zkTecoUser.findMany({
      where: {
        zkTecoDeviceId: params.id,
      },
      orderBy: {
        uid: "asc",
      },
    });
    return NextResponse.json(users);
  } catch (error) {
    console.error("[ZKTECO_USERS_GET]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
