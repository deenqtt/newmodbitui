// File: app/api/notifications/route.ts
// Deskripsi: Menambahkan fungsi DELETE untuk menghapus notifikasi.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromCookie } from "@/lib/auth";

// FUNGSI GET: Mengambil notifikasi untuk user yang login (TETAP SAMA)
export async function GET(request: NextRequest) {
  const authPayload = await getAuthFromCookie(request);
  if (!authPayload?.userId) {
    return new NextResponse("Unauthenticated", { status: 401 });
  }

  try {
    const notifications = await prisma.notification.findMany({
      where: {
        userId: authPayload.userId,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 20,
    });

    return NextResponse.json(notifications);
  } catch (error) {
    console.error("[NOTIFICATIONS_GET]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

// FUNGSI POST: Menandai semua notifikasi sebagai "sudah dibaca" (TETAP SAMA)
export async function POST(request: NextRequest) {
  const authPayload = await getAuthFromCookie(request);
  if (!authPayload?.userId) {
    return new NextResponse("Unauthenticated", { status: 401 });
  }

  try {
    await prisma.notification.updateMany({
      where: {
        userId: authPayload.userId,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });

    return NextResponse.json({ message: "All notifications marked as read" });
  } catch (error) {
    console.error("[NOTIFICATIONS_POST]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

// --- FUNGSI BARU ---
// FUNGSI DELETE: Menghapus semua notifikasi untuk user yang login
export async function DELETE(request: NextRequest) {
  const authPayload = await getAuthFromCookie(request);
  if (!authPayload?.userId) {
    return new NextResponse("Unauthenticated", { status: 401 });
  }

  try {
    await prisma.notification.deleteMany({
      where: {
        userId: authPayload.userId,
      },
    });

    return NextResponse.json({ message: "All notifications deleted" });
  } catch (error) {
    console.error("[NOTIFICATIONS_DELETE]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
