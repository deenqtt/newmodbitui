import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getAuthFromCookie } from "@/lib/auth";

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

// GET /api/menu-presets - Get all presets for current user
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthFromCookie(request);
    if (!auth) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const presets = await prisma.menuPreset.findMany({
      where: { createdBy: auth.userId }, // Only show presets created by current user
      include: {
        selectedGroups: true,  // Include actual group data for preview modal
        selectedItems: true,   // Include actual item data for preview modal
        _count: {
          select: {
            selectedGroups: true,
            selectedItems: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: presets,
    });
  } catch (error) {
    console.error("Error fetching menu presets:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/menu-presets - Create new preset
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthFromCookie(request);
    if (!auth) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, icon, selectedGroupIds, selectedItemIds } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { success: false, error: "Name is required" },
        { status: 400 }
      );
    }

    // Validate selected groups and items exist
      if (selectedGroupIds?.length > 0) {
        const existingGroups = await prisma.menuGroup.findMany({
          where: { id: { in: selectedGroupIds } },
          select: { id: true },
        });
        const existingGroupIds = existingGroups.map((g: any) => g.id);
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
        const existingItemIds = existingItems.map((i: any) => i.id);
        const invalidItems = selectedItemIds.filter((id: string) => !existingItemIds.includes(id));
      if (invalidItems.length > 0) {
        return NextResponse.json(
          { success: false, error: `Invalid item IDs: ${invalidItems.join(', ')}` },
          { status: 400 }
        );
      }

      // Validate that all selected items belong to selected groups
      if (selectedGroupIds?.length > 0) {
        const selectedGroupItemIds = existingItems
          .filter((item: any) => selectedGroupIds.includes(item.menuGroupId))
          .map((item: any) => item.id);

        const invalidGroupItems = selectedItemIds.filter(
          (itemId: string) => !selectedGroupItemIds.includes(itemId) && !invalidItems.includes(itemId)
        );

        if (invalidGroupItems.length > 0) {
          return NextResponse.json(
            { success: false, error: `Selected items must belong to selected groups: ${invalidGroupItems.join(', ')}` },
            { status: 400 }
          );
        }
      }
    }

    // Create preset with selected groups and items
    const preset = await prisma.menuPreset.create({
      data: {
        name: name.trim(),
        description: description?.trim(),
        icon: icon || 'Menu',
        isActive: false, // New presets are inactive by default
        createdBy: auth.userId,
        selectedGroups: {
          create: selectedGroupIds?.map((groupId: string) => ({ groupId })) || [],
        },
        selectedItems: {
          create: selectedItemIds?.map((itemId: string) => ({ itemId })) || [],
        },
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

    return NextResponse.json({
      success: true,
      data: preset,
    }, { status: 201 });

  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: "Preset name already exists" },
        { status: 409 }
      );
    }

    console.error("Error creating menu preset:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
