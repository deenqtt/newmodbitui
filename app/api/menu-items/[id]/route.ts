import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "@/lib/auth";

const prisma = new PrismaClient();

// GET /api/menu-items/[id] - Get single menu item
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(request);

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;

    const menuItem = await prisma.menuItem.findUnique({
      where: { id },
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
    });

    if (!menuItem) {
      return NextResponse.json(
        { success: false, error: "Menu item not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: menuItem,
    });

  } catch (error) {
    console.error("Error fetching menu item:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/menu-items/[id] - Update menu item
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(request);

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { menuGroupId, name, label, path, icon, component, order, isActive, isDeveloper } = body;

    // Check if menu item exists
    const existingMenuItem = await prisma.menuItem.findUnique({
      where: { id },
    });

    if (!existingMenuItem) {
      return NextResponse.json(
        { success: false, error: "Menu item not found" },
        { status: 404 }
      );
    }

    // Check if new name conflicts with existing menu item (if name is being changed)
    if (name && name !== existingMenuItem.name) {
      const nameConflict = await prisma.menuItem.findUnique({
        where: { name },
      });

      if (nameConflict) {
        return NextResponse.json(
          { success: false, error: "Menu item name already exists" },
          { status: 409 }
        );
      }
    }

    // Check if menu group exists (if menuGroupId is being changed)
    if (menuGroupId && menuGroupId !== existingMenuItem.menuGroupId) {
      const menuGroup = await prisma.menuGroup.findUnique({
        where: { id: menuGroupId },
      });

      if (!menuGroup) {
        return NextResponse.json(
          { success: false, error: "Menu group not found" },
          { status: 404 }
        );
      }
    }

    const menuItem = await prisma.menuItem.update({
      where: { id },
      data: {
        ...(menuGroupId && { menuGroupId }),
        ...(name && { name }),
        ...(label !== undefined && { label }),
        ...(path !== undefined && { path }),
        ...(icon !== undefined && { icon }),
        ...(component !== undefined && { component }),
        ...(order !== undefined && { order }),
        ...(isActive !== undefined && { isActive }),
        ...(isDeveloper !== undefined && { isDeveloper }),
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
    console.error("Error updating menu item:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/menu-items/[id] - Delete menu item
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(request);

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Check if menu item exists
    const existingMenuItem = await prisma.menuItem.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            permissions: true,
          },
        },
      },
    });

    if (!existingMenuItem) {
      return NextResponse.json(
        { success: false, error: "Menu item not found" },
        { status: 404 }
      );
    }

    // Delete related permissions first (cascading delete will handle this)
    await prisma.roleMenuPermission.deleteMany({
      where: { menuItemId: id },
    });

    // Delete the menu item
    await prisma.menuItem.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Menu item deleted successfully",
    });

  } catch (error) {
    console.error("Error deleting menu item:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
