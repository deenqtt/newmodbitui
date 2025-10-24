import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getAuthFromCookie } from "@/lib/auth";

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

// GET /api/menu-presets/[id] - Get specific preset
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await getAuthFromCookie(request);
    if (!auth) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const preset = await prisma.menuPreset.findFirst({
      where: {
        id: params.id,
        createdBy: auth.userId, // Only allow access to own presets
      },
      include: {
        selectedGroups: true,
        selectedItems: true,
        _count: {
          select: {
            selectedGroups: true,
            selectedItems: true,
          },
        },
      },
    });

    if (!preset) {
      return NextResponse.json(
        { success: false, error: "Preset not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: preset,
    });
  } catch (error) {
    console.error("Error fetching menu preset:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/menu-presets/[id] - Update preset
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await getAuthFromCookie(request);
    if (!auth) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, icon, selectedGroupIds, selectedItemIds } = body;

    // Find existing preset
    const existingPreset = await prisma.menuPreset.findFirst({
      where: {
        id: params.id,
        createdBy: auth.userId,
      },
    });

    if (!existingPreset) {
      return NextResponse.json(
        { success: false, error: "Preset not found" },
        { status: 404 }
      );
    }

    // Validate name uniqueness (except current preset)
    if (name && name !== existingPreset.name) {
      const duplicate = await prisma.menuPreset.findFirst({
        where: {
          name: name.trim(),
          createdBy: auth.userId,
          id: { not: params.id },
        },
      });
      if (duplicate) {
        return NextResponse.json(
          { success: false, error: "Preset name already exists" },
          { status: 409 }
        );
      }
    }

    // Validate selected groups and items exist
    if (selectedGroupIds?.length > 0) {
      const existingGroups = await prisma.menuGroup.findMany({
        where: { id: { in: selectedGroupIds } },
        select: { id: true },
      });
      const existingGroupIds = existingGroups.map(g => g.id);
      const invalidGroups = selectedGroupIds.filter((id: string) => !existingGroupIds.includes(id));
      if (invalidGroups.length > 0) {
        return NextResponse.json(
          { success: false, error: `Invalid group IDs: ${invalidGroups.join(', ')}` },
          { status: 400 }
        );
      }
    }

    if (selectedItemIds?.length > 0) {
      const existingItems = await prisma.menuItem.findMany({
        where: { id: { in: selectedItemIds } },
        select: { id: true, menuGroupId: true },
      });
      const existingItemIds = existingItems.map(i => i.id);
      const invalidItems = selectedItemIds.filter((id: string) => !existingItemIds.includes(id));
      if (invalidItems.length > 0) {
        return NextResponse.json(
          { success: false, error: `Invalid item IDs: ${invalidItems.join(', ')}` },
          { status: 400 }
        );
      }
    }

    // Update preset with transaction to handle relations
    const updatedPreset = await prisma.$transaction(async (tx) => {
      // Update main preset data
      const preset = await tx.menuPreset.update({
        where: { id: params.id },
        data: {
          name: name?.trim() || existingPreset.name,
          description: description?.trim(),
          icon: icon || existingPreset.icon,
        },
      });

      // Delete existing selected groups and items
      await tx.menuPresetGroup.deleteMany({
        where: { presetId: params.id },
      });
      await tx.menuPresetItem.deleteMany({
        where: { presetId: params.id },
      });

      // Create new selected groups and items
      if (selectedGroupIds?.length > 0) {
        await tx.menuPresetGroup.createMany({
          data: selectedGroupIds.map((groupId: string) => ({
            presetId: params.id,
            groupId,
          })),
        });
      }

      if (selectedItemIds?.length > 0) {
        await tx.menuPresetItem.createMany({
          data: selectedItemIds.map((itemId: string) => ({
            presetId: params.id,
            itemId,
          })),
        });
      }

      // Return simple updated preset
      return await tx.menuPreset.findUnique({
        where: { id: params.id },
        include: {
          selectedGroups: true,
          selectedItems: true,
          _count: {
            select: {
              selectedGroups: true,
              selectedItems: true,
            },
          },
        },
      });
    });

    return NextResponse.json({
      success: true,
      data: updatedPreset,
    });
  } catch (error) {
    console.error("Error updating menu preset:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/menu-presets/[id] - Delete preset
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await getAuthFromCookie(request);
    if (!auth) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // Find preset first to check ownership
    const preset = await prisma.menuPreset.findFirst({
      where: {
        id: params.id,
        createdBy: auth.userId,
      },
    });

    if (!preset) {
      return NextResponse.json(
        { success: false, error: "Preset not found" },
        { status: 404 }
      );
    }

    // Deactivate preset if it's active before deleting
    if (preset.isActive) {
      await prisma.menuPreset.updateMany({
        data: { isActive: false },
      });
    }

    // Delete preset (relations will be deleted automatically due to CASCADE)
    await prisma.menuPreset.delete({
      where: { id: params.id },
    });

    return NextResponse.json({
      success: true,
      message: "Preset deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting menu preset:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
