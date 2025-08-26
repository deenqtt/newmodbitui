// route.ts (di dalam /gateways/[id]/route.ts)
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  try {
    // Hapus semua stats terlebih dahulu (karena foreign key)
    await prisma.gatewayStats.deleteMany({
      where: { gatewayId: id },
    });

    // Lalu hapus gateway
    await prisma.loraGateway.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Gateway deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting gateway:", error);
    return NextResponse.json(
      { error: "Failed to delete gateway" },
      { status: 500 }
    );
  }
}
