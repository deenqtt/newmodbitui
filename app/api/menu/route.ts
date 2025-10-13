import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "@/lib/auth";

const prisma = new PrismaClient();

// GET /api/menu - Get dynamic menu for current user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(request);

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get user role
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: {
        role: true
      },
    });

    if (!user || !user.role) {
      return NextResponse.json(
        { success: false, error: "User role not found" },
        { status: 403 }
      );
    }

    // Get menu items based on user role permissions
    const roleId = user.role.id;
    const isDeveloper = user.role.name.toLowerCase().includes('admin') ||
                       user.role.name.toLowerCase().includes('developer');

    // Get menu groups with items and permissions
    const menuGroups = await prisma.menuGroup.findMany({
      where: { isActive: true },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      include: {
        menuItems: {
          where: {
            isActive: true,
            OR: [
              // Show all non-developer items
              { isDeveloper: false },
              // Show developer items only for admin/developer roles
              { isDeveloper: true }
            ].filter(condition => {
              // Apply developer filter based on user role
              if (condition.isDeveloper === false) return true;
              if (condition.isDeveloper === true) return isDeveloper;
              return false;
            })
          },
          include: {
            permissions: {
              where: { roleId },
              select: {
                canView: true,
                canCreate: true,
                canUpdate: true,
                canDelete: true,
              },
            },
          },
          orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
        },
      },
    });

    // Filter menu items that user can view
    const filteredMenuGroups = menuGroups
      .map((group: any) => ({
        ...group,
        menuItems: group.menuItems.filter((item: any) =>
          item.permissions.length > 0 && item.permissions[0].canView
        ).map((item: any) => ({
          ...item,
          // Map permissions to a flat structure for easier frontend use
          permissions: item.permissions[0] || {
            canView: true,
            canCreate: false,
            canUpdate: false,
            canDelete: false,
          },
        })),
      }))
      .filter((group: any) => group.menuItems.length > 0); // Only include groups with accessible items

    return NextResponse.json({
      success: true,
      data: filteredMenuGroups,
      isDeveloper,
    });

  } catch (error) {
    console.error("Error fetching menu:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
