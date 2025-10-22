import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getAuthFromCookie } from "@/lib/auth";

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

// GET /api/menu/structure - Get menu structure for preset management (admin only)
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthFromCookie(request);
    if (!auth) {
      console.log('[API] No authentication found - user needs to login');
      return NextResponse.json({ success: false, error: "Unauthorized - Please login first" }, { status: 401 });
    }

    // Check if user is admin/developer - only admins can create presets
    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { roleId: true }
    });

    if (!user || !user.roleId) {
      return NextResponse.json(
        { success: false, error: "User not found or has no role" },
        { status: 403 }
      );
    }

    // Get role name
    const role = await prisma.role.findUnique({
      where: { id: user.roleId },
      select: { name: true }
    });

    if (!role) {
      return NextResponse.json(
        { success: false, error: "User role not found" },
        { status: 403 }
      );
    }

    const roleName = role.name;
    const isAdmin = roleName === 'ADMIN';
    const isDeveloper = isAdmin || roleName.toLowerCase().includes('developer');

    if (!isAdmin && !isDeveloper) {
      return NextResponse.json(
        { success: false, error: "Access denied. Admin/Developer role required." },
        { status: 403 }
      );
    }

    // Optimized query - only fetch necessary fields for preset creation
    const menuGroups = await prisma.menuGroup.findMany({
      select: {
        id: true,
        name: true,
        label: true,
        isDeveloper: true,
        isActive: true,
        order: true,
        items: {
          where: {
            // For preset creation, show ALL items regardless of isDeveloper flag
            // so admins/developers can choose to include any items in presets
          },
          select: {
            id: true,
            name: true,
            label: true,
            path: true,
            icon: true,
            order: true,
          },
          orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
        },
      },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });

    // Simple filter for developers - filter in memory for better performance
    const filteredGroups = menuGroups.filter((group: any) =>
      group.isDeveloper === false || (group.isDeveloper === true && isDeveloper)
    );

    // Transform to simpler structure for faster frontend processing
    const structure = filteredGroups.map((group: any) => ({
      id: group.id,
      name: group.name,
      label: group.label,
      items: group.items.map((item: any) => ({
        id: item.id,
        name: item.name,
        label: item.label,
        path: item.path,
        icon: item.icon,
      }))
    }));

    console.log(`[API] Menu structure served successfully for user ${auth.userId}, groups: ${structure.length}`);
    return NextResponse.json({
      success: true,
      data: structure,
      timestamp: Date.now(), // For cache busting
    });

  } catch (error) {
    console.error("[API] Error fetching menu structure:", error);
    const errorMessage = error instanceof Error ? error.message : `${error}`;
    return NextResponse.json(
      { success: false, error: `Server error: ${errorMessage}` },
      { status: 500 }
    );
  }
}
