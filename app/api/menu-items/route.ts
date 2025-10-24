import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "@/lib/auth";

const prisma = new PrismaClient();

// GET /api/menu-items - Get all menu items
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(request);

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const menuItems = await prisma.menuItem.findMany({
      include: {
        menuGroup: true,
        permissions: {
          include: {
            role: true,
          },
        },
        _count: {
          select: {
            permissions: true,
          },
        },
      },
      orderBy: [
        { menuGroup: { order: "asc" } },
        { order: "asc" }
      ],
    });

    return NextResponse.json({
      success: true,
      data: menuItems,
    });

  } catch (error) {
    console.error("Error fetching menu items:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/menu-items - Create menu item
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
    const { menuGroupId, name, label, path, icon, order, isDeveloper } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: "Menu item name is required" },
        { status: 400 }
      );
    }

    if (!menuGroupId) {
      return NextResponse.json(
        { success: false, error: "Menu group ID is required" },
        { status: 400 }
      );
    }

    // Check if menu item already exists
    const existingMenuItem = await prisma.menuItem.findUnique({
      where: { name },
    });

    if (existingMenuItem) {
      return NextResponse.json(
        { success: false, error: "Menu item already exists" },
        { status: 409 }
      );
    }

    // Check if menu group exists
    const menuGroup = await prisma.menuGroup.findUnique({
      where: { id: menuGroupId },
    });

    if (!menuGroup) {
      return NextResponse.json(
        { success: false, error: "Menu group not found" },
        { status: 404 }
      );
    }

    const menuItem = await prisma.menuItem.create({
      data: {
        menuGroupId,
        name,
        label,
        path,
        icon,
        order: order ?? 0,
        isDeveloper: isDeveloper ?? false,
      },
      include: {
        menuGroup: true,
        permissions: {
          include: {
            role: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: menuItem,
    });

  } catch (error) {
    console.error("Error creating menu item:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
