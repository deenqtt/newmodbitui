import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getAuthFromCookie } from "@/lib/auth";

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

// POST /api/menu-presets/[id]/activate - Activate specified preset
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await getAuthFromCookie(request);
    if (!auth) {
      console.log('🚫 Activate: No auth found');
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    console.log(`🔄 Activate: Starting for preset ${params.id}, user ${auth.userId}`);

    // Check if preset belongs to current user
    const preset = await prisma.menuPreset.findFirst({
      where: {
        id: params.id,
        createdBy: auth.userId,
      },
    });

    if (!preset) {
      console.log('🚫 Activate: Preset not found or not owned by user');
      return NextResponse.json(
        { success: false, error: "Preset not found" },
        { status: 404 }
      );
    }

    console.log(`📊 Current preset status before update:`, preset.isActive);

    // Deactivate all presets first
    const deactivateResult = await prisma.menuPreset.updateMany({
      where: { createdBy: auth.userId },
      data: { isActive: false },
    });
    console.log(`📊 Deactivated ${deactivateResult.count} presets`);

    // Activate the selected preset
    const updatedPreset = await prisma.menuPreset.update({
      where: { id: params.id },
      data: { isActive: true },
      include: {
        selectedGroups: true,
        selectedItems: true,
      },
    });

    console.log(`✅ Successfully activated preset "${updatedPreset.name}" for user ${auth.userId}`);
    console.log(`📊 Final preset status:`, updatedPreset.isActive);

    return NextResponse.json({
      success: true,
      data: updatedPreset,
      message: `Preset "${preset.name}" activated successfully`,
    });
  } catch (error) {
    console.error("❌ Error activating menu preset:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
