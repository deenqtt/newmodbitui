import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getAuthFromCookie } from "@/lib/auth";

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

// POST /api/menu-presets/deactivate - Deactivate all presets for current user
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthFromCookie(request);
    if (!auth) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // Deactivate all presets for current user
    await prisma.menuPreset.updateMany({
      where: { createdBy: auth.userId },
      data: { isActive: false },
    });

    return NextResponse.json({
      success: true,
      message: "All presets deactivated",
    });
  } catch (error) {
    console.error("Error deactivating presets:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
