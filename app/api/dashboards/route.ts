// File: app/api/dashboards/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromCookie } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const auth = await getAuthFromCookie(request);
  if (!auth || !auth.userId) {
    // PERBAIKAN: Gunakan auth.userId
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const dashboards = await prisma.dashboardLayout.findMany({
      where: { userId: auth.userId }, // PERBAIKAN: Gunakan auth.userId
      orderBy: { name: "asc" },
    });
    return NextResponse.json(dashboards);
  } catch (error) {
    console.error("[DASHBOARDS_GET]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await getAuthFromCookie(request);
  if (!auth || !auth.userId) {
    // PERBAIKAN: Gunakan auth.userId
    return new NextResponse("Unauthorized or invalid auth session", {
      status: 401,
    });
  }

  try {
    const body = await request.json();
    const { name } = body;
    if (!name)
      return new NextResponse("Dashboard name is required", { status: 400 });

    const existingDashboardsCount = await prisma.dashboardLayout.count({
      where: { userId: auth.userId }, // PERBAIKAN: Gunakan auth.userId
    });

    const isFirstDashboard = existingDashboardsCount === 0;

    const newDashboard = await prisma.dashboardLayout.create({
      data: {
        name,
        layout: JSON.stringify([]),
        userId: auth.userId, // PERBAIKAN: Gunakan auth.userId
        inUse: isFirstDashboard,
      },
    });

    return NextResponse.json(newDashboard, { status: 201 });
  } catch (error) {
    console.error("[DASHBOARDS_POST]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
