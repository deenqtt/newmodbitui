import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const serializeBigInt = (obj: any): any => {
  return JSON.parse(
    JSON.stringify(obj, (key, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  );
};

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { searchParams } = new URL(request.url);
    const hours = parseInt(searchParams.get("hours") || "24");

    const stats = await prisma.gatewayStats.findMany({
      where: {
        gatewayId: id,
        timestamp: {
          gte: new Date(Date.now() - hours * 60 * 60 * 1000),
        },
      },
      orderBy: { timestamp: "desc" },
    });

    const serializedStats = serializeBigInt(stats);

    return NextResponse.json(serializedStats);
  } catch (error) {
    console.error("Error fetching gateway stats:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
