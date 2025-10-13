import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "@/lib/auth";

const prisma = new PrismaClient();

// GET /api/role-menu-permissions - Get all role menu permissions
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(request);

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const permissions = await prisma.roleMenuPermission.findMany({
      include: {
        role: true,
        menuItem: {
          include: {
            menuGroup: true,
          },
        },
      },
      orderBy: [
        { role: { name: "asc" } },
        { menuItem: { menuGroup: { order: "asc" } } },
        { menuItem: { order: "asc" } },
      ],
    });

    return NextResponse.json({
      success: true,
      data: permissions,
    });

  } catch (error) {
    console.error("Error fetching role menu permissions:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/role-menu-permissions - Create role menu permission
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(request);

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { roleId, menuItemId, canView, canCreate, canUpdate, canDelete } = body;

    if (!roleId) {
      return NextResponse.json(
        { success: false, error: "Role ID is required" },
        { status: 400 }
      );
    }

    if (!menuItemId) {
      return NextResponse.json(
        { success: false, error: "Menu item ID is required" },
        { status: 400 }
      );
    }

    // Check if role exists
    const role = await prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      return NextResponse.json(
        { success: false, error: "Role not found" },
        { status: 404 }
      );
    }

    // Check if menu item exists
    const menuItem = await prisma.menuItem.findUnique({
      where: { id: menuItemId },
    });

    if (!menuItem) {
      return NextResponse.json(
        { success: false, error: "Menu item not found" },
        { status: 404 }
      );
    }

    // Check if permission already exists
    const existingPermission = await prisma.roleMenuPermission.findUnique({
      where: {
        roleId_menuItemId: {
          roleId,
          menuItemId,
        },
      },
    });

    if (existingPermission) {
      return NextResponse.json(
        { success: false, error: "Permission already exists for this role and menu item" },
        { status: 409 }
      );
    }

    const permission = await prisma.roleMenuPermission.create({
      data: {
        roleId,
        menuItemId,
        canView: canView ?? true,
        canCreate: canCreate ?? false,
        canUpdate: canUpdate ?? false,
        canDelete: canDelete ?? false,
      },
      include: {
        role: true,
        menuItem: {
          include: {
            menuGroup: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: permission,
    });

  } catch (error) {
    console.error("Error creating role menu permission:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
