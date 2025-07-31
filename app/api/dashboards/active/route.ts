// File: app/api/dashboards/active/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromCookie } from "@/lib/auth";

export async function GET(request: Request) {
  const auth = await getAuthFromCookie(request);
  if (!auth || !auth.userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const activeDashboard = await prisma.dashboardLayout.findFirst({
      where: {
        userId: auth.userId,
        inUse: true, // Cari yang ditandai sebagai aktif
      },
    });

    if (!activeDashboard) {
      // Jika tidak ada yang aktif, cari dashboard pertama yang dibuat sebagai cadangan
      const fallbackDashboard = await prisma.dashboardLayout.findFirst({
        where: { userId: auth.userId },
        orderBy: { createdAt: "asc" },
      });

      if (!fallbackDashboard) {
        return new NextResponse("No dashboards found for this user", {
          status: 404,
        });
      }
      return NextResponse.json(fallbackDashboard);
    }

    return NextResponse.json(activeDashboard);
  } catch (error) {
    console.error("[ACTIVE_DASHBOARD_GET]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
