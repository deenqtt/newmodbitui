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
    // First try to find active dashboard for the current user
    const userActiveDashboard = await prisma.dashboardLayout.findFirst({
      where: {
        userId: auth.userId,
        inUse: true,
      },
    });

    if (userActiveDashboard) {
      return NextResponse.json(userActiveDashboard);
    }

    // If no active dashboard for user, try to find any dashboard for this user as fallback
    const userFallbackDashboard = await prisma.dashboardLayout.findFirst({
      where: { userId: auth.userId },
      orderBy: { createdAt: "asc" },
    });

    if (userFallbackDashboard) {
      return NextResponse.json(userFallbackDashboard);
    }

    // If no dashboard for this user, fallback to admin's active dashboard
    // Get admin user first
    const adminUser = await prisma.user.findFirst({
      where: {
        role_data: {
          name: 'ADMIN'
        }
      }
    });

    if (adminUser) {
      const admin_activeDashboard = await prisma.dashboardLayout.findFirst({
        where: {
          userId: adminUser.id,
          inUse: true,
        },
      });

      if (admin_activeDashboard) {
        return NextResponse.json(admin_activeDashboard);
      }

      // If no active admin dashboard, get any admin dashboard
      const admin_fallbackDashboard = await prisma.dashboardLayout.findFirst({
        where: { userId: adminUser.id },
        orderBy: { createdAt: "asc" },
      });

      if (admin_fallbackDashboard) {
        return NextResponse.json(admin_fallbackDashboard);
      }
    }

    // No dashboards found anywhere
    return new NextResponse("No dashboards found", {
      status: 404,
    });
  } catch (error) {
    console.error("[ACTIVE_DASHBOARD_GET]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
