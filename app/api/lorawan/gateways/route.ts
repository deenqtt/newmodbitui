import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Helper function untuk convert BigInt ke string
const serializeBigInt = (obj: any): any => {
  return JSON.parse(
    JSON.stringify(obj, (key, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  );
};

export async function GET() {
  try {
    const gateways = await prisma.loraGateway.findMany({
      include: {
        stats: {
          orderBy: { timestamp: "desc" },
          take: 1,
        },
      },
      orderBy: { lastSeen: "desc" },
    });

    // Serialize BigInt values
    const serializedGateways = serializeBigInt(gateways);

    return NextResponse.json(serializedGateways);
  } catch (error) {
    console.error("Error fetching gateways:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
