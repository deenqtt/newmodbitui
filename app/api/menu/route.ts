import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getAuthFromCookie } from "@/lib/auth";

const prisma = new PrismaClient();

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// GET /api/menu - Get dynamic menu for current user
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthFromCookie(request);

    if (!auth) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get user role separately since the relation name has underscore
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

    // Get the role
    const role = await prisma.role.findUnique({
      where: { id: user.roleId },
      include: { permissions: true }
    });

    if (!role) {
      return NextResponse.json(
        { success: false, error: "User role not found" },
        { status: 403 }
      );
    }

    // Get menu items based on user role permissions
    const roleId = role.id;
    const roleName = role.name;
    const isAdmin = roleName === 'ADMIN';
    const isDeveloper = isAdmin || roleName.toLowerCase().includes('developer');

    // Get ALL menu groups first (both active and inactive)
    const allMenuGroups = await prisma.menuGroup.findMany({
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      include: {
        _count: {
          select: {
            items: true
          }
        },
        items: {
          where: {
            // Only show menu items for developers (or all if admin/developer)
            isDeveloper: isDeveloper ? undefined : false,
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

    // MENU GROUPS FILTERING:
    // Filter based on isActive status and developer permissions
    const menuGroups = allMenuGroups
      .filter((group: any) =>
        // Developer groups only for developers
        group.isDeveloper === false || (group.isDeveloper === true && isDeveloper)
      )
      .filter((group: any) =>
        // Active groups only shown to non-admin/non-developer users
        isAdmin || isDeveloper ? true : (group.isActive !== false) // isActive can be undefined (treated as active) or true
      );

    // Check if there's an active preset for this user
    const activePreset = await prisma.menuPreset.findFirst({
      where: {
        isActive: true,
        createdBy: auth.userId
      },
      include: {
        selectedGroups: true,
        selectedItems: true
      }
    });

    // BASIC MENU GROUPS FILTERING (when no preset active)
    let baseFilteredMenuGroups = menuGroups;

    // Apply different filtering logic if there's an active preset
    if (activePreset) {
      // For active preset: Include preset-selected items even if they would normally be filtered out
      const presetGroupIds = activePreset.selectedGroups.map((pg: any) => pg.groupId);
      const presetItemIds = activePreset.selectedItems.map((pi: any) => pi.itemId);

      // For preset mode, we completely bypass all normal filtering and only show selected items
      // Fetch all selected groups first
      const selectedGroups = await prisma.menuGroup.findMany({
        where: { id: { in: presetGroupIds } },
      });

      // Fetch ALL selected items by ID - this ignores all isActive, isDeveloper, and permission filters
      const selectedItems = await prisma.menuItem.findMany({
        where: { id: { in: presetItemIds } },
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
      });

      // Build menu groups structure with ALL selected items, bypassing any current restrictions
      baseFilteredMenuGroups = selectedGroups.map((group: any) => ({
        ...group,
        _count: { items: 0 }, // Will be overridden
        items: selectedItems.filter((item: any) => item.menuGroupId === group.id),
      }));

      console.log(`[API] Preset "${activePreset.name}" active - allowing ${presetGroupIds.length} groups, ${presetItemIds.length} items (ignoring isActive/isDeveloper restrictions)`);
    } else {
      console.log('[API] No active preset - using default menu visibility rules');
    }

    // FINAL MENU ITEMS FILTERING
    const finalMenuGroups = baseFilteredMenuGroups
      .map((group: any) => ({
        ...group,
        menuItems: group.items.filter((item: any) => {
          // For preset mode: all items in preset are allowed (permissions check override)
          if (activePreset) {
            return true; // Preset overrides all permission checks
          }

          // For normal mode: permission-based filtering
          if (item.permissions.length > 0 && item.permissions[0].canView) {
            return true;
          }
          // Special case: Admin users always get access to manage-menu even if no explicit permission
          if (isAdmin && item.name === 'system-menu-management') {
            return true;
          }
          return false;
        }).map((item: any) => ({
          ...item,
          permissions: item.permissions[0] || {
            canView: activePreset ? true : false, // Preset mode: everything is viewable
            canCreate: isAdmin,
            canUpdate: isAdmin,
            canDelete: isAdmin,
          },
        })),
      }))
      .filter((group: any) => group.menuItems.length > 0); // Remove empty groups

    return NextResponse.json({
      success: true,
      data: finalMenuGroups,
      isDeveloper,
      activePreset: activePreset ? {
        id: activePreset.id,
        name: activePreset.name,
        description: activePreset.description
      } : null,
    });

  } catch (error) {
    console.error("Error fetching menu:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
