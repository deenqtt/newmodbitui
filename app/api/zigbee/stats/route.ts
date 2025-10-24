// File: app/api/zigbee/stats/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    // Get device statistics
    const totalDevices = await prisma.zigbeeDevice.count();

    const onlineDevices = await prisma.zigbeeDevice.count({
      where: { isOnline: true },
    });

    const offlineDevices = totalDevices - onlineDevices;

    // Get device types distribution
    const deviceTypeStats = await prisma.zigbeeDevice.groupBy({
      by: ["deviceType"],
      _count: {
        deviceType: true,
      },
      orderBy: {
        _count: {
          deviceType: "desc",
        },
      },
    });

    // Get recently seen devices (last 24 hours)
    const recentlySeenDevices = await prisma.zigbeeDevice.count({
      where: {
        lastSeen: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
        },
      },
    });

    // Get devices with issues (offline for more than 1 hour)
    const devicesWithIssues = await prisma.zigbeeDevice.count({
      where: {
        OR: [
          { isOnline: false },
          {
            lastSeen: {
              lt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
            },
          },
        ],
      },
    });

    const stats = {
      overview: {
        totalDevices,
        onlineDevices,
        offlineDevices,
        recentlySeenDevices,
        devicesWithIssues,
      },
      deviceTypes: deviceTypeStats.map((stat) => ({
        type: stat.deviceType,
        count: stat._count.deviceType,
      })),
      healthPercentage:
        totalDevices > 0
          ? Math.round((onlineDevices / totalDevices) * 100)
          : 100,
    };

    return NextResponse.json(stats, { status: 200 });
  } catch (error) {
    console.error("Error fetching Zigbee stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch Zigbee statistics" },
      { status: 500 }
    );
  }
}
